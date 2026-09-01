import { Elysia, t } from 'elysia';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, count } from 'drizzle-orm';
import { jwt } from '@elysiajs/jwt';
import { delCacheKeys, invalidateCachePattern } from '../services/cache';

// Standalone admin router with its own JWT verification
export const adminRouter = new Elysia({ prefix: '/admin', detail: { tags: ['Admin'] } })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-secret-key-min-32-chars',
    })
  )
  // Verify token and admin role on every request
  .onBeforeHandle(async ({ jwt, headers, set }) => {
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const token = authHeader.split(' ')[1];
    const payload = await jwt.verify(token);
    if (!payload) {
      set.status = 401;
      return { error: 'Unauthorized: invalid token' };
    }

    const userId = payload.userId as string;
    const fullUser = (await db.select().from(schema.users).where(eq(schema.users.id, userId)))[0];
    if (!fullUser || fullUser.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak: Hanya administrator yang diijinkan.' };
    }
  })

  // Dashboard statistics
  .get('/stats', async () => {
    const totalUsersCount = (await db.select({ value: count() }).from(schema.users))[0].value;
    const totalMessagesCount = (await db.select({ value: count() }).from(schema.messages))[0].value;
    const totalChannelsCount = (await db.select({ value: count() }).from(schema.channels))[0].value;

    return {
      users: totalUsersCount,
      messages: totalMessagesCount,
      channels: totalChannelsCount
    };
  })

  // List all users
  .get('/users', async () => {
    const allUsers = await db.select({
      id: schema.users.id,
      username: schema.users.username,
      role: schema.users.role,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt
    }).from(schema.users);
    return allUsers;
  })

  // Update user role or status
  .put('/users/:userId', async ({ params: { userId }, body, error }) => {
    try {
      const updated = await db.update(schema.users)
        .set({ role: body.role, isActive: body.isActive })
        .where(eq(schema.users.id, userId))
        .returning();

      if (updated.length === 0) return error(404, 'User tidak ditemukan');

      return {
        success: true,
        user: { id: updated[0].id, username: updated[0].username, role: updated[0].role, isActive: updated[0].isActive }
      };
    } catch (e: any) {
      return error(400, e.message || 'Gagal update user');
    }
  }, {
    body: t.Object({ role: t.String(), isActive: t.String() })
  })

  // Delete channel
  .delete('/channels/:channelId', async ({ params: { channelId }, error }) => {
    try {
      await db.delete(schema.messages).where(eq(schema.messages.channelId, channelId));
      const deleted = await db.delete(schema.channels).where(eq(schema.channels.id, channelId)).returning();
      if (deleted.length === 0) return error(404, 'Channel tidak ditemukan');

      // Invalidate Redis caches
      await delCacheKeys('cache:channels:public', `cache:history:${channelId}:latest`);
      await invalidateCachePattern('cache:chan_resolve:*');

      return { success: true, message: 'Channel berhasil dihapus.' };
    } catch (e: any) {
      return error(400, e.message || 'Gagal menghapus channel');
    }
  });
