import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { logger } from "@bogeychan/elysia-logger";
import { chatRouter } from "./routes/chat";
import { webhookRouter } from "./routes/webhook";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import * as path from "path";
import * as fs from "fs";

const rootDir = process.env.MONOREPO_ROOT || '/app';
const uploadDir = path.join(rootDir, 'packages/frontend/static/uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = new Elysia()
  .use(cors())
  .use(logger())

  // Serve uploaded files at /uploads/:filename (outside /api prefix)
  .get('/uploads/:filename', ({ params: { filename } }) => {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response(Bun.file(filePath), {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      }
    });
  })

  // Also serve at /api/uploads/:filename for backwards compatibility
  .get('/api/uploads/:filename', ({ params: { filename } }) => {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response(Bun.file(filePath), {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      }
    });
  })

  // Mount API routes under /api prefix
  .group('/api', (api) =>
    api
      .use(swagger({ 
        documentation: { 
          info: { title: "BIMA Chat API", version: "1.0.0" },
          tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Chat', description: 'SSE realtime chat endpoints' },
            { name: 'Webhooks', description: 'Webhook integration endpoints' },
            { name: 'Admin', description: 'Admin management endpoints' }
          ]
        }
      }))
      .use(authRouter)
      .use(chatRouter)
      .use(webhookRouter)
      .use(adminRouter)
  );

app.listen(process.env.APP_PORT ?? 8080, () => {
  console.log(`🦊 Server started at ${app.server?.url.origin}`);
});

export type App = typeof app;
