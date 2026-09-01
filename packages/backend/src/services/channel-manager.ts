import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisPub = new Redis(REDIS_URL);
export const redisSub = new Redis(REDIS_URL);

// In-memory set of functions to send data to active SSE streams for a channel
export const channels: Record<string, Set<(data: any) => void>> = {};

// Subscribe to Redis to fan-out messages to local SSE connections
redisSub.subscribe('chat_events', (err, count) => {
  if (err) {
    console.error('Failed to subscribe: %s', err.message);
  }
});

redisSub.on('message', (channel, messageStr) => {
  if (channel === 'chat_events') {
    try {
      const payload = JSON.parse(messageStr);
      const { channelId, data } = payload;
      
      // Fan-out to all local subscribers in this channel
      if (channels[channelId]) {
        channels[channelId].forEach((send) => send(data));
      }
    } catch (e) {
      console.error('Error parsing redis message', e);
    }
  }
});

export const publishToChannel = (channelId: string, data: any) => {
  const payload = { channelId, data };
  redisPub.publish('chat_events', JSON.stringify(payload));
};
