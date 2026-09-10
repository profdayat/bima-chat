import { browser } from '$app/environment';
import type { Channel, User, SystemSettings, LastMessagePreview } from '$lib/types';
import { getApiBase, getAuthHeaders } from '$lib/utils';
import { authStore } from './auth.svelte';
import { presenceStore } from './presence.svelte';

export function createChannelsStore() {
  let channels = $state<Channel[]>([]);
  let isLoadingChannels = $state(false);
  let usersList = $state<User[]>([]);
  let isLoadingUsers = $state(false);
  let systemSettings = $state<SystemSettings>({ allowGuest: true, allowRegistration: true });
  let isLoadingSettings = $state(false);

  // Local alias mapping (e.g. channelName <-> UUID)
  const channelAliasMap: Record<string, string> = {};

  function registerAlias(id1: string, id2: string): void {
    if (!id1 || !id2 || id1 === id2) return;
    channelAliasMap[id1] = id2;
    channelAliasMap[id2] = id1;
  }

  function getCanonicalId(idOrName?: string | null): string {
    if (!idOrName) return '';
    const match = channels.find(c => c.id === idOrName || c.name === idOrName);
    return match ? match.id : (channelAliasMap[idOrName] || idOrName);
  }

  async function loadChannels(): Promise<void> {
    if (browser && channels.length === 0) {
      const cached = localStorage.getItem('rsud_cached_channels');
      if (cached) {
        try {
          channels = JSON.parse(cached) as Channel[];
          isLoadingChannels = false;
        } catch {
          // ignore corrupted cache
        }
      }
    }
    isLoadingChannels = channels.length === 0;

    try {
      const base = getApiBase();

      // Fetch initial active online presence list
      fetch(`${base}/api/chat/presence`)
        .then(r => r.json())
        .then((d: { onlineUsers?: string[] }) => {
          if (d.onlineUsers && Array.isArray(d.onlineUsers)) {
            presenceStore.setOnlineState(d.onlineUsers.length, d.onlineUsers, d.onlineUsers);
          }
        })
        .catch(() => {});

      const res = await fetch(`${base}/api/chat/channels`);
      let publicChannels: Channel[] = [];
      if (res.ok) {
        publicChannels = (await res.json()) as Channel[];
      }

      // If user is logged in, fetch direct messages
      const currentUserId = authStore.authUser?.id;
      let myDms: Channel[] = [];
      if (currentUserId) {
        try {
          const dmRes = await fetch(`${base}/api/chat/my-dms?userId=${encodeURIComponent(currentUserId)}`);
          if (dmRes.ok) {
            myDms = (await dmRes.json()) as Channel[];
          }
        } catch (e) {
          console.error('Failed to load my-dms', e);
        }
      }

      const combined = [...publicChannels];
      for (const dm of myDms) {
        if (!combined.some(c => c.id === dm.id)) {
          combined.push(dm);
        }
      }

      // Sort chronologically by latest message or creation
      combined.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      channels = combined;
      if (browser) {
        localStorage.setItem('rsud_cached_channels', JSON.stringify(combined));
      }
    } catch (e) {
      console.error('Failed to load channels', e);
    } finally {
      isLoadingChannels = false;
    }
  }

  async function createChannel(name: string): Promise<Channel | null> {
    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);

      const res = await fetch(`${base}/api/chat/channels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newChan = (await res.json()) as Channel;
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

  async function loadUsers(): Promise<void> {
    if (!browser) return;
    if (usersList.length === 0) {
      const cached = localStorage.getItem('rsud_cached_users');
      if (cached) {
        try {
          usersList = JSON.parse(cached) as User[];
        } catch {}
      }
    }
    isLoadingUsers = true;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/chat/users`);
      if (res.ok) {
        const data = (await res.json()) as User[];
        usersList = data;
        if (browser) {
          localStorage.setItem('rsud_cached_users', JSON.stringify(data));
        }
      }
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      isLoadingUsers = false;
    }
  }

  async function startDirectMessage(targetUserId: string): Promise<Channel | null> {
    if (!browser) return null;
    try {
      const base = getApiBase();
      const currentUserId = authStore.authUser?.id || usersList.find(u => u.username === authStore.currentUsername)?.id;
      if (!currentUserId || currentUserId === targetUserId) return null;

      const headers = getAuthHeaders(authStore.authToken);
      const res = await fetch(`${base}/api/chat/dm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetUserId, currentUserId })
      });

      if (res.ok) {
        const dmChan = (await res.json()) as Channel;
        if (!channels.some(c => c.id === dmChan.id)) {
          channels = [...channels, dmChan];
        }
        return dmChan;
      }
    } catch (e) {
      console.error('Failed to start DM', e);
    }
    return null;
  }

  async function fetchChannelInfo(channelId: string): Promise<Channel | null> {
    if (!browser || !channelId) return null;
    const current = authStore.currentUsername;
    const myId = authStore.authUser?.id || '';
    const existing = channels.find(c => c.id === channelId || c.name === channelId);
    if (existing && existing.type && (!existing.targetUser || (existing.targetUser.username !== current && existing.targetUser.id !== myId))) {
      return existing;
    }

    try {
      const base = getApiBase();
      const headers = getAuthHeaders(authStore.authToken);
      const res = await fetch(`${base}/api/chat/channel/${encodeURIComponent(channelId)}?username=${encodeURIComponent(current)}&userId=${encodeURIComponent(myId)}`, { headers });
      if (res.ok) {
        const chanData = (await res.json()) as Channel;
        const safeTargetUser = (chanData.targetUser && (chanData.targetUser.username === current || chanData.targetUser.id === myId))
          ? null
          : chanData.targetUser;

        const formatted: Channel = {
          id: chanData.id,
          name: chanData.name,
          type: chanData.type,
          description: chanData.description,
          createdAt: chanData.createdAt,
          targetUser: safeTargetUser || existing?.targetUser || null
        };

        const idx = channels.findIndex(c => c.id === formatted.id);
        if (idx !== -1) {
          channels[idx] = { ...channels[idx], ...formatted };
          channels = [...channels];
        } else {
          channels = [...channels, formatted];
        }
        return formatted;
      }
    } catch (e) {
      console.error('Failed to fetch channel info', e);
    }
    return null;
  }

  function updateChannelLastMessage(channelMatchKeys: string[], preview: LastMessagePreview): void {
    const chMatch = channels.find(c => channelMatchKeys.includes(c.id) || channelMatchKeys.includes(c.name));
    if (chMatch) {
      chMatch.lastMessage = preview;
      channels = [...channels].sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
    }
  }

  async function loadSystemSettings(): Promise<void> {
    isLoadingSettings = true;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/settings/public`);
      if (res.ok) {
        const data = (await res.json()) as { allowGuest?: boolean; allowRegistration?: boolean };
        systemSettings = {
          allowGuest: data.allowGuest !== false,
          allowRegistration: data.allowRegistration !== false
        };
      }
    } catch (e) {
      console.error('Failed to load system settings', e);
    } finally {
      isLoadingSettings = false;
    }
  }

  return {
    get channels() {
      return channels;
    },
    set channels(val: Channel[]) {
      channels = val;
    },
    get isLoadingChannels() {
      return isLoadingChannels;
    },
    get usersList() {
      return usersList;
    },
    get isLoadingUsers() {
      return isLoadingUsers;
    },
    get systemSettings() {
      return systemSettings;
    },
    get isLoadingSettings() {
      return isLoadingSettings;
    },
    getCanonicalId,
    registerAlias,
    loadChannels,
    createChannel,
    loadUsers,
    startDirectMessage,
    fetchChannelInfo,
    updateChannelLastMessage,
    loadSystemSettings
  };
}

export const channelsStore = createChannelsStore();
