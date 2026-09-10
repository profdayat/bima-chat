export interface TypingPayload {
  channelId: string;
  username: string;
  isTyping: boolean;
  aliasChannelId?: string;
}

export type PresenceEventType = 'connected' | 'presence' | 'user_presence' | 'heartbeat' | 'typing' | 'read_receipt' | 'reaction' | 'pin' | 'delete' | 'message' | 'webhook_inbound';

export interface PresencePayload {
  type: PresenceEventType;
  channelId?: string;
  channelName?: string;
  aliasChannelId?: string;
  onlineCount?: number;
  onlineUsers?: string[];
  globalOnlineUsers?: string[];
  username?: string;
  isOnline?: boolean;
}
