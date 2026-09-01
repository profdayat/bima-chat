import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { authMiddleware } from '../middleware/auth';

export const authRouter = new Elysia({ prefix: '/auth', detail: { tags: ['Auth'] } })
  .use(authMiddleware)
  .post('/login', async ({ body, jwt, error }) => {
    const { username, password } = body;

    const results = await db.select().from(schema.users).where(eq(schema.users.username, username));
    const user = results.at(0);
    
    if (!user) {
      return error(401, 'Invalid credentials');
    }

    if (user.isActive === 'false') {
      return error(403, 'Akun Anda dinonaktifkan oleh administrator.');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return error(401, 'Invalid credentials');
    }

    const token = await jwt.sign({
      userId: user.id,
      username: user.username
    });

    return { 
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
  .post('/register', async ({ body, jwt, error }) => {
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
      return error(400, `Registration failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  .get('/me', async ({ user, error }) => {
    if (!user) {
      return error(401, 'Unauthorized');
    }
    const fullUser = (await db.select().from(schema.users).where(eq(schema.users.id, user.id)))[0];
    if (!fullUser) {
      return error(404, 'User not found');
    }
    return {
      id: fullUser.id,
      username: fullUser.username,
      role: fullUser.role,
      displayName: fullUser.displayName || fullUser.username,
      avatarUrl: fullUser.avatarUrl,
      isActive: fullUser.isActive
    };
  })
  .put('/profile', async ({ user, body, error }) => {
    if (!user) {
      return error(401, 'Unauthorized');
    }

    try {
      const updated = await db.update(schema.users)
        .set({
          displayName: body.displayName,
          avatarUrl: body.avatarUrl
        })
        .where(eq(schema.users.id, user.id))
        .returning();

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
      return error(400, e.message || 'Gagal update profil');
    }
  }, {
    body: t.Object({
      displayName: t.String(),
      avatarUrl: t.Optional(t.String())
    })
  })
  .put('/password', async ({ user, body, error }) => {
    if (!user) {
      return error(401, 'Unauthorized');
    }

    const fullUser = (await db.select().from(schema.users).where(eq(schema.users.id, user.id)))[0];
    const validPassword = await bcrypt.compare(body.oldPassword, fullUser.passwordHash);
    if (!validPassword) {
      return error(400, 'Password lama salah.');
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
