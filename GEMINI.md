# GEMINI.md — bima-chat

## Project Overview

**bima-chat** is an internal real-time messaging app for RSUD Bangil (hospital).
Monorepo: `packages/frontend` (SvelteKit + Svelte 5 + Tailwind v3 + Flowbite-Svelte) and `packages/backend` (ElysiaJS + Drizzle + PostgreSQL + Redis).

Runtime: **Bun**. Use `bun install`, `bun run dev`, `bun run build`.

## Stack Constraints

- Frontend: SvelteKit (NOT React/Next.js)
- Styling: Tailwind CSS v3 + Flowbite plugin
- Components: Flowbite-Svelte
- Backend: ElysiaJS
- ORM: Drizzle ORM

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
