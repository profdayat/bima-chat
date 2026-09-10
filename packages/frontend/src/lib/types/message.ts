export type MessageStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'error';
export type MessageType = 'message' | 'webhook_inbound' | 'system';

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  username: string;
}

export interface MessageSender {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  text: string;
  status: MessageStatus;
  replyToId?: string | null;
  attachments?: Attachment[] | null;
  reactions?: Reaction[];
  isPinned?: boolean;
  sender: MessageSender;
  timestamp: string;
  type?: MessageType | string;
}

export interface MessageGroup {
  key: string;
  dateLabel: string;
  messages: ChatMessage[];
}
