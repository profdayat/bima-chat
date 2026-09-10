import type { Attachment } from './message';
import type { User } from './user';

export type ChannelType = 'public' | 'private' | 'dm';

export interface LastMessagePreview {
  text: string;
  senderName?: string;
  attachments?: Attachment[] | null;
  createdAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  type?: ChannelType | string;
  description?: string;
  targetUser?: User | null;
  createdAt: string;
  lastMessage?: LastMessagePreview | null;
  unreadCount?: number;
}
