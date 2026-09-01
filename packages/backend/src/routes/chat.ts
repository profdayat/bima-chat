import { Elysia, t } from 'elysia';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, desc, inArray, and, lt, ne, or, like } from 'drizzle-orm';
import { channels as activeChannels, publishToChannel } from '../services/channel-manager';
import { authMiddleware } from '../middleware/auth';
import { getCacheJson, setCacheJson, delCacheKeys, invalidateCachePattern } from '../services/cache';
import * as fs from 'fs';
import * as path from 'path';

// In-memory active usernames per channel
const channelUsers: Record<string, Map<string, number>> = {};

async function resolveChannel(idOrName: string, currentUsernameOrId?: string) {
  const cacheKey = `cache:chan_resolve:${idOrName}:${currentUsernameOrId || 'anon'}`;
  const cached = await getCacheJson<any>(cacheKey);
  if (cached) return cached;

  let resolvedResult: any = null;

  // 1. Direct Message resolution by @username or u:username
  if (idOrName.startsWith('@') || idOrName.startsWith('u:')) {
    const targetUsername = idOrName.replace(/^[@u:]+/, '').trim();
    const isTargetUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUsername);

    const targetUser = await db.query.users.findFirst({
      where: isTargetUUID
        ? or(eq(schema.users.id, targetUsername), eq(schema.users.username, targetUsername))
        : eq(schema.users.username, targetUsername)
    });

    if (targetUser) {
      let currentUser: any = null;
      if (currentUsernameOrId) {
        const isCurrentUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUsernameOrId);
        currentUser = await db.query.users.findFirst({
          where: isCurrentUUID
            ? or(eq(schema.users.id, currentUsernameOrId), eq(schema.users.username, currentUsernameOrId))
            : eq(schema.users.username, currentUsernameOrId)
        });
      }

      if (!currentUser) {
        currentUser = await db.query.users.findFirst({
          where: ne(schema.users.id, targetUser.id)
        });
      }

      const uidA = currentUser?.id || 'guest';
      const uidB = targetUser.id;
      const sorted = [uidA, uidB].sort();
      const dmName = `dm:${sorted[0]}_${sorted[1]}`;

      let dmChan = await db.query.channels.findFirst({
        where: eq(schema.channels.name, dmName)
      });

      if (!dmChan) {
        const created = await db.insert(schema.channels).values({
          name: dmName,
          type: 'dm',
          description: `Pesan Pribadi dengan ${targetUser.displayName || targetUser.username}`
        }).returning();
        dmChan = created[0];
      }
      resolvedResult = {
        ...dmChan,
        targetUser
      };
      await setCacheJson(cacheKey, resolvedResult, 1800); // 30 min cache
      return resolvedResult;
    }
  }

  // 2. Lookup by UUID if valid UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
  if (isUUID) {
    const found = await db.query.channels.findFirst({
      where: eq(schema.channels.id, idOrName)
    });
    if (found) {
      await setCacheJson(cacheKey, found, 1800);
      return found;
    }
  }

  // 3. Lookup by exact name or cleaned name
  const cleanName = idOrName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const foundByName = await db.query.channels.findFirst({
    where: or(eq(schema.channels.name, idOrName), eq(schema.channels.name, cleanName))
  });
  if (foundByName) {
    await setCacheJson(cacheKey, foundByName, 1800);
    return foundByName;
  }

  // 4. Auto-create only for regular public channels (never for prefixes starting with - or @)
  const safeName = cleanName.replace(/^-+/, '');
  if (!safeName) {
    const defaultChan = await db.query.channels.findFirst({ where: eq(schema.channels.name, 'general') });
    if (defaultChan) {
      await setCacheJson(cacheKey, defaultChan, 1800);
      return defaultChan;
    }
  }

  const existingSafe = await db.query.channels.findFirst({
    where: eq(schema.channels.name, safeName)
  });
  if (existingSafe) {
    await setCacheJson(cacheKey, existingSafe, 1800);
    return existingSafe;
  }

  const created = (await db.insert(schema.channels).values({
    name: safeName,
    type: 'public',
    description: `Channel komunikasi ${safeName}`
  }).returning())[0];
  await setCacheJson(cacheKey, created, 1800);
  return created;
}

export const chatRouter = new Elysia({ prefix: '/chat', detail: { tags: ['Chat'] } })
  .use(authMiddleware)
  
  // Standard SSE endpoint using ReadableStream
  .get('/sse/:channelId', async ({ params: { channelId }, query, request }) => {
    const origin = request.headers.get('origin') || '*';
    const clientUsername = (query.username as string) || 'Staff RSUD';
    const channel = await resolveChannel(channelId, clientUsername);
    const resolvedId = channel.id;

    let heartbeat: any;
    let onMessage: (data: any) => void;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Track presence
        if (!channelUsers[resolvedId]) {
          channelUsers[resolvedId] = new Map();
        }
        const currentCount = channelUsers[resolvedId].get(clientUsername) || 0;
        channelUsers[resolvedId].set(clientUsername, currentCount + 1);

        const onlineUsers = Array.from(channelUsers[resolvedId].keys());

        // Initial connected event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'connected', 
          channelId: resolvedId, 
          channelName: channel.name,
          onlineCount: onlineUsers.length,
          onlineUsers
        })}\n\n`));

        // Broadcast presence update
        publishToChannel(resolvedId, {
          type: 'presence',
          channelId: resolvedId,
          onlineCount: onlineUsers.length,
          onlineUsers
        });

        if (!activeChannels[resolvedId]) {
          activeChannels[resolvedId] = new Set();
        }

        onMessage = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Stream closed
          }
        };

        activeChannels[resolvedId].add(onMessage);

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);
      },
      cancel() {
        if (onMessage) {
          activeChannels[resolvedId]?.delete(onMessage);
        }
        clearInterval(heartbeat);

        // Update presence on disconnect
        if (channelUsers[resolvedId]) {
          const currentCount = channelUsers[resolvedId].get(clientUsername) || 1;
          if (currentCount <= 1) {
            channelUsers[resolvedId].delete(clientUsername);
          } else {
            channelUsers[resolvedId].set(clientUsername, currentCount - 1);
          }

          const remainingUsers = Array.from(channelUsers[resolvedId].keys());
          publishToChannel(resolvedId, {
            type: 'presence',
            channelId: resolvedId,
            onlineCount: remainingUsers.length,
            onlineUsers: remainingUsers
          });
        }

        if (activeChannels[resolvedId]?.size === 0) {
          delete activeChannels[resolvedId];
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  })

  // Send message to channel with reply, attachments
  .post('/send/:channelId', async ({ params: { channelId }, body, user }) => {
    const senderName = user?.username || body.senderName || 'Staff RSUD';
    const channel = await resolveChannel(channelId, user?.id || senderName);
    const resolvedId = channel.id;

    const senderId = user?.id || null;

    // Determine initial status
    const activeListeners = (activeChannels[resolvedId]?.size || 0) > 1;
    const initialStatus = activeListeners ? 'delivered' : 'sent';

    const attachmentsJson = body.attachments ? JSON.stringify(body.attachments) : null;

    // Save message to DB
    const result = await db.insert(schema.messages).values({
      channelId: resolvedId,
      senderId,
      senderName,
      content: body.message,
      status: initialStatus,
      replyToId: body.replyToId || null,
      attachments: attachmentsJson
    }).returning();
    
    const savedMessage = result[0];

    const messagePayload = {
      type: 'message',
      channelId: resolvedId,
      id: savedMessage.id,
      text: body.message,
      status: initialStatus,
      replyToId: savedMessage.replyToId,
      attachments: body.attachments || null,
      reactions: [],
      isPinned: false,
      sender: {
        id: senderId || 'guest',
        username: senderName
      },
      timestamp: savedMessage.createdAt,
    };

    // Publish to Redis & SSE
    publishToChannel(resolvedId, messagePayload);
    if (channelId !== resolvedId) {
      publishToChannel(channelId, messagePayload);
    }

    // Invalidate Redis caches for history and DMs
    await delCacheKeys(`cache:history:${resolvedId}:latest`, `cache:history:${channelId}:latest`);
    await invalidateCachePattern('cache:dms:*');

    return { status: 'sent', messageId: savedMessage.id, message: messagePayload };
  }, {
    body: t.Object({
      message: t.String(),
      senderName: t.Optional(t.String()),
      replyToId: t.Optional(t.String()),
      attachments: t.Optional(t.Array(t.Object({
        url: t.String(),
        name: t.String(),
        type: t.String(),
        size: t.Number()
      })))
    }),
  })

  // File Upload Endpoint
  .post('/upload', async ({ body, error }) => {
    try {
      const file = body.file;
      const extension = file.name.split('.').pop() || 'bin';
      const filename = `file_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;
      
      const rootDir = process.env.MONOREPO_ROOT || '/app';
      const uploadDir = path.join(rootDir, 'packages/frontend/static/uploads');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(bytes));

      return {
        url: `/api/uploads/${filename}`,
        name: file.name,
        type: file.type,
        size: file.size
      };
    } catch (e: any) {
      return error(500, e.message || 'Gagal mengupload file');
    }
  }, {
    body: t.Object({
      file: t.File()
    })
  })

  // Reaction toggler
  .post('/react/:channelId', async ({ params: { channelId }, body, error }) => {
    const channel = await resolveChannel(channelId);
    const resolvedId = channel.id;

    // Find the message
    const msg = (await db.select().from(schema.messages).where(eq(schema.messages.id, body.messageId)))[0];
    if (!msg) {
      return error(404, 'Pesan tidak ditemukan');
    }

    let reactionsList: { emoji: string; username: string }[] = [];
    try {
      if (msg.reactions) {
        reactionsList = JSON.parse(msg.reactions);
      }
    } catch {
      reactionsList = [];
    }

    // Toggle reaction
    const index = reactionsList.findIndex(r => r.emoji === body.emoji && r.username === body.username);
    if (index > -1) {
      reactionsList.splice(index, 1);
    } else {
      reactionsList.push({ emoji: body.emoji, username: body.username });
    }

    const updatedReactions = JSON.stringify(reactionsList);
    await db.update(schema.messages)
      .set({ reactions: updatedReactions })
      .where(eq(schema.messages.id, body.messageId));

    publishToChannel(resolvedId, {
      type: 'reaction',
      channelId: resolvedId,
      messageId: body.messageId,
      reactions: reactionsList
    });

    // Invalidate history cache in Redis
    await delCacheKeys(`cache:history:${resolvedId}:latest`, `cache:history:${channelId}:latest`);

    return { success: true, reactions: reactionsList };
  }, {
    body: t.Object({
      messageId: t.String(),
      emoji: t.String(),
      username: t.String()
    })
  })

  // Pin/unpin message
  .post('/pin/:channelId', async ({ params: { channelId }, body, error }) => {
    const channel = await resolveChannel(channelId);
    const resolvedId = channel.id;

    const targetVal = body.isPinned ? 'true' : 'false';

    const updated = await db.update(schema.messages)
      .set({ isPinned: targetVal })
      .where(eq(schema.messages.id, body.messageId))
      .returning();

    if (updated.length === 0) {
      return error(404, 'Pesan tidak ditemukan');
    }

    publishToChannel(resolvedId, {
      type: 'pin',
      channelId: resolvedId,
      messageId: body.messageId,
      isPinned: body.isPinned
    });

    // Invalidate history cache in Redis
    await delCacheKeys(`cache:history:${resolvedId}:latest`, `cache:history:${channelId}:latest`);

    return { success: true, isPinned: body.isPinned };
  }, {
    body: t.Object({
      messageId: t.String(),
      isPinned: t.Boolean()
    })
  })

  // Delete message
  .delete('/:channelId/:messageId', async ({ params: { channelId, messageId }, error }) => {
    const channel = await resolveChannel(channelId);
    const resolvedId = channel.id;

    const deleted = await db.delete(schema.messages)
      .where(eq(schema.messages.id, messageId))
      .returning();

    if (deleted.length === 0) {
      return error(404, 'Pesan tidak ditemukan');
    }

    publishToChannel(resolvedId, {
      type: 'delete',
      channelId: resolvedId,
      messageId: messageId
    });

    // Invalidate history & DMs cache in Redis
    await delCacheKeys(`cache:history:${resolvedId}:latest`, `cache:history:${channelId}:latest`);
    await invalidateCachePattern('cache:dms:*');

    return { success: true, messageId };
  })

  // Typing indicator
  .post('/typing/:channelId', async ({ params: { channelId }, body, user }) => {
    const typer = body.username || user?.username || 'Staff';
    const channel = await resolveChannel(channelId, typer);
    const resolvedId = channel.id;

    const payload = {
      type: 'typing',
      channelId: resolvedId,
      aliasChannelId: channelId,
      username: typer,
      isTyping: body.isTyping
    };

    publishToChannel(resolvedId, payload);
    if (channelId !== resolvedId) {
      publishToChannel(channelId, payload);
    }

    return { status: 'ok' };
  }, {
    body: t.Object({
      username: t.String(),
      isTyping: t.Boolean()
    })
  })

  // Read receipt (Double Blue Checkmark)
  .post('/read/:channelId', async ({ params: { channelId }, body, user }) => {
    const reader = body.readerUsername || user?.username || 'Staff';
    const channel = await resolveChannel(channelId, reader);
    const resolvedId = channel.id;

    if (body.messageIds && body.messageIds.length > 0) {
      await db.update(schema.messages)
        .set({ status: 'read' })
        .where(inArray(schema.messages.id, body.messageIds));

      const payload = {
        type: 'read_receipt',
        channelId: resolvedId,
        aliasChannelId: channelId,
        messageIds: body.messageIds,
        readerUsername: reader,
        readAt: new Date().toISOString()
      };

      publishToChannel(resolvedId, payload);
      if (channelId !== resolvedId) {
        publishToChannel(channelId, payload);
      }
    }

    return { status: 'ok' };
  }, {
    body: t.Object({
      messageIds: t.Array(t.String()),
      readerUsername: t.String()
    })
  })

  // List all registered staff for direct messaging
  .get('/users', async () => {
    const allUsers = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      role: schema.users.role,
      isActive: schema.users.isActive
    }).from(schema.users);
    return allUsers;
  })

  // Start or retrieve a Direct Message (1-on-1) channel
  .post('/dm', async ({ body, user, error }) => {
    try {
      const currentUserId = user?.id || body.currentUserId;
      const targetUserId = body.targetUserId;

      if (!currentUserId || !targetUserId) {
        return error(400, 'User IDs required for direct message');
      }

      if (currentUserId === targetUserId) {
        return error(400, 'Tidak dapat membuat chat privat dengan diri sendiri');
      }

      // Consistent deterministic DM identifier: dm:minId_maxId
      const sorted = [currentUserId, targetUserId].sort();
      const dmName = `dm:${sorted[0]}_${sorted[1]}`;

      let dmChan = await db.query.channels.findFirst({
        where: eq(schema.channels.name, dmName)
      });

      if (!dmChan) {
        const created = await db.insert(schema.channels).values({
          name: dmName,
          type: 'dm',
          description: 'Pesan Langsung antar staf RSUD'
        }).returning();
        dmChan = created[0];
      }

      // Fetch target user profile
      const targetUser = await db.query.users.findFirst({
        where: eq(schema.users.id, targetUserId),
        columns: { id: true, username: true, displayName: true, avatarUrl: true, role: true }
      });

      return {
        ...dmChan,
        targetUser
      };
    } catch (e: any) {
      return error(500, e.message || 'Gagal memulai DM');
    }
  }, {
    body: t.Object({
      targetUserId: t.String(),
      currentUserId: t.Optional(t.String())
    })
  })

  // Get single channel metadata (works for public channels and DMs)
  .get('/channel/:channelId', async ({ params, query, error }) => {
    const id = params.channelId;
    const currentUserId = (query as any)?.userId || (query as any)?.username;

    try {
      const chan = await resolveChannel(id, currentUserId);
      if (!chan) {
        return error(404, 'Channel tidak ditemukan');
      }

      let targetUser: any = (chan as any).targetUser || null;
      if (!targetUser && (chan.type === 'dm' || chan.name.startsWith('dm:'))) {
        const parts = chan.name.replace('dm:', '').split('_');
        const targetId = currentUserId ? parts.find(p => p !== currentUserId) : parts[0];
        if (targetId) {
          const isTargetUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
          targetUser = await db.query.users.findFirst({
            where: isTargetUUID
              ? or(eq(schema.users.id, targetId), eq(schema.users.username, targetId))
              : eq(schema.users.username, targetId),
            columns: { id: true, username: true, displayName: true, avatarUrl: true, role: true }
          });
        }
      }

      return {
        ...chan,
        targetUser
      };
    } catch (e: any) {
      return error(500, e.message || 'Gagal memuat info channel');
    }
  })

  // List all DMs for a user (Cached in Redis)
  .get('/my-dms', async ({ query }) => {
    const userId = (query as any)?.userId;
    if (!userId) return [];

    const cacheKey = `cache:dms:${userId}`;
    const cached = await getCacheJson<any[]>(cacheKey);
    if (cached) return cached;

    const allDms = await db.query.channels.findMany({
      where: and(
        eq(schema.channels.type, 'dm'),
        like(schema.channels.name, `%${userId}%`)
      )
    });

    const result = [];
    for (const dm of allDms) {
      const parts = dm.name.replace('dm:', '').split('_');
      const targetId = parts.find(p => p !== userId) || parts[0];

      const isTargetUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      const targetUser = await db.query.users.findFirst({
        where: isTargetUUID
          ? or(eq(schema.users.id, targetId), eq(schema.users.username, targetId))
          : eq(schema.users.username, targetId),
        columns: { id: true, username: true, displayName: true, avatarUrl: true, role: true }
      });

      // Get last message in this DM
      const lastMsg = await db.query.messages.findFirst({
        where: eq(schema.messages.channelId, dm.id),
        orderBy: (m, { desc }) => [desc(m.createdAt)]
      });

      result.push({
        ...dm,
        targetUser,
        lastMessage: lastMsg ? {
          text: lastMsg.content,
          timestamp: lastMsg.createdAt,
          senderName: lastMsg.senderName
        } : null
      });
    }

    await setCacheJson(cacheKey, result, 120); // 2 mins cache
    return result;
  })

  // List public channels (Cached in Redis)
  .get('/channels', async () => {
    const cacheKey = 'cache:channels:public';
    const cached = await getCacheJson<any[]>(cacheKey);
    if (cached) return cached;

    let allChannels = await db.query.channels.findMany({
      where: ne(schema.channels.type, 'dm')
    });
    
    if (allChannels.length === 0) {
      const defaultChannels = [
        { name: 'general' },
        { name: 'igd-darurat' },
        { name: 'rawat-inap' },
        { name: 'farmasi' },
        { name: 'radiologi-lab' }
      ];
      allChannels = await db.insert(schema.channels).values(defaultChannels).returning();
    }
    
    await setCacheJson(cacheKey, allChannels, 600); // 10 mins cache
    return allChannels;
  })
  
  // Create channel
  .post('/channels', async ({ body, error }) => {
    try {
      const cleanName = body.name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const result = await db.insert(schema.channels).values({
        name: cleanName
      }).returning();

      // Invalidate public channels cache
      await delCacheKeys('cache:channels:public');
      return result[0];
    } catch (e) {
      return error(400, 'Failed to create channel');
    }
  }, {
    body: t.Object({
      name: t.String()
    })
  })

  // Message history with Cursor-based pagination & Redis Caching
  .get('/history/:channelId', async ({ params: { channelId }, query }) => {
    const userOrName = (query as any)?.userId || (query as any)?.username;
    const channel = await resolveChannel(channelId, userOrName);
    const resolvedId = channel.id;
    const limit = query.limit ? Math.min(Math.max(parseInt(query.limit as string) || 30, 5), 100) : 30;
    const beforeId = query.before as string | undefined;

    // Check Redis Cache for default latest history request (no pagination cursor)
    const isLatestDefault = !beforeId && (!query.limit || parseInt(query.limit as string) === 30);
    const historyCacheKey = `cache:history:${resolvedId}:latest`;

    if (isLatestDefault) {
      const cached = await getCacheJson<any>(historyCacheKey);
      if (cached) {
        if (!query.limit && !query.before && Array.isArray(cached)) {
          return cached;
        }
        if (cached.messages) {
          return !query.limit && !query.before ? cached.messages : cached;
        }
      }
    }

    let whereClause = eq(schema.messages.channelId, resolvedId);

    if (beforeId) {
      const beforeMsg = (await db.select({ createdAt: schema.messages.createdAt })
        .from(schema.messages)
        .where(eq(schema.messages.id, beforeId)))[0];

      if (beforeMsg) {
        whereClause = and(
          eq(schema.messages.channelId, resolvedId),
          lt(schema.messages.createdAt, beforeMsg.createdAt)
        ) as any;
      }
    }

    const channelMessages = await db.query.messages.findMany({
      where: whereClause,
      orderBy: [desc(schema.messages.createdAt)],
      limit: limit + 1, // Fetch 1 extra to determine hasMore
      with: {
        sender: {
          columns: {
            id: true,
            username: true
          }
        }
      }
    });

    const hasMore = channelMessages.length > limit;
    const messagesToFormat = hasMore ? channelMessages.slice(0, limit) : channelMessages;

    const formatted = messagesToFormat.map(m => {
      let parsedAttachments = null;
      let parsedReactions = [];
      try {
        if (m.attachments) parsedAttachments = JSON.parse(m.attachments);
      } catch {}
      try {
        if (m.reactions) parsedReactions = JSON.parse(m.reactions);
      } catch {}

      return {
        id: m.id,
        channelId: m.channelId,
        content: m.content,
        type: m.type,
        status: m.status,
        replyToId: m.replyToId,
        attachments: parsedAttachments,
        reactions: parsedReactions,
        isPinned: m.isPinned === 'true',
        createdAt: m.createdAt,
        sender: {
          id: m.senderId || 'guest',
          username: m.sender?.username || m.senderName || 'Staff RSUD'
        }
      };
    });

    const reversed = formatted.reverse();
    const resultObj = {
      messages: reversed, // Return oldest to newest for UI
      hasMore
    };

    // Cache latest history in Redis
    if (isLatestDefault) {
      await setCacheJson(historyCacheKey, resultObj, 300); // 5 mins cache
    }

    // If no pagination query params provided, return legacy Array format for backwards compatibility
    if (!query.limit && !query.before) {
      return reversed;
    }

    return resultObj;
  });
