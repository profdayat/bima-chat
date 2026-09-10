import { browser } from '$app/environment';
import { getApiBase } from '$lib/utils';
import { authStore } from './auth.svelte';
import { presenceStore } from './presence.svelte';
import { channelsStore } from './channels.svelte';
import { messagesStore } from './messages.svelte';

export function createConnectionStore() {
  let isConnected = $state(false);
  let activeChannelId = $state<string | null>(null);
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;

  function resetHeartbeatWatchdog(channelId: string) {
    if (heartbeatWatchdog) clearTimeout(heartbeatWatchdog);
    heartbeatWatchdog = setTimeout(() => {
      console.warn('⚠️ SSE Heartbeat timeout for channel:', channelId, 'Reconnecting...');
      if (activeChannelId === channelId) {
        connect(channelId);
      }
    }, 45000);
  }

  function notifyPresenceLeave(): void {
    if (!browser || !authStore.currentUsername) return;
    try {
      const base = getApiBase();
      const payload = JSON.stringify({ username: authStore.currentUsername });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${base}/api/chat/presence/leave`, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(`${base}/api/chat/presence/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  // Register window lifecycle hooks
  if (browser) {
    window.addEventListener('beforeunload', () => {
      notifyPresenceLeave();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Tab hidden
      } else if (document.visibilityState === 'visible') {
        if (!isConnected && activeChannelId) {
          connect(activeChannelId);
        }
      }
    });
  }

  function connect(channelId: string): void {
    if (!browser) return;
    const canonId = channelsStore.getCanonicalId(channelId);
    if (eventSource && isConnected && (activeChannelId === channelId || (canonId && activeChannelId === canonId))) {
      return;
    }

    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    activeChannelId = channelId;

    const base = getApiBase();
    const url = `${base}/api/chat/sse/${encodeURIComponent(channelId)}?username=${encodeURIComponent(authStore.currentUsername)}`;
    eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onopen = () => {
      isConnected = true;
      resetHeartbeatWatchdog(channelId);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const canon = channelsStore.getCanonicalId(data.channelId || channelId);

        if (data.type === 'connected') {
          isConnected = true;
          if (data.channelId) {
            channelsStore.registerAlias(channelId, data.channelId);
            activeChannelId = data.channelId;
          }
          presenceStore.setOnlineState(
            data.onlineCount || 1,
            data.onlineUsers || [],
            data.globalOnlineUsers
          );
          return;
        }

        if (data.type === 'heartbeat') {
          isConnected = true;
          resetHeartbeatWatchdog(channelId);
          return;
        }

        if (data.type === 'presence') {
          presenceStore.setOnlineState(
            data.onlineCount || 1,
            data.onlineUsers || [],
            data.globalOnlineUsers
          );
          return;
        }

        if (data.type === 'user_presence') {
          if (data.username) {
            presenceStore.updateUserPresence(data.username, Boolean(data.isOnline));
          }
          return;
        }

        if (data.type === 'typing') {
          const keys = Array.from(new Set([
            channelId,
            canon,
            data.channelId,
            data.aliasChannelId,
            data.username,
            activeChannelId
          ].filter(Boolean) as string[]));
          presenceStore.handleTypingEvent(data, keys);
          return;
        }

        if (data.type === 'read_receipt') {
          const resolvedKeys = Array.from(new Set([
            channelId,
            canon,
            data.channelId,
            data.aliasChannelId
          ].filter(Boolean) as string[]));
          messagesStore.handleReadReceipt(data, resolvedKeys);
          return;
        }

        if (data.type === 'reaction') {
          const resolvedKeys = Array.from(new Set([channelId, canon].filter(Boolean) as string[]));
          messagesStore.handleReactionUpdate(data, resolvedKeys);
          return;
        }

        if (data.type === 'pin') {
          const resolvedKeys = Array.from(new Set([channelId, canon].filter(Boolean) as string[]));
          messagesStore.handlePinUpdate(data, resolvedKeys);
          return;
        }

        if (data.type === 'delete') {
          const resolvedKeys = Array.from(new Set([channelId, canon].filter(Boolean) as string[]));
          messagesStore.handleDeleteUpdate(data, resolvedKeys);
          return;
        }

        if (data.type === 'message' || data.type === 'webhook_inbound') {
          messagesStore.handleIncomingMessage(data, channelId, canon);
        }
      } catch (e) {
        console.error('Failed to parse SSE message', e);
      }
    };

    eventSource.onerror = () => {
      isConnected = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        if (activeChannelId && browser) {
          console.log('🔄 Reconnecting SSE for channel:', activeChannelId);
          connect(activeChannelId);
        }
      }, 2000);
    };
  }

  function disconnect(): void {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (heartbeatWatchdog) clearTimeout(heartbeatWatchdog);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    isConnected = false;
  }

  return {
    get isConnected() {
      return isConnected;
    },
    get activeChannelId() {
      return activeChannelId;
    },
    connect,
    disconnect
  };
}

export const connectionStore = createConnectionStore();
