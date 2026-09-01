import { Elysia, t } from 'elysia';
import { db } from '../db';
import * as schema from '../db/schema';
import { publishToChannel } from '../services/channel-manager';
import crypto from 'crypto';

export const webhookRouter = new Elysia({ prefix: '/webhook', detail: { tags: ['Webhooks'] } })
  .post('/inbound', async ({ body, headers, error }) => {
    const { channelId, source, data } = body;

    // Save webhook message
    const result = await db.insert(schema.messages).values({
      channelId,
      content: typeof data === 'string' ? data : JSON.stringify(data),
      type: 'webhook_inbound',
    }).returning();
    
    const savedMessage = result[0];

    const messagePayload = {
      type: 'webhook_inbound',
      channelId,
      id: savedMessage.id,
      source,
      data,
      timestamp: savedMessage.createdAt,
    };

    publishToChannel(channelId, messagePayload);

    return { status: 'received', messageId: savedMessage.id };
  }, {
    body: t.Object({
      channelId: t.String(),
      source: t.String(),
      data: t.Any(),
    }),
  })
  .post('/outbound/register', async ({ body, error }) => {
    try {
      const result = await db.insert(schema.webhookEndpoints).values({
        channelId: body.channelId,
        url: body.url,
        secret: body.secret,
        direction: 'outbound'
      }).returning();
      
      return result[0];
    } catch (e) {
      return error(400, 'Failed to register webhook');
    }
  }, {
    body: t.Object({
      channelId: t.String(),
      url: t.String(),
      secret: t.String()
    })
  });
