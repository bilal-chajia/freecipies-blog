# CLAUDE.md

Compact Claude Code guidance for this repo. Keep this file small; read deeper docs only when the task needs them.

## Project

Freecipies Blog: Astro app with public SSR site, React admin SPA, and Cloudflare-backed API in one repo.

## Stack

- Astro 6.3.3, React 19, Tailwind CSS 4, TypeScript 6 strict
- Drizzle ORM, Zod 4
- Cloudflare Workers via `@astrojs/cloudflare`
- D1 SQLite, R2 images, KV sessions
- Zustand for admin state
- `pnpm` only

## Commands

- `pnpm dev`: local Astro dev server with local D1/R2/KV bindings (uses `.dev.vars`)
- `pnpm preview`: full build plus Wrangler dev; use for production-like runtime checks
- `pnpm test`: Vitest
- `pnpm check:boundaries`: module boundary checks
- `pnpm build`: production build; ask before running

## Key Paths

- `src/pages/api/`: thin API route entry points
- `src/server/api/`: API handler implementations
- `src/admin/`: React admin SPA
- `src/site/`: public site UI
- `src/modules/`: domain logic
- `src/shared/`: shared database, validation, images, utils, constants
- `db/schema.sql`: executable D1 schema source of truth
- `wrangler.jsonc`: Cloudflare bindings
- `scripts/check-boundaries.mjs`: boundary checker

## Hard Rules

- Keep changes surgical. Do not refactor adjacent code unless needed for the task.
- Use existing patterns and path aliases.
- No `any`.
- Convert `null` to `undefined` for optional React props.
- API responses use `formatSuccessResponse` / `formatErrorResponse`.
- Validate inputs with Zod.
- App JSON/API payloads use `snake_case`; TypeScript/JSX uses `camelCase`.
- Drizzle only for app DB access; no raw SQL in application code.
- Soft deletes: include `deleted_at IS NULL` where relevant.
- `src/admin` must not import `@server/*` or access Cloudflare bindings.
- `src/site` must not access Cloudflare bindings directly.
- `src/modules` must stay domain-only: no UI imports, no Cloudflare imports.
- Do not expose `r2_key` to frontend; resolve server-side to public `url`.
- Do not modify `docs/` contracts without explicit permission.
- Do not open browser automation unless explicitly requested.

## Contracts

Before changing table shape, JSON shape, naming, images, or API contract, read only the relevant file under `docs/`, usually:

- `docs/NAMING_CONTRACT.md`
- `docs/API.md`
- `docs/ARTICLE_TABLE_CONTRACT.md`
- `docs/ARTICLE_JSON_CONTRACTS.md`
- `docs/IMAGE_JSON_CONTRACT.md`
- `docs/RECIPE_JSON_CONTRACT.md`
- `docs/DATABASE_CONTENT_MODEL.md`

## Design

- Public site: warm editorial, Playfair Display headings, Source Sans 3 body, forest/sage green brand with golden accent (`#2a5c36` / `#6b8f71` / `#d8a43e`).
- Admin: neutral professional dashboard, Inter, blue primary, slate dark mode.
- Tokens live in `src/shared/design-tokens.css`, `src/site/styles/site-theme.css`, and `src/admin/styles/admin-theme.css`.

## Token Discipline

- Prefer `/clear` for new tasks and `/compact` only for continuing the same task.
- Do not read large files unless needed.
- Use MCP/web docs only when local context is insufficient or current docs are required.
