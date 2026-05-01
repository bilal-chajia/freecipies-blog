# SaaS Blog Agent Rules (Ultra-Light)

## 🛠 Core Stack & Workflow
- **Stack**: Astro 6, React 19, Tailwind 4, Drizzle, Cloudflare (D1, R2, KV).
- **Package Manager**: `pnpm` uniquement.
- **Commands**: `pnpm dev`, `pnpm build`, `pnpm preview` (indispensable pour tester D1/R2).

## 📁 Architecture Pointer
- `src/modules/`: Logique métier (articles, auth, media, ai, templates).
- `src/admin/`: Panel Admin (React SPA).
- `src/site/`: UI publique Astro (components, layouts, scripts, styles).
- `src/server/`: Handlers API, guards auth, loaders serveur, accès Cloudflare bindings.
- `src/shared/`: Source unique pour types, database et utils globaux.
- `src/pages/`: Pages Astro et points d'entrée API (routes fines, délèguent à `src/server`/`src/modules`).

## ⚠️ Critical Rules (Strict)
- **Performance**: Lighthouse 90+. `<img>` DOIVENT avoir `width`, `height`, et `loading="lazy"`.
- **Database**: Drizzle uniquement. Soft deletes (`deleted_at IS NULL`). Timestamps UTC.
- **Images**: Types importés EXCLUSIVEMENT de `@shared/types/images`. Pas de `r2_key` en frontend.
- **API**: Réponses via `formatSuccessResponse`/`formatErrorResponse` (`@shared/utils`).
- **API Routes**: Pour les ressources avec sous-routes, utiliser `src/pages/api/{resource}/index.ts` au lieu de `src/pages/api/{resource}.ts`.
- **TS/JS**: Mode strict. Pas de `any`. Convertir `null` en `undefined` pour les props optionnelles.

## 🤖 Agent Behavior (Token Saving)
- **Research**: Utilise `list_dir` et `grep_search` avant de lire un fichier complet.
- **Reference**: Consulte `db/schema.sql` pour la DB et `package.json` pour les versions.
- **Docs**: Utilise les outils MCP (`context7`, `shadcn`) avant de naviguer sur le web.
- **Builds**: NE JAMAIS lancer `pnpm build` automatiquement (demande avant).
- **Navigation**: Pas d'accès au navigateur sans permission explicite.

## 📚 Reference Files (Gold Standard)
- **DB Config**: `src/shared/database/drizzle.ts` & `schema.ts`.
- **Image Logic**: `src/shared/types/images.ts`.
- **API Pattern**: `src/pages/api/admin/ai/generate.ts` -> `src/server/api/admin/ai/generate.handler.ts`.
- **Auth**: `src/modules/auth/`.
