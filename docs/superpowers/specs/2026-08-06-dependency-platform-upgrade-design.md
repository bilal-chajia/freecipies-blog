# Dependency and Platform Upgrade Design

**Date:** 2026-08-06

## Goal

Move the repository to the latest stable, supportable package stack available on 2026-08-06 while preserving existing behavior, reducing known dependency risk, and keeping every migration batch independently reversible.

## Decisions

- Use a phased migration instead of a single `pnpm update --latest` operation.
- Target Astro 7.2.0, `@astrojs/cloudflare` 14.2.0, `@astrojs/react` 6.0.2, Vite 8.2.1, React 19.2.8, React Router 8.3.0, Tailwind CSS 4.3.3, Wrangler 4.119.0, and pnpm 11.20.0.
- Keep TypeScript at 6.0.3 because the official TypeScript 7.0 guidance says Astro workflows still require TypeScript 6 programmatic APIs. TypeScript 7.0.2 is explicitly out of scope until Astro supports it.
- Keep the runtime on the Node 24 LTS line. The recommended machine runtime is Node 24.19.0; Node 26 Current is out of scope.
- Preserve `imageService: "passthrough"` unless image-delivery behavior is deliberately redesigned later.
- Preserve Astro 6 whitespace behavior during the platform migration by setting `compressHTML: true`. Adopting Astro 7's new JSX whitespace behavior requires separate visual approval.
- Do not overwrite locally maintained shadcn component source. Upgrade the CLI and Radix packages, then inspect upstream component diffs separately.
- Do not combine dependency migration with the previously identified D1-query, image-contract, large-component, or broad `any` refactors. Those remain separate follow-up work.
- Treat `astro check --minimumSeverity error` as a required gate. The existing `tsc` command does not fully validate `.astro` templates.

## Second-Audit Evidence

- All 97 direct manifest entries (84 runtime and 13 development dependencies) were queried against the official npm registry on 2026-08-06.
- The local runtime is Node 24.16.0 with pnpm 11.5.2. It already satisfies all selected package engines, but Node 24.19.0 and pnpm 11.20.0 are the current LTS-line/tooling targets.
- Nineteen retained direct packages are already on their latest registry versions: the three DnD Kit packages, both jSquash codecs, Monaco React, Class Variance Authority, clsx, cmdk, Drizzle ORM/Kit, the three Embla packages, input-otp, Sonner, sql.js, tw-animate-css, and Vaul.
- The latest target peer matrix is coherent: Astro, its React/Cloudflare integrations, and Vite require Node 22.12 or newer; React Router 8 requires Node 22.22 and React 19.2.7; the chosen Node 24 and React 19.2.8 baselines satisfy both.
- The fresh full dependency audit reports 1 critical, 39 high, 83 moderate, and 16 low advisories. The production-only audit reports 1 critical, 29 high, 61 moderate, and 13 low advisories.
- A residual high transitive advisory may remain after the supported upgrades: the latest Cloudflare Vite Plugin/Wrangler chain currently resolves Miniflare with `undici` 7.28.0, while the newest advisory is patched in 7.29.0. Do not force an unsupported override; confirm the regenerated lockfile and document this residual if Cloudflare has not published a compatible update.

## Official Migration References

- [Astro 7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/)
- [Astro Cloudflare adapter guide](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Vite 8 migration guide](https://vite.dev/guide/migration.html)
- [React Router v7 to v8 guide](https://reactrouter.com/upgrading/v7)
- [React Router official changelog](https://reactrouter.com/home/changelog)
- [React DayPicker 10 upgrade guide](https://daypicker.dev/upgrading)
- [TanStack Table 9 React migration guide](https://tanstack.com/table/beta/docs/framework/react/guide/migrating)
- [Mantine 8 to 9 guide](https://mantine.dev/guides/8x-to-9x/)
- [BlockNote 0.52 release](https://github.com/TypeCellOS/BlockNote/releases/tag/v0.52.0)
- [Motion React upgrade guide](https://motion.dev/docs/react-upgrade-guide)
- [Nano ID 6 release](https://github.com/ai/nanoid/releases/tag/6.0.0)
- [React Easy Crop 6 release](https://github.com/ValentinH/react-easy-crop/releases/tag/v6.0.0)
- [TypeScript 7 announcement and compatibility status](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Node.js official release status](https://nodejs.org/en/about/previous-releases)
- [shadcn changelog](https://ui.shadcn.com/docs/changelog)

## Migration Units

### 1. Restore a trustworthy Astro baseline

The second audit recorded the following pre-migration baseline:

- `pnpm typecheck`: pass.
- `pnpm test`: 88 files and 546 tests pass.
- `pnpm check:boundaries`: pass.
- `astro check --minimumSeverity error`: 49 pre-existing errors across 10 files.
- Production dependency audit: 1 critical, 29 high, 61 moderate, and 13 low advisories.

Fix the 49 Astro diagnostics before changing package versions so later failures can be attributed to the migration. The errors are concentrated in content-contract narrowing and component prop typing, with 28 in `src/site/layouts/RecipeLayout.astro`; the remaining files contain smaller `unknown`, nullable, cast, and DOM-element typing issues.

The main cause is the use of `Record<string, unknown>` at the recipe/content rendering boundary while production hydration and preview rendering currently provide related but different shapes. Introduce a narrow typed render model or boundary normalizer shared by those two callers; do not silence the diagnostics with broad `any` casts. Also correct the confirmed `CategoryHeader.astro` field drift from nonexistent `featuredArticle.label` to the canonical article headline, normalize nullable category counts, and type the search button as a focusable element. These corrections must preserve serialized data, API shapes, and database contracts; the headline correction restores the intended rendered title rather than changing a contract.

Add a reproducible `check:astro` package script for `astro check --minimumSeverity error`. This unit exits only when that command reports zero errors while typecheck, all tests, and architecture boundaries still pass.

### 2. Dependency cleanup

Remove direct packages with no repository imports or runtime use:

- `@anthropic-ai/sdk`
- `@astrojs/rss`
- `@astrojs/sitemap`
- `@google/generative-ai`
- `@heyputer/puter.js`
- `@hookform/resolvers`
- `aws4fetch`
- `next-themes`
- `openai`
- `opentype.js`
- `sqlite3`

Remove matching obsolete Vite SSR externalization entries and remove `sqlite3` from `pnpm-workspace.yaml` build allowances. Preserve the custom fetch-based AI providers and the Puter CDN integration.

Removing root `sqlite3` is security-significant: both observed critical `tar` paths are below Drizzle's optional `sqlite3` dependency path. Confirm the critical advisory is gone after the lockfile is regenerated instead of assuming removal is sufficient.

### 3. Compatible runtime and tooling updates

Update compatible patch/minor packages to their 2026-08-06 latest versions, including React and React DOM 19.2.8, Axios 1.19.0, Tailwind CSS 4.3.3, Zod 4.4.3, jose 6.2.8, date-fns 4.4.0, React Hook Form 7.84.0, Zustand 5.0.14, Konva 10.3.0, React Konva 19.2.5, Recharts 3.10.1, React Resizable Panels 4.12.2, Tailwind Merge 3.6.0, Lucide React 1.29.0, the React type packages 19.2.18/19.2.4, shadcn 4.16.2, Wrangler 4.119.0, Vitest 4.1.10, and pnpm 11.20.0.

Update the complete Radix package family together. This unit must not regenerate or overwrite shadcn source components.

### 4. React Router 8 package migration

Replace `react-router-dom` 7 with `react-router` 8.3.0. React Router 8 removed the compatibility `react-router-dom` package; this repository has 29 imports that must move to `react-router`. It does not use `RouterProvider` or `HydratedRouter`, so no current import needs the separate `react-router/dom` entrypoint.

The repository uses declarative `BrowserRouter`, `Routes`, and `Route` APIs rather than React Router Framework or RSC mode. Keep this as an isolated mechanical migration, add an admin route/navigation smoke test, and verify login redirects, parameterized editor routes, links, location state, and animated outlets. The target requires Node 22.22 or newer and React/React DOM 19.2.7 or newer; the selected Node 24 and React 19.2.8 baselines satisfy those peers.

This unit also resolves the current React Router branch advisory that is only patched in 8.3.0. Do not retain `react-router-dom` after the migration.

### 5. Astro, Cloudflare, and Vite migration

Upgrade these packages as one platform unit:

- `astro` 7.2.0
- `@astrojs/cloudflare` 14.2.0
- `@astrojs/react` 6.0.2
- `vite` 8.2.1
- `@astrojs/check` 0.9.10
- `@cloudflare/workers-types` 5.20260804.1

Remove the repository-wide `overrides.vite: ^7` constraint from `pnpm-workspace.yaml`; it conflicts with Astro 7's Vite 8 requirement. Rely on the direct Vite 8 dependency and the official Astro integration peer ranges, then verify the resolved lockfile.

Set `compressHTML: true` during this unit to retain Astro 6 whitespace behavior. Review the custom Vite watcher plugin, dependency optimization, WASM/jsquash handling, Cloudflare entrypoint, image-service behavior, and prerender environment. Update the stale comment that says minification defaults to esbuild because Vite 8 uses the Rolldown/Oxc toolchain. Fix only compatibility issues demonstrated by Astro Check, typecheck, tests, build, preview, or official migration requirements.

Astro 7's stricter Rust compiler may expose invalid or unclosed template markup. Any resulting template corrections must be behavior-preserving and scoped to compiler failures.

### 6. Editor and UI major migrations

Use independent checkpoints for each group:

1. BlockNote core/react/mantine 0.52.1 while retaining Mantine 8.
2. Mantine core/hooks 9.5.1 as a separate checkpoint.
3. Motion 13.0.0.
4. React DayPicker 10.0.1.
5. React Easy Crop 6.2.3.
6. TanStack React Table 9.0.0.
7. Nano ID 6.0.1 only if it remains used after cleanup.

For BlockNote, migrate theme rules from `.bn-container` to `.bn-root` where required. The repository does not use BlockNote collaboration, so the Yjs `withCollaboration` migration is not expected to apply.

Before any shadcn CLI comparison, correct `components.json` from `"tsx": false` to `"tsx": true`; the current value makes the CLI propose JavaScript files in this TypeScript project. Use dry-run or diff output only and apply reviewed changes manually.

For DayPicker 10, replace `react-day-picker` with the preferred `@daypicker/react` package, update imports, and migrate the local Calendar wrapper's removed `classNames.table` key to `month_grid`. Add focused Calendar tests before the change.

TanStack Table 9 must migrate the local data-table wrapper from `useReactTable` to the native `useTable` and explicit feature/row-model API rather than leaving the deprecated `useLegacyTable` compatibility layer as the final state. Add focused sorting, filtering, pagination, and state tests before the change.

### 7. Optional Lobe package reduction

`@lobehub/icons` is used only by the provider-icon component, while `@lobehub/ui` is retained as its peer. Prefer replacing those provider avatars with locally owned lightweight SVG assets, then remove both packages. If exact brand artwork cannot be preserved without a separate design decision, update both packages to 5.15.0 and 5.28.1 and defer removal.

## Verification and Safety

Every migration unit must finish with:

- `astro check --minimumSeverity error`
- `pnpm typecheck`
- relevant focused Vitest tests
- `pnpm test`
- `pnpm check:boundaries`
- `pnpm audit --prod --json` and `pnpm audit --json`
- `git diff --check`

The production build and Cloudflare preview are required before final completion, but repository instructions require explicit user permission before any build command. Do not open a browser without separate permission.

No deployment, production data mutation, schema change, or contract-document modification is part of this work.

## Success Criteria

- The approved latest package targets are represented in `package.json` and `pnpm-lock.yaml`, except TypeScript 7 and Node 26.
- Unused direct dependencies and obsolete externalization entries are removed.
- Existing API, JSON, database, and image contracts remain unchanged.
- Astro Check reports zero errors; typecheck, all tests, and architecture boundaries pass.
- The approved production build and Cloudflare preview complete successfully.
- No critical dependency vulnerability remains; any remaining advisories are recorded with their dependency path and application relevance.
- Each migration unit is independently reviewable and reversible.

## Rollback Strategy

Keep Astro baseline repairs, cleanup, compatible updates, React Router, platform migration, and each editor/UI major migration in separate commits. If a unit cannot meet its verification gate, revert only that unit and retain earlier verified upgrades.
