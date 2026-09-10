import type { ChatMessage } from './message';
import type { Channel } from './channel';

export interface SendMessagePayload {
  message: string;
  senderName: string;
  replyToId?: string;
  attachments?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
}

export interface SendMessageResponse {
  messageId?: string;
  message?: ChatMessage;
}

export interface DirectMessageResponse extends Channel {
  targetUserId?: string;
}

export interface UploadResponse {
  url: string;
  name: string;
  type: string;
  size: number;
}
