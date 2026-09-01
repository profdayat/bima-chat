import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const authMiddleware = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-secret-key-min-32-chars',
      exp: '30d'
    })
  )
  .derive(async ({ jwt, headers, error }) => {
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null };
    }
    
    const token = authHeader.split(' ')[1];
    const payload = await jwt.verify(token);
    
    if (!payload) {
      return { user: null };
    }
    
    return {
      user: {
        id: payload.userId as string,
        username: payload.username as string
      }
    };
  })
  .macro(({ isAuth }) => ({
    beforeHandle({ user, error }) {
      if (isAuth && !user) {
        return error(401, 'Unauthorized');
      }
    }
  }));
