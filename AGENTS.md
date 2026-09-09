# AGENTS.md — bima-chat

## Project Overview

**bima-chat** is an internal real-time messaging app for RSUD Bangil (hospital).
Monorepo with two packages:

- **`packages/frontend`** — SvelteKit 2 + Svelte 5 + Tailwind CSS v3 + Flowbite-Svelte
- **`packages/backend`** — ElysiaJS + Drizzle ORM + PostgreSQL + Redis (ioredis)

Runtime: **Bun**. No npm/yarn — use `bun` everywhere.

## Stack (Do Not Change)

- **Frontend:** SvelteKit (NOT React, NOT Next.js)
- **Styling:** Tailwind CSS v3 with Flowbite plugin (NOT Tailwind v4)
- **Components:** Flowbite-Svelte (NOT shadcn, NOT Radix)
- **Icons:** flowbite-svelte-icons
- **Backend:** ElysiaJS (NOT Express, NOT Fastify)
- **ORM:** Drizzle ORM with PostgreSQL
- **Package manager:** Bun
- **Linting:** Biome (backend), ESLint + Prettier (frontend)

## Build & Dev Commands (via Makefile + Docker Compose)

```bash
# Production: build & run semua service (Blue-Green)
make up

# Development: hot-reload mode (standalone backend + frontend + db)
make dev

# Stop development
make dev-stop

# Update: git pull + zero-downtime blue-green deploy
make update

# Rebuild images
make build

# Stop semua service
make down

# Restart tanpa rebuild
make restart

# Lihat live logs
make logs

# Cek status container & port
make ps

# Backup database PostgreSQL
make backup
```

> **Catatan:** Semua operasi build/run melalui Docker Compose via Makefile.
> Bun digunakan hanya di dalam container, bukan langsung di host.
> Untuk local development tanpa Docker, gunakan `bun install` lalu `bun run dev` di root.

## Code Standards

- TypeScript strict mode
- Svelte 5 runes syntax (`$state`, `$derived`, `$effect`)
- Server-side rendering via SvelteKit
- API types shared via Eden Treaty (`@elysiajs/eden`)
- Database schema in Drizzle format

## Design Direction

For UI, copy, and visual decisions, read `DESIGN.md` for direction.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read the core filter and then the skill for the task:
- Core: `.agents/skills/antislop/SKILL.md`
- UI / visual: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `.agents/skills/antislop-code/SKILL.md`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->
