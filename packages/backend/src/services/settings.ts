import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { getCacheJson, setCacheJson, delCacheKeys } from './cache';

const SETTINGS_CACHE_KEY = 'cache:system_settings:all';

export interface SystemSettingsPayload {
  allowGuest: boolean;
  allowRegistration: boolean;
}

export async function getSystemSettings(): Promise<SystemSettingsPayload> {
  const cached = await getCacheJson<SystemSettingsPayload>(SETTINGS_CACHE_KEY);
  if (cached) return cached;

  try {
    const rows = await db.select().from(schema.systemSettings);
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }

    const payload: SystemSettingsPayload = {
      allowGuest: map['allow_guest'] !== 'false',
      allowRegistration: map['allow_registration'] !== 'false'
    };

    await setCacheJson(SETTINGS_CACHE_KEY, payload, 3600); // 1 hour cache
    return payload;
  } catch (e) {
    console.error('Failed to get system settings:', e);
    return {
      allowGuest: true,
      allowRegistration: true
    };
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettingsPayload>): Promise<SystemSettingsPayload> {
  if (typeof settings.allowGuest === 'boolean') {
    await db.insert(schema.systemSettings)
      .values({
        key: 'allow_guest',
        value: String(settings.allowGuest),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: schema.systemSettings.key,
        set: {
          value: String(settings.allowGuest),
          updatedAt: new Date()
        }
      });
  }

  if (typeof settings.allowRegistration === 'boolean') {
    await db.insert(schema.systemSettings)
      .values({
        key: 'allow_registration',
        value: String(settings.allowRegistration),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: schema.systemSettings.key,
        set: {
          value: String(settings.allowRegistration),
          updatedAt: new Date()
        }
      });
  }

  await delCacheKeys(SETTINGS_CACHE_KEY);
  return getSystemSettings();
}
