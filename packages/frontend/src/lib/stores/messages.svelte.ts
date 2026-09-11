import { browser } from '$app/environment';
import type { ChatMessage, Attachment, Reaction } from '$lib/types';
import { getApiBase, getAuthHeaders, playIncomingNotificationSound } from '$lib/utils';
import { saveMessagesToLocal, deleteMessageFromLocal } from '$lib/stores/localdb';
import { authStore } from './auth.svelte';
import { channelsStore } from './channels.svelte';

export function createMessagesStore() {
  let messages = $state<Record<string, ChatMessage[]>>({});
  let pinnedMessagesMap = $state<Record<string, ChatMessage[]>>({});
  let replyingToMessage = $state<ChatMessage | null>(null);
  let isSoundEnabled = $state(true);

  if (browser) {
    const savedSound = localStorage.getItem('rsud_sound_enabled');
    if (savedSound !== null) {
      isSoundEnabled = savedSound === 'true';
    }
  }

  function toggleSound(): void {
    isSoundEnabled = !isSoundEnabled;
    if (browser) {
      localStorage.setItem('rsud_sound_enabled', isSoundEnabled.toString());
      if (isSoundEnabled) {
        playIncomingNotificationSound(true);
      }
    }
  }

  function getChannelMessages(activeChannelId: string | null): ChatMessage[] {
    if (!activeChannelId) return [];
    const canonId = channelsStore.getCanonicalId(activeChannelId);

    const allKeys = new Set([activeChannelId, canonId].filter(Boolean));
    const seenIds = new Set<string>();
    const merged: ChatMessage[] = [];

    for (const key of allKeys) {
      const list = messages[key] || [];
      for (const m of list) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          merged.push(m);
        }
      }
    }

    merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return merged;
  }

  function getPinnedMessages(activeChannelId: string | null): ChatMessage[] {
    if (!activeChannelId) return [];
    const canonId = channelsStore.getCanonicalId(activeChannelId);
    const allKeys = new Set([activeChannelId, canonId].filter(Boolean));
    for (const key of allKeys) {
      if (pinnedMessagesMap[key] && pinnedMessagesMap[key].length > 0) {
        return pinnedMessagesMap[key];
      }
    }
    return [];
  }

  async function loadPinnedMessages(channelId: string): Promise<ChatMessage[]> {
    if (!channelId) return [];
    const canonId = channelsStore.getCanonicalId(channelId);
    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);
      const res = await fetch(`${base}/api/chat/pinned/${encodeURIComponent(channelId)}`, { headers });
      if (res.ok) {
        const rawList = await res.json();
        const adapted: ChatMessage[] = (Array.isArray(rawList) ? rawList : []).map((m: any) => ({
          id: m.id,
          channelId: m.channelId || channelId,
          text: m.content,
          status: m.status || 'sent',
          replyToId: m.replyToId,
          attachments: m.attachments,
          reactions: m.reactions || [],
          isPinned: true,
          sender: m.sender || { id: m.senderId || 'anon', username: m.senderName || 'Staff RSUD' },
          timestamp: m.createdAt,
          type: m.type
        }));

        pinnedMessagesMap[channelId] = adapted;
        if (canonId) pinnedMessagesMap[canonId] = adapted;
        return adapted;
      }
    } catch (e) {
      console.error('Failed to load pinned messages', e);
    }
    return pinnedMessagesMap[channelId] || (canonId ? pinnedMessagesMap[canonId] : []) || [];
  }

  async function loadMessageContext(channelId: string, messageId: string): Promise<{ messages: ChatMessage[]; targetIndex: number }> {
    if (!channelId || !messageId) return { messages: [], targetIndex: -1 };
    const canonId = channelsStore.getCanonicalId(channelId);
    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);
      const res = await fetch(`${base}/api/chat/history/${encodeURIComponent(channelId)}/context/${encodeURIComponent(messageId)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data?.messages) ? data.messages : [];
        const adapted: ChatMessage[] = rawList.map((m: any) => ({
          id: m.id,
          channelId: m.channelId || channelId,
          text: m.content,
          status: m.status || 'sent',
          replyToId: m.replyToId,
          attachments: m.attachments,
          reactions: m.reactions || [],
          isPinned: m.isPinned || false,
          sender: m.sender || { id: m.senderId || 'anon', username: m.senderName || 'Staff RSUD' },
          timestamp: m.createdAt,
          type: m.type
        }));

        const current = messages[channelId] || (canonId ? messages[canonId] : []) || [];
        const existingIds = new Set(current.map((m) => m.id));
        const toAdd = adapted.filter((m) => !existingIds.has(m.id));

        if (toAdd.length > 0) {
          const merged = [...current, ...toAdd].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          messages[channelId] = merged;
          if (canonId) messages[canonId] = merged;
          if (browser) {
            saveMessagesToLocal(toAdd);
          }
        }

        return { messages: adapted, targetIndex: data.targetIndex ?? -1 };
      }
    } catch (e) {
      console.error('Failed to load message context', e);
    }
    return { messages: [], targetIndex: -1 };
  }

  async function sendChatMessage(
    channelId: string,
    text: string,
    files: Attachment[] = [],
    replyToId?: string
  ): Promise<boolean> {
    if (!browser || (!text.trim() && files.length === 0) || !channelId) return false;

    const canonId = channelsStore.getCanonicalId(channelId);
    const storeKey = canonId || channelId;

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
      sender: {
        id: authStore.authUser?.id || 'me',
        username: authStore.currentUsername,
        displayName: authStore.authUser?.displayName
      },
      timestamp: new Date().toISOString(),
      type: 'message'
    };

    const existingList = messages[storeKey] || messages[channelId] || [];
    messages[storeKey] = [...existingList, optimisticMsg];
    if (channelId !== storeKey) messages[channelId] = messages[storeKey];

    // Optimistically update channel preview
    channelsStore.updateChannelLastMessage([storeKey, channelId], {
      text: optimisticMsg.text,
      senderName: 'Anda',
      attachments: optimisticMsg.attachments,
      createdAt: optimisticMsg.timestamp
    });

    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);

      const res = await fetch(`${base}/api/chat/send/${encodeURIComponent(channelId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text.trim(),
          senderName: authStore.currentUsername,
          replyToId,
          attachments: files.length > 0 ? files : undefined
        })
      });

      if (res.ok) {
        const data = (await res.json()) as { messageId?: string; message?: { id?: string; channelId?: string; status?: ChatMessage['status'] } };
        const confirmedId = data.messageId || data.message?.id || tempId;
        const confirmedChannelId = data.message?.channelId || storeKey;
        const confirmedStatus = data.message?.status || 'delivered';

        if (confirmedChannelId !== channelId) {
          channelsStore.registerAlias(channelId, confirmedChannelId);
        }

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
        markTempMessageError(storeKey, channelId, tempId);
        return false;
      }
    } catch (e) {
      console.error('Error sending message', e);
      markTempMessageError(storeKey, channelId, tempId);
      return false;
    }
  }

  function markTempMessageError(storeKey: string, channelId: string, tempId: string) {
    const list = messages[storeKey] || [];
    const idx = list.findIndex(m => m.id === tempId);
    if (idx > -1) {
      list[idx] = { ...list[idx], status: 'error' };
      messages[storeKey] = [...list];
      if (channelId !== storeKey) messages[channelId] = [...list];
    }
  }

  function setMessages(channelId: string, newMessages: ChatMessage[]): void {
    const canonId = channelsStore.getCanonicalId(channelId);

    messages[channelId] = newMessages;
    if (canonId) messages[canonId] = newMessages;

    const unreadIds = newMessages
      .filter(m => m.sender?.username !== authStore.currentUsername && m.status !== 'read')
      .map(m => m.id);
    if (unreadIds.length > 0) {
      markAsRead(channelId, unreadIds);
    }
  }

  function prependMessages(channelId: string, olderMessages: ChatMessage[]): void {
    const canonId = channelsStore.getCanonicalId(channelId);
    const current = (messages[channelId] && messages[channelId].length > 0)
      ? messages[channelId]
      : ((canonId && messages[canonId]?.length) ? messages[canonId] : []);

    const existingIds = new Set(current.map(m => m.id));
    const uniqueOlder = olderMessages.filter(m => !existingIds.has(m.id));
    const merged = [...uniqueOlder, ...current];

    messages[channelId] = merged;
    if (canonId) messages[canonId] = merged;
  }

  async function markAsRead(channelId: string, messageIds: string[]): Promise<void> {
    if (!browser || !channelId || messageIds.length === 0) return;
    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);

      await fetch(`${base}/api/chat/read/${encodeURIComponent(channelId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageIds,
          readerUsername: authStore.currentUsername
        })
      });
    } catch {
      // Ignore
    }
  }

  async function reactToMessage(channelId: string | null, messageId: string, emoji: string): Promise<void> {
    if (!channelId) return;

    const canon = channelsStore.getCanonicalId(channelId);
    const chanMsgs = messages[channelId] || messages[canon] || [];
    const msg = chanMsgs.find(m => m.id === messageId);
    if (msg) {
      const currentList: Reaction[] = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
      const userIdx = currentList.findIndex(r => r.username === authStore.currentUsername);

      if (userIdx > -1) {
        if (currentList[userIdx].emoji === emoji) {
          currentList.splice(userIdx, 1);
        } else {
          currentList[userIdx] = { emoji, username: authStore.currentUsername };
        }
      } else {
        currentList.push({ emoji, username: authStore.currentUsername });
      }
      msg.reactions = currentList;
    }

    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);
      await fetch(`${base}/api/chat/react/${channelId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId,
          emoji,
          username: authStore.currentUsername
        })
      });
    } catch (e) {
      console.error('Failed to add reaction', e);
    }
  }

  async function togglePinMessage(channelId: string | null, messageId: string, isPinned: boolean): Promise<void> {
    if (!channelId) return;
    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);
      const canonId = channelsStore.getCanonicalId(channelId);
      const allKeys = Array.from(new Set([channelId, canonId].filter(Boolean) as string[]));

      // Optimistic update
      handlePinUpdate({ messageId, isPinned }, allKeys);

      await fetch(`${base}/api/chat/pin/${channelId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messageId, isPinned })
      });
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  }

  async function deleteMessage(channelId: string | null, messageId: string): Promise<void> {
    if (!channelId) return;
    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);
      const res = await fetch(`${base}/api/chat/${channelId}/${messageId}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        console.error('Failed to delete message');
      }
    } catch (e) {
      console.error('Error deleting message', e);
    }
  }

  function handleIncomingMessage(data: ChatMessage & { content?: string }, channelId: string, canon: string): void {
    const resolvedKeys = new Set([channelId, canon, data.channelId].filter(Boolean));

    const newMsg: ChatMessage = {
      id: data.id,
      channelId: data.channelId,
      text: data.text || data.content || '',
      status: data.status || 'delivered',
      replyToId: data.replyToId || null,
      attachments: data.attachments || null,
      reactions: data.reactions || [],
      isPinned: data.isPinned || false,
      sender: data.sender || { id: 'guest', username: 'Staff RSUD' },
      timestamp: data.timestamp || new Date().toISOString(),
      type: data.type || 'message'
    };

    for (const key of resolvedKeys) {
      const list = messages[key] || [];
      const tempIdx = list.findIndex(
        m => m.id.startsWith('temp_') && m.text === newMsg.text && (m.sender?.username || m.sender) === (newMsg.sender?.username || newMsg.sender)
      );
      if (tempIdx > -1) {
        list[tempIdx] = newMsg;
        messages[key] = [...list];
      } else if (!list.some(m => m.id === data.id)) {
        messages[key] = [...list, newMsg];
      }
    }

    if (browser) {
      saveMessagesToLocal([newMsg]);
    }

    channelsStore.updateChannelLastMessage(Array.from(resolvedKeys), {
      text: newMsg.text,
      senderName: (newMsg.sender?.username || newMsg.sender) === authStore.currentUsername
        ? 'Anda'
        : (newMsg.sender?.displayName || newMsg.sender?.username || 'Staff RSUD'),
      attachments: newMsg.attachments,
      createdAt: newMsg.timestamp
    });

    if (data.sender?.username !== authStore.currentUsername) {
      playIncomingNotificationSound(isSoundEnabled);
      markAsRead(channelId, [data.id]);
    }
  }

  function handleReadReceipt(data: { messageIds: string[] }, channelKeys: string[]): void {
    const ids = new Set(data.messageIds || []);
    for (const key of channelKeys) {
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
  }

  function handleReactionUpdate(data: { messageId: string; reactions: Reaction[] }, channelKeys: string[]): void {
    for (const key of channelKeys) {
      const list = messages[key] || [];
      const msg = list.find(m => m.id === data.messageId);
      if (msg) {
        msg.reactions = data.reactions;
        messages[key] = [...list];
      }
    }
  }

  function handlePinUpdate(data: { messageId: string; isPinned: boolean }, channelKeys: string[]): void {
    for (const key of channelKeys) {
      const list = messages[key] || [];
      const msg = list.find((m) => m.id === data.messageId);
      if (msg) {
        msg.isPinned = data.isPinned;
        messages[key] = [...list];
      }

      // Update pinnedMessagesMap
      const pList = pinnedMessagesMap[key] || [];
      if (data.isPinned) {
        if (!pList.some((m) => m.id === data.messageId)) {
          if (msg) {
            pinnedMessagesMap[key] = [...pList, { ...msg, isPinned: true }].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          } else {
            // If message was not currently loaded in memory, fetch latest pinned list from server
            loadPinnedMessages(key);
          }
        }
      } else {
        pinnedMessagesMap[key] = pList.filter((m) => m.id !== data.messageId);
      }
    }
  }

  function handleDeleteUpdate(data: { messageId: string }, channelKeys: string[]): void {
    for (const key of channelKeys) {
      const list = messages[key] || [];
      messages[key] = list.filter((m) => m.id !== data.messageId);
      if (pinnedMessagesMap[key]) {
        pinnedMessagesMap[key] = pinnedMessagesMap[key].filter((m) => m.id !== data.messageId);
      }
    }
    if (browser) {
      deleteMessageFromLocal(data.messageId);
    }
  }

  return {
    get rawMessages() {
      return messages;
    },
    get replyingToMessage() {
      return replyingToMessage;
    },
    set replyingToMessage(val: ChatMessage | null) {
      replyingToMessage = val;
    },
    get isSoundEnabled() {
      return isSoundEnabled;
    },
    toggleSound,
    getChannelMessages,
    getPinnedMessages,
    loadPinnedMessages,
    loadMessageContext,
    sendChatMessage,
    setMessages,
    prependMessages,
    markAsRead,
    reactToMessage,
    togglePinMessage,
    deleteMessage,
    handleIncomingMessage,
    handleReadReceipt,
    handleReactionUpdate,
    handlePinUpdate,
    handleDeleteUpdate
  };
}

export const messagesStore = createMessagesStore();
