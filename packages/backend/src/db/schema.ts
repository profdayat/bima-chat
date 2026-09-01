import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('staff').notNull(), // 'admin' | 'moderator' | 'staff'
  avatarUrl: text('avatar_url'),
  displayName: text('display_name'),
  isActive: text('is_active').default('true').notNull(), // 'true' | 'false'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').default('public').notNull(), // 'public' | 'private'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').references(() => channels.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id),
  senderName: text('sender_name'),
  content: text('content').notNull(),
  type: text('type').default('message').notNull(),
  status: text('status').default('sent').notNull(), // 'sent' | 'delivered' | 'read'
  replyToId: uuid('reply_to_id'), // Self reference for replies
  isPinned: text('is_pinned').default('false').notNull(), // 'true' | 'false'
  attachments: text('attachments'), // JSON stringified array of files: [{url, name, type, size}]
  reactions: text('reactions'), // JSON stringified array of reactions: [{emoji, username}]
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').references(() => channels.id).notNull(),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  direction: text('direction').notNull(), // 'inbound' or 'outbound'
  active: text('active').default('true').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
}));
