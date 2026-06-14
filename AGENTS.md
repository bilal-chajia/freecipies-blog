# Agent Rules — SaaS Blog

## Stack

- Astro 6.3.3 + React 19 + Tailwind 4 + Drizzle ORM + Zod 4
- Cloudflare: D1 (SQLite), R2 (storage), KV (cache), Workers (runtime)
- TypeScript 6 strict, `pnpm` only

## Commands

| Command | Use |
|---|---|
| `pnpm dev` | Local dev server |
| `pnpm preview` | Build + Wrangler (required to test D1/R2) |
| `pnpm build` | Production bundle — **never run without asking** |
| `pnpm test` | Vitest suite |

## Architecture

```
src/
├── pages/          # Astro pages + API route entry points (thin, delegate to server/modules)
├── modules/        # Business logic per domain (schema, service, types)
│   ├── articles/   ├── authors/    ├── categories/
│   ├── tags/       ├── media/      ├── equipment/
│   ├── auth/       ├── ai/         ├── content-blocks/
│   ├── settings/   ├── menus/      ├── templates/
│   ├── pinterest/  └── redirects/
├── server/         # API handlers, auth guards, Cloudflare binding access, site-data loaders
├── admin/          # React SPA (Radix UI + shadcn + react-router-dom)
├── site/           # Public Astro UI (components, layouts, scripts, styles)
└── shared/         # Single source of truth: database, types, utils, validation, image contracts
```

### API route pattern

`src/pages/api/admin/ai/generate.ts` → delegates to `src/server/api/admin/ai/generate.handler.ts`

For resources with sub-routes, use `src/pages/api/{resource}/index.ts` instead of `src/pages/api/{resource}.ts`.

## Contracts (Source of Truth)

The `docs/` directory contains the canonical system contracts. **Always consult before modifying schema, JSON shapes, or naming.**

| Contract | Covers |
|---|---|
| `NAMING_CONTRACT.md` | `snake_case` in SQL/JSON/API, `camelCase` in TS only |
| `DATABASE_CONTENT_MODEL.md` | Table ownership overview |
| `ARTICLE_TABLE_CONTRACT.md` | Article columns, workflow, lifecycle |
| `ARTICLE_JSON_CONTRACTS.md` | `content_json`, `recipe_json`, `roundup_json` shapes |
| `ARTICLE_CACHED_FIELDS_CONTRACT.md` | `cached_*_json` fields, card/rating snapshots |
| `CONTENT_BLOCKS_CONTRACT.md` | Block types and editor normalization |
| `CONTENT_JSON_CONTRACT.md` | Content JSON structure and validation |
| `AUTHORS_TABLE_CONTRACT.md` | Author columns, `bio_json`, `images_json`, cache triggers |
| `CATEGORIES_TABLE_CONTRACT.md` | Category hierarchy, `cached_post_count` |
| `TAGS_TABLE_CONTRACT.md` | Tags + `articles_to_tags` junction |
| `MEDIA_TABLE_CONTRACT.md` | Media lifecycle, `variants_json`, FTS5 |
| `IMAGE_JSON_CONTRACT.md` | Image slot shapes across all tables |
| `RECIPE_JSON_CONTRACT.md` | Recipe data structure |
| `ROUNDUP_JSON_CONTRACT.md` | Roundup/listicle data structure |
| `EQUIPMENT_TABLE_CONTRACT.md` | Equipment catalog |
| `SITE_SETTINGS_TABLE_CONTRACT.md` | Key-value config registry |
| `REDIRECTS_TABLE_CONTRACT.md` | SEO redirect rules |
| `TEMPLATE_JSON_CONTRACT.md` | Template element serialization shapes |
| `BLOCK_EDITOR_JSON_STRUCTURE.md` | Block editor data model and block types |
| `BLOCK_EDITOR_REFACTOR_PLAN.md` | Block editor migration plan and status |
| `API.md` | REST API endpoints and conventions |
| `ARCHITECTURE.md` | System architecture and module boundaries |
| `IMPLEMENTATION_GAPS.md` | Known drift between contracts and code |

## Critical Rules

### Database

- Drizzle ORM only — no raw SQL in application code.
- `db/schema.sql` is the executable source of truth for D1.
- Drizzle schemas live in `src/modules/{domain}/schema/`.
- Soft deletes everywhere: `deleted_at IS NULL` in all queries. No hard deletes on linked rows.
- All timestamps are UTC.
- `caption` and `credit` are `NOT NULL` on `media`.

### Naming

- SQL columns and stored/serialized JSON: `snake_case`.
- TypeScript/TSX implementation code: `camelCase`.
- Never invent hybrid names (`contentjson`, `content_JSON`).
- See `docs/NAMING_CONTRACT.md` for the full rule.

### Images

- Types imported exclusively from `@shared/images/image-contract.ts`.
- Never expose `r2_key` to frontend — resolve to public `url` at the server layer.
- All `<img>` tags must have `width`, `height`, and `loading="lazy"` (Lighthouse 90+ target).

### API

- Responses via `formatSuccessResponse` / `formatErrorResponse` from `@shared/utils/error-handler.ts`.
- JSON payloads use `snake_case` keys.
- Validate inputs with Zod.

### TypeScript

- Strict mode. No `any`.
- Convert `null` → `undefined` for optional React props.
- Use path aliases: `@modules/`, `@shared/`, `@server/`, `@admin/`, `@site/`.

## Agent Behavior

### Research first

1. Use `list_dir` and `grep_search` before reading a full file.
2. Check `db/schema.sql` for DB structure, `package.json` for versions.
3. Read the relevant `docs/` contract before modifying any table, JSON shape, or trigger.

### Tools

- Use MCP tools (`context7`, `shadcn`, `konva-documentation`) before web search.
- Use `google-developer-knowledge` for Cloudflare/Google APIs.

### Safety

- **Never run `pnpm build` without asking.**
- **Never open the browser without explicit permission.**
- **Never modify `docs/` contracts without explicit permission** — they are the architectural source of truth.
## Reference Files

| Purpose | File |
|---|---|
| DB schema (SQL) | `db/schema.sql` |
| Drizzle config | `src/shared/database/drizzle.ts` + `schema.ts` |
| Image contract | `src/shared/images/image-contract.ts` |
| API error/success | `src/shared/utils/error-handler.ts` |
| Auth module | `src/modules/auth/` |
| Middleware | `src/middleware.ts` |
| Design tokens | `src/shared/design-tokens.css` |
| Site theme | `src/site/styles/site-theme.css` |
| Admin theme | `src/admin/styles/admin-theme.css` |
