/**
 * IndexedDB Local Cache for Chat Messages (WhatsApp/Telegram Local-First Pattern)
 * 
 * Provides instant message loading from browser storage without network roundtrips.
 * Messages are cached per-channel and synced incrementally via delta updates.
 */
import { browser } from '$app/environment';

const DB_NAME = 'bima_chat_db';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';
const META_STORE = 'meta';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (!browser) return Promise.reject(new Error('IndexedDB not available on server'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Messages store: keyed by message id, indexed by channelId + timestamp
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const msgStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        msgStore.createIndex('channelId', 'channelId', { unique: false });
        msgStore.createIndex('channelId_timestamp', ['channelId', 'timestamp'], { unique: false });
      }

      // Meta store: per-channel metadata (last sync timestamp, etc.)
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database');
      reject(request.error);
    };
  });
}

/**
 * Save messages to IndexedDB (upsert - insert or update)
 */
export async function saveMessagesToLocal(messages: any[]): Promise<void> {
  if (!browser || messages.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);

    for (const msg of messages) {
      store.put(msg);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[IndexedDB] saveMessagesToLocal failed:', e);
  }
}

/**
 * Load cached messages for a channel from IndexedDB (sorted by timestamp asc)
 */
export async function loadMessagesFromLocal(channelId: string, limit: number = 30): Promise<any[]> {
  if (!browser) return [];
  try {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, 'readonly');
    const store = tx.objectStore(MESSAGES_STORE);
    const index = store.index('channelId');
    const range = IDBKeyRange.only(channelId);

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const request = index.openCursor(range, 'prev'); // newest first

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results.reverse()); // Return oldest-first order
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('[IndexedDB] loadMessagesFromLocal failed:', e);
    return [];
  }
}

/**
 * Get the latest message timestamp for a channel (for delta sync)
 */
export async function getLastSyncTimestamp(channelId: string): Promise<string | null> {
  if (!browser) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(`lastSync:${channelId}`);
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Update the last sync timestamp for a channel
 */
export async function setLastSyncTimestamp(channelId: string, timestamp: string): Promise<void> {
  if (!browser) return;
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    store.put({ key: `lastSync:${channelId}`, value: timestamp });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[IndexedDB] setLastSyncTimestamp failed:', e);
  }
}

/**
 * Delete a single message from local cache
 */
export async function deleteMessageFromLocal(messageId: string): Promise<void> {
  if (!browser) return;
  try {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);
    store.delete(messageId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[IndexedDB] deleteMessageFromLocal failed:', e);
  }
}

/**
 * Update a single message in local cache (e.g. reactions, pin status)
 */
export async function updateMessageInLocal(messageId: string, updates: Partial<any>): Promise<void> {
  if (!browser) return;
  try {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);

    return new Promise((resolve, reject) => {
      const getReq = store.get(messageId);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.put({ ...getReq.result, ...updates });
        }
        tx.oncomplete = () => resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[IndexedDB] updateMessageInLocal failed:', e);
  }
}

/**
 * Clear all cached messages for a specific channel
 */
export async function clearChannelMessages(channelId: string): Promise<void> {
  if (!browser) return;
  try {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, 'readwrite');
    const store = tx.objectStore(MESSAGES_STORE);
    const index = store.index('channelId');
    const range = IDBKeyRange.only(channelId);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[IndexedDB] clearChannelMessages failed:', e);
  }
}
