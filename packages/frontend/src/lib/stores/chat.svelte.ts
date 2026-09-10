// Re-export all domain types
export type {
  Channel,
  ChannelType,
  LastMessagePreview,
  User,
  UserRole,
  AuthUser,
  AuthResult,
  AuthResponse,
  ChatMessage,
  MessageStatus,
  MessageType,
  Attachment,
  Reaction,
  MessageSender,
  MessageGroup,
  TypingPayload,
  PresencePayload,
  AdminStats,
  SystemSettings
} from '$lib/types';

// Re-export utility functions for backward compatibility
export {
  formatWhatsAppTimestamp,
  formatDateHeader,
  formatMessageTime,
  playIncomingNotificationSound,
  getApiBase,
  getAuthHeaders
} from '$lib/utils';

// Import sub-stores
import { authStore } from './auth.svelte';
import { presenceStore } from './presence.svelte';
import { channelsStore } from './channels.svelte';
import { messagesStore } from './messages.svelte';
import { connectionStore } from './connection.svelte';
import { playIncomingNotificationSound } from '$lib/utils';
import type { ChatMessage, Attachment, Channel, User, AuthResult } from '$lib/types';

/**
 * Unified Chat Store Facade.
 * Aggregates Auth, Presence, Channels, Messages, and Connection stores
 * providing 100% backward-compatible API surface with strict TypeScript typing.
 */
export function createChatStoreFacade() {
  return {
    // --- Message State ---
    get messages(): ChatMessage[] {
      return messagesStore.getChannelMessages(connectionStore.activeChannelId);
    },
    get rawMessages(): Record<string, ChatMessage[]> {
      return messagesStore.rawMessages;
    },
    get replyingToMessage(): ChatMessage | null {
      return messagesStore.replyingToMessage;
    },
    set replyingToMessage(val: ChatMessage | null) {
      messagesStore.replyingToMessage = val;
    },
    get isSoundEnabled(): boolean {
      return messagesStore.isSoundEnabled;
    },
    toggleSound(): void {
      messagesStore.toggleSound();
    },
    playIncomingNotificationSound(): void {
      playIncomingNotificationSound(messagesStore.isSoundEnabled);
    },
    sendChatMessage(channelId: string, text: string, files: Attachment[] = [], replyToId?: string): Promise<boolean> {
      return messagesStore.sendChatMessage(channelId, text, files, replyToId);
    },
    setMessages(channelId: string, newMessages: ChatMessage[]): void {
      messagesStore.setMessages(channelId, newMessages);
    },
    prependMessages(channelId: string, olderMessages: ChatMessage[]): void {
      messagesStore.prependMessages(channelId, olderMessages);
    },
    markAsRead(channelId: string, messageIds: string[]): Promise<void> {
      return messagesStore.markAsRead(channelId, messageIds);
    },
    reactToMessage(messageId: string, emoji: string): Promise<void> {
      return messagesStore.reactToMessage(connectionStore.activeChannelId, messageId, emoji);
    },
    togglePinMessage(messageId: string, isPinned: boolean): Promise<void> {
      return messagesStore.togglePinMessage(connectionStore.activeChannelId, messageId, isPinned);
    },
    deleteMessage(messageId: string): Promise<void> {
      return messagesStore.deleteMessage(connectionStore.activeChannelId, messageId);
    },

    // --- Connection State ---
    get isConnected(): boolean {
      return connectionStore.isConnected;
    },
    get activeChannelId(): string | null {
      return connectionStore.activeChannelId;
    },
    connect(channelId: string): void {
      connectionStore.connect(channelId);
    },
    disconnect(): void {
      connectionStore.disconnect();
    },

    // --- Channel State ---
    get channels(): Channel[] {
      return channelsStore.channels;
    },
    set channels(val: Channel[]) {
      channelsStore.channels = val;
    },
    get isLoadingChannels(): boolean {
      return channelsStore.isLoadingChannels;
    },
    get usersList(): User[] {
      return channelsStore.usersList;
    },
    get isLoadingUsers(): boolean {
      return channelsStore.isLoadingUsers;
    },
    get systemSettings() {
      return channelsStore.systemSettings;
    },
    get isLoadingSettings(): boolean {
      return channelsStore.isLoadingSettings;
    },
    loadChannels(): Promise<void> {
      return channelsStore.loadChannels();
    },
    createChannel(name: string): Promise<Channel | null> {
      return channelsStore.createChannel(name);
    },
    loadUsers(): Promise<void> {
      return channelsStore.loadUsers();
    },
    startDirectMessage(targetUserId: string): Promise<Channel | null> {
      return channelsStore.startDirectMessage(targetUserId);
    },
    fetchChannelInfo(channelId: string): Promise<Channel | null> {
      return channelsStore.fetchChannelInfo(channelId);
    },
    loadSystemSettings(): Promise<void> {
      return channelsStore.loadSystemSettings();
    },

    // --- Auth State ---
    get authUser(): User | null {
      return authStore.authUser;
    },
    get authToken(): string | null {
      return authStore.authToken;
    },
    get guestNickname(): string {
      return authStore.guestNickname;
    },
    get currentUsername(): string {
      return authStore.currentUsername;
    },
    setGuestNickname(name: string): void {
      authStore.setGuestNickname(name);
    },
    login(username: string, password: string): Promise<AuthResult> {
      return authStore.login(username, password);
    },
    register(username: string, password: string): Promise<AuthResult> {
      return authStore.register(username, password);
    },
    updateProfile(displayName: string, avatarUrl?: string): Promise<AuthResult> {
      return authStore.updateProfile(displayName, avatarUrl);
    },
    logout(): void {
      authStore.logout();
    },

    // --- Presence State ---
    get onlineUsers(): string[] {
      return presenceStore.onlineUsers;
    },
    get onlineUsernames(): Set<string> {
      return presenceStore.onlineUsernames;
    },
    get onlineCount(): number {
      return presenceStore.onlineCount;
    },
    isUserOnline(username?: string): boolean {
      return presenceStore.isUserOnline(username);
    },
    get currentTypingUsers(): string[] {
      return connectionStore.activeChannelId ? presenceStore.getTypingUsers(connectionStore.activeChannelId) : [];
    },
    getTypingUsers(key?: string | null): string[] {
      return presenceStore.getTypingUsers(key);
    },
    isTypingInChannel(key?: string | null): boolean {
      return presenceStore.isTypingInChannel(key);
    },
    sendTyping(channelId: string, isTyping: boolean): Promise<void> {
      return presenceStore.sendTyping(channelId, isTyping);
    }
  };
}

export const chatStore = createChatStoreFacade();
export { authStore, presenceStore, channelsStore, messagesStore, connectionStore };
