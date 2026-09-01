import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api')) {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:8080';
    const targetUrl = `${backendUrl}${event.url.pathname}${event.url.search}`;

    const headers = new Headers(event.request.headers);
    headers.delete('host');

    try {
      const response = await fetch(targetUrl, {
        method: event.request.method,
        headers,
        body: event.request.method !== 'GET' && event.request.method !== 'HEAD' 
          ? await event.request.arrayBuffer() 
          : undefined,
        // @ts-ignore
        duplex: 'half'
      });

      return response;
    } catch (e) {
      console.error(`[API Proxy Error] ${event.request.method} ${event.url.pathname}:`, e);
      return new Response(JSON.stringify({ error: 'Backend unreachable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return resolve(event);
};
