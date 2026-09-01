import crypto from 'crypto';

interface WebhookPayload {
  channelId: string;
  messageId: string;
  text?: string;
  sender?: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export const dispatchOutboundWebhook = async (url: string, secret: string, payload: WebhookPayload, attempt = 1) => {
  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${signature}`
      },
      body: payloadString,
      // Timeout after 5s
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log(`Successfully dispatched webhook to ${url}`);
  } catch (error) {
    console.error(`Failed to dispatch webhook to ${url} (Attempt ${attempt}):`, error);
    
    // Retry logic: 3 attempts with exponential backoff
    if (attempt < 3) {
      const backoffDelay = Math.pow(2, attempt) * 1000;
      setTimeout(() => {
        dispatchOutboundWebhook(url, secret, payload, attempt + 1);
      }, backoffDelay);
    } else {
      console.error(`Max retries reached for webhook ${url}`);
    }
  }
};
