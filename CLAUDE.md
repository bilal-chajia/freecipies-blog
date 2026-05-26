# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Freecipies Blog — a recipe/food blog SaaS platform. Single Astro deployment with a public server-rendered site, a React admin SPA, and Cloudflare-backed API, all in one repo.

## Stack

- **Framework:** Astro 6.3.3 + React 19 + Tailwind CSS 4 + Drizzle ORM + Zod 4
- **Database:** Cloudflare D1 (SQLite) via Drizzle ORM
- **Storage:** Cloudflare R2 (images), KV (sessions)
- **Runtime:** Cloudflare Workers via `@astrojs/cloudflare`
- **State:** Zustand (admin), React Hook Form + Zod (validation)
- **TypeScript & Packages:** TypeScript 6 (strict), `pnpm` only

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Local dev server (port 4321, no D1/R2/KV bindings) |
| `pnpm preview` | Build + Wrangler dev (required for D1/R2/KV testing) |
| `pnpm build` | Production bundle (`node scripts/build.mjs`) — **never run without asking** |
| `pnpm test` | Vitest suite |
| `pnpm check:boundaries` | Enforce module boundary rules (site↔admin↔server) |

## Architecture

```
src/
├── pages/        Astro routes + thin API entry points
│   ├── api/      API route files — delegate to handlers, keep thin
│   └── admin/    [...path].astro mounts the React SPA
├── modules/      Domain logic (each module: schema/, service/, types/)
│   ├── articles/ authors/ categories/ tags/ media/ equipment/
│   ├── auth/     ai/   content-blocks/ settings/ menus/
│   └── templates/ pinterest/ redirects/
├── server/       API handlers, auth guards, Cloudflare binding access, site-data loaders
│   ├── api/      Handler implementations (mirrors pages/api/ structure)
│   ├── cloudflare/ Cloudflare service wrappers
│   └── site-data/ Static data loaders
├── admin/        React SPA (Radix + shadcn + react-router-dom)
│   ├── app/      Routes, providers, layout shell
│   ├── features/ Feature modules (articles, media, settings, etc.)
│   ├── components/ Shared React components
│   ├── services/ API client functions
│   ├── store/    Zustand stores
│   ├── ui/       shadcn/ui components
│   ├── hooks/    Custom React hooks
│   ├── styles/   Admin theme CSS
│   └── utils/    Admin-only utilities
├── site/         Public Astro UI
│   ├── components/  Astro + React island components
│   ├── layouts/     Page layouts
│   ├── scripts/     Client JS
│   ├── styles/      Theme CSS + design tokens
│   └── utils/       Site utilities
└── shared/       Cross-cutting single source of truth
    ├── database/  Drizzle client + combined schema
    ├── types/     TypeScript types (images.ts is the image contract)
    ├── images/    Image contract helpers
    ├── validation/ Zod schemas
    ├── constants/  App constants
    └── utils/     Error handler, formatting, etc.
```

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `src/admin/*`
- `@modules/*` → `src/modules/*`
- `@admin/*` → `src/admin/*`
- `@site/*` → `src/site/*`
- `@server/*` → `src/server/*`
- `@shared/*` → `src/shared/*`
- `@components/*` → `src/site/components/*`
- `@layouts/*` → `src/site/layouts/*`
- `@styles/*` → `src/site/styles/*`

## Critical Rules

### Boundaries (enforced by `pnpm check:boundaries`)

- `src/site` must not access Cloudflare bindings directly
- `src/admin` must not import from `@server/` or access Cloudflare bindings
- `src/modules` must stay domain-only — no UI component imports, no Cloudflare imports
- Admin UI must not depend on `r2_key` fields
- API route files in `src/pages/api/` must be thin — delegate to `src/server/api/`

### Database

- Drizzle ORM only — no raw SQL in application code
- `db/schema.sql` is the executable source of truth for D1
- Schemas live in `src/modules/{domain}/schema/`
- Soft deletes everywhere: `deleted_at IS NULL` in all queries
- All timestamps in UTC

### Naming

- SQL columns and serialized JSON: `snake_case`
- TypeScript/JSX code: `camelCase`
- See `docs/NAMING_CONTRACT.md` for full rules

### Images

- Image types imported exclusively from `@shared/images/image-contract.ts`
- Never expose `r2_key` to frontend — resolve to public `url` at server layer
- All `<img>` tags must include `width`, `height`, `loading="lazy"`

### API Responses

- Use `formatSuccessResponse` / `formatErrorResponse` from `@shared/utils/error-handler.ts`
- JSON payloads use `snake_case` keys
- Validate inputs with Zod

### TypeScript

- Strict mode, no `any`
- Convert `null` → `undefined` for optional React props
- Use path aliases, not relative imports across boundaries

## Contracts (Source of Truth)

The `docs/` directory contains canonical system contracts. **Read the relevant contract before modifying any table, JSON shape, or naming convention.** Key contracts:

| File | Covers |
|---|---|
| `NAMING_CONTRACT.md` | snake_case vs camelCase rules |
| `DATABASE_CONTENT_MODEL.md` | Table ownership overview |
| `ARTICLE_TABLE_CONTRACT.md` | Article columns and lifecycle |
| `ARTICLE_JSON_CONTRACTS.md` | content_json, recipe_json, roundup_json shapes |
| `ARTICLE_CACHED_FIELDS_CONTRACT.md` | cached_*_json fields |
| `IMAGE_JSON_CONTRACT.md` | Image slot shapes across tables |
| `RECIPE_JSON_CONTRACT.md` | Recipe data structure |
| `API.md` | API route documentation |
| `ARCHITECTURE.md` | System architecture |
| `IMPLEMENTATION_GAPS.md` | Known drift between contracts and code |

**Never modify `docs/` contracts without explicit permission** — they are the architectural source of truth.

## Cloudflare Bindings

Configured in `wrangler.jsonc`:

| Binding | Purpose |
|---|---|
| `DB` | D1 database |
| `IMAGES` | R2 image bucket |
| `SESSION` | KV session storage |
| `ASSETS` | Static assets |

Local Cloudflare behavior is runtime-sensitive. If D1/R2/KV matters, validate with `pnpm preview`, not just `pnpm dev`.

## Design System

Two distinct themes:
- **Public site:** Warm editorial — Playfair Display headings, Source Sans 3 body, coral/orange brand (`#e74c3c`/`#ff6b35`), sage green for eco/bio content
- **Admin dashboard:** Professional neutral — Inter font, blue primary (`#2563eb`), slate dark mode

Design tokens: `src/shared/design-tokens.css`, `src/site/styles/site-theme.css`, `src/admin/styles/admin-theme.css`
Full spec: `DESIGN.md` and `DESIGN-REC.md` (accessibility recommendations)

## MCP Tools

Use these MCP tools before web search:
- `context7` / `shadcn` — for framework/component documentation
- `konva-documentation` — for Konva canvas editor
- `google-developer-knowledge` — for Cloudflare/Google APIs

## Foundational Behavior

- **Start of Conversation**: At the start of every new conversation, the agent MUST immediately read [.agent/skills/karpathy-rules/SKILL.md](file:///c:/Users/Poste/Desktop/SaaS%20Astro/freecipies-blog/.agent/skills/karpathy-rules/SKILL.md) to initialize behavioral guidelines regarding assumptions, simplicity, surgical changes, and goal-driven execution.
- **Use Caveman Mode**: On executing plans and general thinking/responses, communicate using ultra-compressed "caveman mode" (as defined in the caveman skill) to save tokens.

## Safety

- **Never run `pnpm build` without asking.**
- **Never open the browser without explicit permission.**
- **Never modify `docs/` contracts without explicit permission.**
- Do not use browser automation unless explicitly requested.

## Reference Files

| Purpose | File |
|---|---|
| Astro config | `astro.config.mjs` |
| Drizzle config | `drizzle.config.ts` |
| DB schema (SQL) | `db/schema.sql` |
| Drizzle schemas | `src/shared/database/schema.ts` + per-module |
| Image contract | `src/shared/images/image-contract.ts` |
| Error handling | `src/shared/utils/error-handler.ts` |
| Auth module | `src/modules/auth/` |
| Middleware | `src/middleware.ts` |
| Admin entry | `src/pages/admin/[...path].astro` → `src/admin/app/` |
| Boundary checker | `scripts/check-boundaries.mjs` |