import { browser } from '$app/environment';
import { saveMessagesToLocal, deleteMessageFromLocal, updateMessageInLocal } from '$lib/stores/localdb';

export interface Channel {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: string;
  displayName?: string;
  avatarUrl?: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  channelId: string;
  text: string;
  status: MessageStatus;
  replyToId?: string | null;
  attachments?: { url: string; name: string; type: string; size: number }[] | null;
  reactions?: { emoji: string; username: string }[];
  isPinned?: boolean;
  sender: {
    id: string;
    username: string;
  };
  timestamp: string;
  type?: string;
}

export function getApiBase(): string {
  if (!browser) return 'http://backend:8080';
  // Always use relative paths in browser so all requests go through Vite proxy
  // This ensures SSE and REST requests share the same connection context
  return '';
}

export function createChatStore() {
  let messages = $state<Record<string, ChatMessage[]>>({});
  let activeChannelId = $state<string | null>(null);
  let isConnected = $state(false);
  let channels = $state<Channel[]>([]);
  let isLoadingChannels = $state(false);
  
  // Gaps state
  let replyingToMessage = $state<ChatMessage | null>(null);

  // Realtime Presence & Typing states
  let onlineUsers = $state<string[]>([]);
  let onlineCount = $state(1);
  let typingUsersMap = $state<Record<string, string[]>>({});

  // Auth state
  let authUser = $state<User | null>(null);
  let authToken = $state<string | null>(null);
  let guestNickname = $state('Staff RSUD');
  let eventSource: EventSource | null = null;
  let typingTimeout: any = null;

  if (browser) {
    // Restore auth
    const savedToken = localStorage.getItem('rsud_chat_token');
    const savedUser = localStorage.getItem('rsud_chat_user');
    if (savedToken && savedUser) {
      try {
        authToken = savedToken;
        authUser = JSON.parse(savedUser);
      } catch {
        localStorage.removeItem('rsud_chat_token');
        localStorage.removeItem('rsud_chat_user');
      }
    }

    // Restore guest nickname
    const savedNickname = localStorage.getItem('rsud_chat_username');
    if (savedNickname) {
      guestNickname = savedNickname;
    } else {
      const generated = `Staff-${Math.floor(1000 + Math.random() * 9000)}`;
      guestNickname = generated;
      localStorage.setItem('rsud_chat_username', generated);
    }
  }

  let currentUsername = $derived(authUser ? authUser.username : guestNickname);

  function setGuestNickname(name: string) {
    if (!name.trim()) return;
    guestNickname = name.trim();
    if (browser) {
      localStorage.setItem('rsud_chat_username', guestNickname);
    }
  }

  async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Login gagal, periksa username/password' };
      }

      authToken = data.token;
      authUser = data.user;
      if (browser) {
        localStorage.setItem('rsud_chat_token', data.token);
        localStorage.setItem('rsud_chat_user', JSON.stringify(data.user));
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Gagal terhubung ke server' };
    }
  }

  async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Registrasi gagal, username mungkin sudah digunakan' };
      }

      authToken = data.token;
      authUser = data.user;
      if (browser) {
        localStorage.setItem('rsud_chat_token', data.token);
        localStorage.setItem('rsud_chat_user', JSON.stringify(data.user));
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Gagal terhubung ke server' };
    }
  }

  async function updateProfile(displayName: string, avatarUrl?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ displayName, avatarUrl })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Gagal update profil' };
      }

      authUser = data.user;
      if (browser) {
        localStorage.setItem('rsud_chat_user', JSON.stringify(data.user));
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error koneksi server' };
    }
  }

  function logout() {
    authToken = null;
    authUser = null;
    if (browser) {
      localStorage.removeItem('rsud_chat_token');
      localStorage.removeItem('rsud_chat_user');
    }
  }

  async function loadChannels() {
    isLoadingChannels = true;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/chat/channels`);
      if (res.ok) {
        const data = await res.json();
        channels = data;
      }
    } catch (e) {
      console.error('Failed to load channels', e);
    } finally {
      isLoadingChannels = false;
    }
  }

  let usersList = $state<User[]>([]);
  let isLoadingUsers = $state(false);

  async function loadUsers() {
    if (!browser) return;
    isLoadingUsers = true;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/chat/users`);
      if (res.ok) {
        usersList = await res.json();
      }
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      isLoadingUsers = false;
    }
  }

  async function startDirectMessage(targetUserId: string): Promise<any | null> {
    if (!browser) return null;
    try {
      const base = getApiBase();
      const currentUserId = authUser?.id || usersList.find(u => u.username === (authUser?.username || guestNickname))?.id;
      if (!currentUserId) return null;
      if (currentUserId === targetUserId) return null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${base}/api/chat/dm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId,
          currentUserId
        })
      });

      if (res.ok) {
        const dmChan = await res.json();
        if (!channels.some(c => c.id === dmChan.id)) {
          channels = [...channels, { id: dmChan.id, name: dmChan.name, type: 'dm', description: dmChan.description, createdAt: dmChan.createdAt, targetUser: dmChan.targetUser }];
        }
        return dmChan;
      }
    } catch (e) {
      console.error('Failed to start DM', e);
    }
    return null;
  }

  async function fetchChannelInfo(channelId: string): Promise<any | null> {
    if (!browser || !channelId) return null;
    const existing = channels.find(c => c.id === channelId || c.name === channelId);
    if (existing && existing.type) return existing;

    try {
      const base = getApiBase();
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const current = currentUsername;
      const res = await fetch(`${base}/api/chat/channel/${encodeURIComponent(channelId)}?username=${encodeURIComponent(current)}`, { headers });
      if (res.ok) {
        const chanData = await res.json();
        const formatted = {
          id: chanData.id,
          name: chanData.name,
          type: chanData.type,
          description: chanData.description,
          createdAt: chanData.createdAt,
          targetUser: chanData.targetUser
        };
        if (!channels.some(c => c.id === formatted.id)) {
          channels = [...channels, formatted];
        }
        return formatted;
      }
    } catch (e) {
      console.error('Failed to fetch channel info', e);
    }
    return null;
  }

  async function createChannel(name: string): Promise<Channel | null> {
    try {
      const base = getApiBase();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${base}/api/chat/channels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newChan: Channel = await res.json();
        if (!channels.some(c => c.id === newChan.id)) {
          channels = [...channels, newChan];
        }
        return newChan;
      }
    } catch (e) {
      console.error('Failed to create channel', e);
    }
    return null;
  }

  async function sendTyping(channelId: string, isTyping: boolean) {
    if (!browser || !channelId) return;
    try {
      const base = getApiBase();
      await fetch(`${base}/api/chat/typing/${channelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          isTyping
        })
      });
    } catch (e) {
      // Ignore
    }
  }

  async function markAsRead(channelId: string, messageIds: string[]) {
    if (!browser || !channelId || messageIds.length === 0) return;
    try {
      const base = getApiBase();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      await fetch(`${base}/api/chat/read/${encodeURIComponent(channelId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageIds,
          readerUsername: currentUsername
        })
      });
    } catch (e) {
      // Ignore
    }
  }

  async function reactToMessage(messageId: string, emoji: string) {
    if (!activeChannelId) return;
    try {
      const base = getApiBase();
      await fetch(`${base}/api/chat/react/${activeChannelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          emoji,
          username: currentUsername
        })
      });
    } catch (e) {
      console.error('Failed to add reaction', e);
    }
  }

  async function togglePinMessage(messageId: string, isPinned: boolean) {
    if (!activeChannelId) return;
    try {
      const base = getApiBase();
      await fetch(`${base}/api/chat/pin/${activeChannelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          isPinned
        })
      });
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  }

  async function deleteMessage(messageId: string) {
    if (!activeChannelId) return;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/chat/${activeChannelId}/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        console.error('Failed to delete message');
      }
    } catch (e) {
      console.error('Error deleting message', e);
    }
  }

  let isSoundEnabled = $state(true);

  if (browser) {
    const savedSound = localStorage.getItem('rsud_sound_enabled');
    if (savedSound !== null) {
      isSoundEnabled = savedSound === 'true';
    }
  }

  function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    if (browser) {
      localStorage.setItem('rsud_sound_enabled', isSoundEnabled.toString());
      if (isSoundEnabled) {
        playIncomingNotificationSound();
      }
    }
  }

  function playIncomingNotificationSound() {
    if (!browser || !isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // WhatsApp style 2-tone melodic pop chime
      // Tone 1: E5 (659Hz) -> A5 (880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2: D6 (1174Hz) -> E6 (1318Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.18);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Notification audio failed', e);
    }
  }

  const channelAliasMap: Record<string, string> = {};

  function getCanonicalId(idOrName: string | null | undefined): string {
    if (!idOrName) return '';
    const match = channels.find(c => c.id === idOrName || c.name === idOrName);
    return match ? match.id : idOrName;
  }

  async function sendChatMessage(channelId: string, text: string, files: any[] = [], replyToId?: string): Promise<boolean> {
    if (!browser || (!text.trim() && files.length === 0) || !channelId) return false;

    // Always resolve to canonical UUID for consistent state management
    const canonId = getCanonicalId(channelId);
    const storeKey = canonId || channelId; // Primary key for messages state

    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channelId: storeKey,
      text: text.trim(),
      status: 'sending',
      replyToId: replyToId || null,
      attachments: files.length > 0 ? files : null,
      reactions: [],
      isPinned: false,
      sender: { id: authUser?.id || 'me', username: currentUsername },
      timestamp: new Date().toISOString(),
      type: 'message'
    };

    // Optimistically append under both UUID and alias
    const existingList = messages[storeKey] || messages[channelId] || [];
    messages[storeKey] = [...existingList, optimisticMsg];
    if (channelId !== storeKey) messages[channelId] = messages[storeKey];

    try {
      const base = getApiBase();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${base}/api/chat/send/${encodeURIComponent(channelId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text.trim(),
          senderName: currentUsername,
          replyToId,
          attachments: files.length > 0 ? files : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const confirmedId = data.messageId || data.message?.id || tempId;
        const confirmedChannelId = data.message?.channelId || storeKey;
        const confirmedStatus = data.message?.status || 'delivered';

        // Register alias between input name and confirmed UUID
        if (confirmedChannelId !== channelId) {
          channelAliasMap[channelId] = confirmedChannelId;
          channelAliasMap[confirmedChannelId] = channelId;
        }

        // Update temp message in all keys
        const allKeys = new Set([storeKey, channelId, confirmedChannelId].filter(Boolean));
        for (const key of allKeys) {
          const list = messages[key] || [];
          const idx = list.findIndex(m => m.id === tempId);
          if (idx > -1) {
            list[idx] = { ...list[idx], id: confirmedId, channelId: confirmedChannelId, status: confirmedStatus };
            messages[key] = [...list];
          }
        }
        return true;
      } else {
        const list = messages[storeKey] || [];
        const idx = list.findIndex(m => m.id === tempId);
        if (idx > -1) {
          list[idx] = { ...list[idx], status: 'error' as any };
          messages[storeKey] = [...list];
          if (channelId !== storeKey) messages[channelId] = [...list];
        }
        return false;
      }
    } catch (e) {
      console.error('Error sending message', e);
      const list = messages[storeKey] || [];
      const idx = list.findIndex(m => m.id === tempId);
      if (idx > -1) {
        list[idx] = { ...list[idx], status: 'error' as any };
        messages[storeKey] = [...list];
        if (channelId !== storeKey) messages[channelId] = [...list];
      }
      return false;
    }
  }

  function connect(channelId: string) {
    if (!browser) return;
    if (eventSource) {
      eventSource.close();
    }
    
    activeChannelId = channelId;
    const canonId = getCanonicalId(channelId);
    // Init message arrays for both channel name and UUID
    if (!messages[channelId]) messages[channelId] = [];
    if (canonId && canonId !== channelId && !messages[canonId]) messages[canonId] = messages[channelId];

    const base = getApiBase();
    const url = `${base}/api/chat/sse/${encodeURIComponent(channelId)}?username=${encodeURIComponent(currentUsername)}`;
    eventSource = new EventSource(url, { withCredentials: true });
    
    eventSource.onopen = () => {
      isConnected = true;
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const canon = getCanonicalId(data.channelId || channelId);
        
        if (data.type === 'connected') {
          isConnected = true;
          if (data.channelId) {
            // Register bidirectional alias (channelName <-> UUID)
            channelAliasMap[channelId] = data.channelId;
            channelAliasMap[data.channelId] = channelId;
            // Sync messages: if we have data under name but not UUID, copy it
            if (!messages[data.channelId] || messages[data.channelId].length === 0) {
              messages[data.channelId] = messages[channelId] || [];
            } else if (!messages[channelId] || messages[channelId].length === 0) {
              messages[channelId] = messages[data.channelId];
            }
            // Switch activeChannelId to UUID so SSE events (which come with UUID) always match
            activeChannelId = data.channelId;
          }
          if (data.onlineCount !== undefined) onlineCount = data.onlineCount;
          if (data.onlineUsers) onlineUsers = data.onlineUsers;
          return;
        }

        if (data.type === 'heartbeat') {
          isConnected = true;
          return;
        }

        if (data.type === 'presence') {
          onlineCount = data.onlineCount || 1;
          onlineUsers = data.onlineUsers || [];
          return;
        }

        if (data.type === 'typing') {
          if (data.username !== currentUsername) {
            const list = typingUsersMap[channelId] || [];
            if (data.isTyping) {
              if (!list.includes(data.username)) {
                typingUsersMap[channelId] = [...list, data.username];
              }
            } else {
              typingUsersMap[channelId] = list.filter(u => u !== data.username);
            }
          }
          return;
        }

        if (data.type === 'read_receipt') {
          const resolvedKeys = new Set([
            channelId,
            canon,
            data.channelId,
            data.aliasChannelId,
            channelAliasMap[channelId],
            channelAliasMap[data.channelId]
          ].filter(Boolean) as string[]);

          const ids = new Set(data.messageIds || []);
          for (const key of resolvedKeys) {
            const list = messages[key] || [];
            let updated = false;
            list.forEach(m => {
              if (ids.has(m.id)) {
                m.status = 'read';
                updated = true;
              }
            });
            if (updated) {
              messages[key] = [...list];
            }
          }
          return;
        }

        if (data.type === 'reaction') {
          const list = messages[canon] || messages[channelId] || [];
          const msg = list.find(m => m.id === data.messageId);
          if (msg) {
            msg.reactions = data.reactions;
            messages[canon] = [...list];
            messages[channelId] = [...list];
          }
          return;
        }

        if (data.type === 'pin') {
          const list = messages[canon] || messages[channelId] || [];
          const msg = list.find(m => m.id === data.messageId);
          if (msg) {
            msg.isPinned = data.isPinned;
            messages[canon] = [...list];
            messages[channelId] = [...list];
          }
          return;
        }

        if (data.type === 'delete') {
          const list = messages[canon] || messages[channelId] || [];
          const updated = list.filter(m => m.id !== data.messageId);
          messages[canon] = updated;
          messages[channelId] = updated;
          // Remove from IndexedDB local cache
          if (browser) deleteMessageFromLocal(data.messageId);
          return;
        }

        if (data.type === 'message' || data.type === 'webhook_inbound') {
          const resolvedKeys = new Set([channelId, canon, data.channelId, channelAliasMap[channelId], channelAliasMap[data.channelId]].filter(Boolean) as string[]);

          const newMsg: ChatMessage = {
            id: data.id,
            channelId: data.channelId,
            text: data.text || data.content,
            status: data.status || 'delivered',
            replyToId: data.replyToId || null,
            attachments: data.attachments || null,
            reactions: data.reactions || [],
            isPinned: data.isPinned || false,
            sender: data.sender || { id: 'guest', username: 'Staff' },
            timestamp: data.timestamp || new Date().toISOString(),
            type: data.type
          };

          for (const key of resolvedKeys) {
            const list = messages[key] || [];
            const tempIdx = list.findIndex(m => m.id.startsWith('temp_') && m.text === newMsg.text && (m.sender?.username || m.sender) === (newMsg.sender?.username || newMsg.sender));
            if (tempIdx > -1) {
              list[tempIdx] = newMsg;
              messages[key] = [...list];
            } else if (!list.some(m => m.id === data.id)) {
              messages[key] = [...list, newMsg];
            }
          }

          // Persist to IndexedDB for local-first caching
          if (browser) {
            saveMessagesToLocal([newMsg]);
          }

          if (data.sender?.username !== currentUsername) {
            playIncomingNotificationSound();
            markAsRead(channelId, [data.id]);
          }
        }
      } catch (e) {
        console.error('Failed to parse SSE message', e);
      }
    };
    
    eventSource.onerror = () => {
      isConnected = false;
    };
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    isConnected = false;
  }

  function setMessages(channelId: string, newMessages: ChatMessage[]) {
    const canonId = getCanonicalId(channelId);
    const aliasId = channelAliasMap[channelId];

    messages[channelId] = newMessages;
    if (canonId) messages[canonId] = newMessages;
    if (aliasId) messages[aliasId] = newMessages;

    // Auto mark all unread messages from others as read
    const unreadIds = newMessages
      .filter(m => m.sender?.username !== currentUsername && m.status !== 'read')
      .map(m => m.id);
    if (unreadIds.length > 0) {
      markAsRead(channelId, unreadIds);
    }
  }

  function prependMessages(channelId: string, olderMessages: ChatMessage[]) {
    const canonId = getCanonicalId(channelId);
    const aliasId = channelAliasMap[channelId];
    const current = (messages[channelId] && messages[channelId].length > 0) 
      ? messages[channelId] 
      : ((canonId && messages[canonId]?.length) ? messages[canonId] : (aliasId && messages[aliasId]?.length) ? messages[aliasId] : []);
    
    const existingIds = new Set(current.map(m => m.id));
    const uniqueOlder = olderMessages.filter(m => !existingIds.has(m.id));
    const merged = [...uniqueOlder, ...current];

    messages[channelId] = merged;
    if (canonId) messages[canonId] = merged;
    if (aliasId) messages[aliasId] = merged;
  }

  return {
    get messages() {
      if (!activeChannelId) return [];
      const canonId = getCanonicalId(activeChannelId);
      const aliasId = channelAliasMap[activeChannelId];

      // Collect all message lists from all known keys for this channel
      const allKeys = new Set([activeChannelId, canonId, aliasId].filter(Boolean) as string[]);
      const seenIds = new Set<string>();
      const merged: ChatMessage[] = [];

      // Collect messages from all keys and deduplicate by ID
      for (const key of allKeys) {
        const list = messages[key] || [];
        for (const m of list) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            merged.push(m);
          }
        }
      }

      // Sort by timestamp
      merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return merged;
    },
    get isConnected() {
      return isConnected;
    },
    get activeChannelId() {
      return activeChannelId;
    },
    get channels() {
      return channels;
    },
    get isLoadingChannels() {
      return isLoadingChannels;
    },
    get authUser() {
      return authUser;
    },
    get authToken() {
      return authToken;
    },
    get currentUsername() {
      return authUser?.username || guestNickname;
    },
    get onlineUsers() {
      return onlineUsers;
    },
    get onlineCount() {
      return onlineCount;
    },
    get currentTypingUsers() {
      return activeChannelId ? (typingUsersMap[activeChannelId] || []) : [];
    },
    get replyingToMessage() {
      return replyingToMessage;
    },
    set replyingToMessage(val) {
      replyingToMessage = val;
    },
    get usersList() {
      return usersList;
    },
    get isLoadingUsers() {
      return isLoadingUsers;
    },
    get isSoundEnabled() {
      return isSoundEnabled;
    },
    toggleSound,
    playIncomingNotificationSound,
    fetchChannelInfo,
    login,
    register,
    updateProfile,
    logout,
    setGuestNickname,
    loadChannels,
    createChannel,
    loadUsers,
    startDirectMessage,
    sendChatMessage,
    sendTyping,
    markAsRead,
    reactToMessage,
    togglePinMessage,
    deleteMessage,
    connect,
    disconnect,
    setMessages,
    prependMessages
  };
}

export const chatStore = createChatStore();
