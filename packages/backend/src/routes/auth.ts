import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { authMiddleware } from '../middleware/auth';

export const authRouter = new Elysia({ prefix: '/auth', detail: { tags: ['Auth'] } })
  .use(authMiddleware)
  .post('/login', async ({ body, jwt, set }) => {
    const { username, password } = body;

    const results = await db.select().from(schema.users).where(eq(schema.users.username, username));
    const user = results.at(0);
    
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Username atau password salah.' };
    }

    if (user.isActive === 'false') {
      set.status = 403;
      return { success: false, message: 'Akun Anda dinonaktifkan oleh administrator.' };
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      set.status = 401;
      return { success: false, message: 'Username atau password salah.' };
    }

    const token = await jwt.sign({
      userId: user.id,
      username: user.username
    });

    return { 
      success: true,
      token, 
      user: { 
        id: user.id, 
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      } 
    };
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  .post('/register', async ({ body, jwt, set }) => {
    const { username, password } = body;

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // First user becomes admin automatically
    const existingUsers = await db.select().from(schema.users).limit(1);
    const role = existingUsers.length === 0 ? 'admin' : 'staff';

    try {
      const result = await db.insert(schema.users).values({ 
        username, 
        passwordHash,
        role,
        displayName: username
      }).returning();
      const user = result[0];
      
      const token = await jwt.sign({
        userId: user.id,
        username
      });

      return { 
        success: true,
        token, 
        user: { 
          id: user.id, 
          username,
          role: user.role,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        } 
      };
    } catch (e) {
      set.status = 400;
      return { success: false, message: `Pendaftaran gagal: ${e instanceof Error ? e.message : 'Unknown error'}` };
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  .get('/me', async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }
    const fullUser = (await db.select().from(schema.users).where(eq(schema.users.id, user.id)))[0];
    if (!fullUser) {
      set.status = 404;
      return { success: false, message: 'User tidak ditemukan' };
    }
    return {
      success: true,
      id: fullUser.id,
      username: fullUser.username,
      role: fullUser.role,
      displayName: fullUser.displayName || fullUser.username,
      avatarUrl: fullUser.avatarUrl,
      isActive: fullUser.isActive
    };
  })
  .put('/profile', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Sesi Anda telah berakhir. Silakan login kembali.' };
    }

    try {
      const updated = await db.update(schema.users)
        .set({
          displayName: body.displayName,
          avatarUrl: body.avatarUrl || null
        })
        .where(eq(schema.users.id, user.id))
        .returning();

      if (updated.length === 0) {
        set.status = 404;
        return { success: false, message: 'User tidak ditemukan di database.' };
      }

      return {
        success: true,
        user: {
          id: updated[0].id,
          username: updated[0].username,
          role: updated[0].role,
          displayName: updated[0].displayName,
          avatarUrl: updated[0].avatarUrl
        }
      };
    } catch (e: any) {
      set.status = 400;
      return { success: false, message: e.message || 'Gagal update profil' };
    }
  }, {
    body: t.Object({
      displayName: t.String(),
      avatarUrl: t.Optional(t.String())
    })
  })
  .put('/password', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    const fullUser = (await db.select().from(schema.users).where(eq(schema.users.id, user.id)))[0];
    if (!fullUser) {
      set.status = 404;
      return { success: false, message: 'User tidak ditemukan.' };
    }

    const validPassword = await bcrypt.compare(body.oldPassword, fullUser.passwordHash);
    if (!validPassword) {
      set.status = 400;
      return { success: false, message: 'Password lama salah.' };
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(body.newPassword, salt);

    await db.update(schema.users)
      .set({ passwordHash: newHash })
      .where(eq(schema.users.id, user.id));

    return { success: true, message: 'Password berhasil diganti.' };
  }, {
    body: t.Object({
      oldPassword: t.String(),
      newPassword: t.String()
    })
  });
