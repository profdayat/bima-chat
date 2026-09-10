import { browser } from '$app/environment';
import { getApiBase } from '$lib/utils';
import { authStore } from './auth.svelte';

export function createPresenceStore() {
  let onlineUsers = $state<string[]>([]);
  let onlineUsernames = $state<Set<string>>(new Set());
  let onlineCount = $state(1);
  let typingUsersMap = $state<Record<string, string[]>>({});
  const typingClearTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  function isUserOnline(username?: string): boolean {
    if (!username) return false;
    return onlineUsernames.has(username);
  }

  function getTypingUsers(key?: string | null): string[] {
    if (!key) return [];
    return typingUsersMap[key] || [];
  }

  function isTypingInChannel(key?: string | null): boolean {
    if (!key) return false;
    return (typingUsersMap[key] || []).length > 0;
  }

  function setOnlineState(count: number, users: string[], globalUsers?: string[]): void {
    onlineCount = count;
    onlineUsers = users;
    if (globalUsers && Array.isArray(globalUsers)) {
      onlineUsernames = new Set(globalUsers);
    }
  }

  function updateUserPresence(username: string, isOnline: boolean): void {
    if (isOnline) {
      onlineUsernames.add(username);
    } else {
      onlineUsernames.delete(username);
    }
    onlineUsernames = new Set(onlineUsernames);
  }

  function handleTypingEvent(data: { username: string; isTyping: boolean; channelId?: string; aliasChannelId?: string }, activeKeys: string[]): void {
    if (data.username === authStore.currentUsername) return;

    for (const k of activeKeys) {
      if (!k) continue;
      const list = typingUsersMap[k] || [];
      if (data.isTyping) {
        if (!list.includes(data.username)) {
          typingUsersMap[k] = [...list, data.username];
        }
        const timerKey = `${k}_${data.username}`;
        if (typingClearTimers[timerKey]) clearTimeout(typingClearTimers[timerKey]);
        typingClearTimers[timerKey] = setTimeout(() => {
          if (typingUsersMap[k]) {
            typingUsersMap[k] = typingUsersMap[k].filter(u => u !== data.username);
          }
        }, 4000);
      } else {
        typingUsersMap[k] = list.filter(u => u !== data.username);
      }
    }
  }

  async function sendTyping(channelId: string, isTyping: boolean): Promise<void> {
    if (!browser || !channelId) return;
    try {
      const base = getApiBase();
      await fetch(`${base}/api/chat/typing/${channelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authStore.currentUsername,
          isTyping
        })
      });
    } catch {
      // Ignore network failure for typing signals
    }
  }

  return {
    get onlineUsers() {
      return onlineUsers;
    },
    get onlineUsernames() {
      return onlineUsernames;
    },
    get onlineCount() {
      return onlineCount;
    },
    get typingUsersMap() {
      return typingUsersMap;
    },
    isUserOnline,
    getTypingUsers,
    isTypingInChannel,
    setOnlineState,
    updateUserPresence,
    handleTypingEvent,
    sendTyping
  };
}

export const presenceStore = createPresenceStore();
