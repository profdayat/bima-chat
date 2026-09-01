/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const CACHE_NAME = `bima-chat-cache-${version}`;
const ASSETS = [...build, ...files];

const sw = self as unknown as ServiceWorkerGlobalScope;

// Install event - Cache static assets
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      sw.skipWaiting();
    })
  );
});

// Activate event - Clean up old caches
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      for (const key of keys) {
        if (key !== CACHE_NAME) {
          await caches.delete(key);
        }
      }
      await sw.clients.claim();
    })
  );
});

// Fetch event - Cache-first or network fallback
sw.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't intercept API calls or SSE streams
  if (url.pathname.startsWith('/api') || url.pathname.includes('/sse')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback for offline single-page-app routing
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    }) as Promise<Response>
  );
});

// Push notifications event
sw.addEventListener('push', (event) => {
  if (!(sw.Notification && sw.Notification.permission === 'granted')) {
    return;
  }

  let data = { title: 'Pesan Baru BIMA Chat', body: 'Anda mendapatkan pesan baru.', channelId: 'general' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // Fallback to text data if not json
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      channelId: data.channelId || 'general'
    },
    actions: [
      { action: 'open', title: 'Buka Chat' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    sw.registration.showNotification(data.title, options)
  );
});

// Notification click event
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const channelId = event.notification.data?.channelId || 'general';
  const targetUrl = `/chat/${channelId}`;

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find window that is already open on targetUrl or chat
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname.startsWith('/chat')) {
          return client.focus().then(() => {
            if (client.navigate) {
              return client.navigate(targetUrl);
            }
          });
        }
      }
      
      // If no window open, open new one
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(targetUrl);
      }
    })
  );
});
