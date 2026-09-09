import { Elysia } from 'elysia';
import { getSystemSettings } from '../services/settings';

export const settingsRouter = new Elysia({ prefix: '/settings', detail: { tags: ['Settings'] } })
  .get('/public', async () => {
    const settings = await getSystemSettings();
    return {
      success: true,
      allowGuest: settings.allowGuest,
      allowRegistration: settings.allowRegistration
    };
  });
