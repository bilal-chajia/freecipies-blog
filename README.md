# SaaS Blog

SaaS Blog is a recipe and food blog SaaS built as one Astro application: a public Astro site, a React admin SPA, and Cloudflare-backed server/API code deployed through the Astro Cloudflare adapter.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Astro 6, `output: 'server'` |
| Admin UI | React 19, React Router, Zustand |
| Styling | Tailwind CSS 4, Radix UI, shadcn/ui |
| Database | Cloudflare D1 with Drizzle |
| Storage | Cloudflare R2 for images |
| Sessions | Cloudflare KV |
| Runtime | Cloudflare Workers via `@astrojs/cloudflare` |
| Package manager | pnpm only |

Key current versions are declared in `package.json`.

## Commands

```bash
pnpm install
pnpm dev
pnpm preview
pnpm deploy
pnpm test
pnpm check:boundaries
```

`pnpm build` runs `node scripts/build.mjs`. Use it for release validation, but agents must not run it automatically without permission.

`pnpm preview` runs an Astro build then starts Wrangler. Use it when validating behavior that depends on Cloudflare bindings such as D1, R2, or KV.

## Project Structure

```text
src/
  admin/    React admin SPA mounted by src/pages/admin/[...path].astro.
  modules/  Business domains: articles, auth, media, settings, AI, templates, etc.
  pages/    Astro routes and thin API route entrypoints.
  server/   API handlers, auth guards, site-data loaders, Cloudflare server access.
  shared/   Cross-cutting database, types, validation, constants, and utilities.
  site/     Public Astro UI: components, layouts, scripts, and styles.
```

The repo is intentionally a single Astro deployment. Keep the boundary internal:

- public rendering belongs in `src/site` and `src/pages`;
- admin UI belongs in `src/admin`;
- route files in `src/pages/api` should stay thin;
- API behavior belongs in `src/server` and domain modules;
- reusable global contracts belong in `src/shared`;
- domain logic belongs in `src/modules`.

## Public Site

The public site is Astro-first and server-rendered. Current public routes include:

- `/`, `/about`, `/contact`, `/faqs`, `/my-bookmarks`;
- `/recipes`, `/recipes/[slug]`;
- `/articles/[slug]`;
- `/roundups`, `/roundups/[slug]`;
- `/categories`, `/categories/[slug]`;
- `/authors`, `/authors/[slug]`;
- `/tags`, `/tags/[slug]`;
- RSS, sitemap, image proxy, and error routes.

Public UI should use `src/site/components`, `src/site/layouts`, `src/site/scripts`, and `src/site/styles`.

## Admin Panel

The admin is a React SPA served from `/admin` through:

```text
src/pages/admin/[...path].astro
src/admin/app/
src/admin/features/
src/admin/components/
src/admin/services/
src/admin/store/
src/admin/ui/
```

The admin includes content editing, media management, taxonomy management, Pinterest tooling, template editing with Konva, settings, redirects, dashboards, and AI content generation.

Keep Cloudflare bindings and secrets server-side. The admin talks to API routes; it must not receive D1, R2, KV, secrets, or raw R2 keys.

## API Pattern

API route files in `src/pages/api` should delegate to handlers instead of containing business logic.

Gold-standard pattern:

```text
src/pages/api/admin/ai/generate.ts
src/server/api/admin/ai/generate.handler.ts
```

Responses should use `formatSuccessResponse` and `formatErrorResponse` from `@shared/utils`.

For resources with sub-routes, prefer:

```text
src/pages/api/{resource}/index.ts
```

over:

```text
src/pages/api/{resource}.ts
```

## Data Model

Database source of truth:

```text
db/schema.sql
src/shared/database/drizzle.ts
src/shared/database/schema.ts
```

Rules:

- use Drizzle for database access;
- apply soft deletes with `deleted_at IS NULL`;
- store timestamps in UTC;
- keep denormalized article fields aligned with the content contracts in `docs/`;
- do not bypass shared database setup.

Important contract docs:

- `docs/DATABASE_CONTENT_MODEL.md`
- `docs/ARTICLE_TABLE_CONTRACT.md`
- `docs/CONTENT_JSON_CONTRACT.md`
- `docs/IMAGE_JSON_CONTRACT.md`
- `docs/RECIPE_JSON_CONTRACT.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`

## Images

Image types must be imported exclusively from:

```ts
@shared/types/images
```

Frontend code must not receive or depend on `r2_key`. Server code owns storage details and exposes safe image data.

Public `<img>` tags must include `width`, `height`, and `loading="lazy"` unless there is a deliberate above-the-fold exception.

## Cloudflare Bindings

Configured in `wrangler.jsonc`:

| Binding | Purpose |
| --- | --- |
| `DB` | D1 database |
| `IMAGES` | R2 image bucket |
| `SESSION` | KV session storage |
| `ASSETS` | Static assets served by Workers |

Local Cloudflare behavior is runtime-sensitive. If D1/R2/KV behavior matters, validate with `pnpm preview`, not only `pnpm dev`.

## Development Rules

- Use `pnpm` only.
- Keep TypeScript strict.
- Avoid `any`.
- Convert `null` to `undefined` for optional props.
- Use Context7/shadcn MCP docs before web browsing for framework or component documentation.
- Do not use browser automation unless explicitly requested.
- Do not run `pnpm build` automatically without permission.
- Keep public and admin boundaries explicit.
- Keep API route files thin.

## Agent Reference

Before changing architecture or data contracts, inspect these files first:

```text
AGENTS.md
package.json
astro.config.mjs
wrangler.jsonc
db/schema.sql
src/shared/database/drizzle.ts
src/shared/database/schema.ts
src/shared/types/images.ts
src/pages/api/admin/ai/generate.ts
src/server/api/admin/ai/generate.handler.ts
src/modules/auth/
docs/
```
