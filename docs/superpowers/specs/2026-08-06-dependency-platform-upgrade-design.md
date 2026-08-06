# Dependency and Platform Upgrade Design

**Date:** 2026-08-06

## Goal

Move the repository to the latest stable, supportable package stack available on 2026-08-06 while preserving existing behavior, reducing known dependency risk, and keeping every migration batch independently reversible.

## Decisions

- Use a phased migration instead of a single `pnpm update --latest` operation.
- Target Astro 7.2.0, `@astrojs/cloudflare` 14.2.0, `@astrojs/react` 6.0.2, Vite 8.2.1, React 19.2.8, Tailwind CSS 4.3.3, Wrangler 4.119.0, and pnpm 11.20.0.
- Keep TypeScript at 6.0.3 because the official TypeScript 7.0 guidance says Astro workflows still require TypeScript 6 programmatic APIs. TypeScript 7.0.2 is explicitly out of scope until Astro supports it.
- Keep the runtime on the Node 24 LTS line. The recommended machine runtime is Node 24.18.0; Node 26 Current is out of scope.
- Preserve `imageService: "passthrough"` unless image-delivery behavior is deliberately redesigned later.
- Do not overwrite locally maintained shadcn component source. Upgrade the CLI and Radix packages, then inspect upstream component diffs separately.
- Do not combine dependency migration with the previously identified D1-query, image-contract, large-component, or broad `any` refactors. Those remain separate follow-up work.

## Migration Units

### 1. Baseline and dependency cleanup

Capture the clean baseline with typecheck, tests, architecture-boundary checks, Git status, and `pnpm audit`. Remove direct packages with no repository imports or runtime use:

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

Remove matching obsolete Vite SSR externalization entries. Preserve the custom fetch-based AI providers and the Puter CDN integration.

### 2. Compatible runtime and tooling updates

Update patch/minor packages to their 2026-08-06 latest versions, including React 19.2.8, React Router 7.18.2, Axios 1.19.0, Tailwind CSS 4.3.3, Zod 4.4.3, jose 6.2.8, date-fns 4.4.0, React Hook Form 7.84.0, Zustand 5.0.14, Konva 10.3.0, React Konva 19.2.5, Recharts 3.10.1, Lucide React 1.29.0, Wrangler 4.119.0, Vitest 4.1.10, and pnpm 11.20.0.

Update the complete Radix package family together. This unit must not regenerate or overwrite shadcn source components.

### 3. Astro, Cloudflare, and Vite migration

Upgrade these packages as one platform unit:

- `astro` 7.2.0
- `@astrojs/cloudflare` 14.2.0
- `@astrojs/react` 6.0.2
- `vite` 8.2.1
- `@astrojs/check` 0.9.10
- `@cloudflare/workers-types` 5.20260804.1

Review the custom Vite watcher plugin, dependency optimization, WASM/jsquash handling, Cloudflare entrypoint, image-service behavior, and prerender environment. Fix only compatibility issues demonstrated by typecheck, tests, build, preview, or official migration requirements.

Astro 7's stricter Rust compiler may expose invalid or unclosed template markup. Any resulting template corrections must be behavior-preserving and scoped to compiler failures.

### 4. Editor and UI major migrations

Use independent checkpoints for each group:

1. BlockNote core/react/mantine 0.52.1 and Mantine 9.5.1.
2. Motion 13.0.0.
3. React DayPicker 10.0.1.
4. React Easy Crop 6.2.3.
5. TanStack React Table 9.0.0.
6. Nano ID 6.0.1 only if it remains used after cleanup.

For BlockNote, migrate theme rules from `.bn-container` to `.bn-root` where required. The repository does not use BlockNote collaboration, so the Yjs `withCollaboration` migration is not expected to apply.

TanStack Table 9 must use the native v9 API rather than leaving the deprecated `useLegacyTable` compatibility layer as the final state.

### 5. Optional Lobe package reduction

`@lobehub/icons` is used only by the provider-icon component, while `@lobehub/ui` is retained as its peer. Prefer replacing those provider avatars with locally owned lightweight SVG assets, then remove both packages. If exact brand artwork cannot be preserved without a separate design decision, update both packages to 5.15.0 and 5.28.1 and defer removal.

## Verification and Safety

Every migration unit must finish with:

- `pnpm typecheck`
- relevant focused Vitest tests
- `pnpm test`
- `pnpm check:boundaries`
- `pnpm audit --json`
- `git diff --check`

The production build and Cloudflare preview are required before final completion, but repository instructions require explicit user permission before any build command. Do not open a browser without separate permission.

No deployment, production data mutation, schema change, or contract-document modification is part of this work.

## Success Criteria

- The approved latest package targets are represented in `package.json` and `pnpm-lock.yaml`, except TypeScript 7 and Node 26.
- Unused direct dependencies and obsolete externalization entries are removed.
- Existing API, JSON, database, and image contracts remain unchanged.
- Typecheck, all tests, and architecture boundaries pass.
- The approved production build and Cloudflare preview complete successfully.
- No critical dependency vulnerability remains; any remaining advisories are recorded with their dependency path and application relevance.
- Each migration unit is independently reviewable and reversible.

## Rollback Strategy

Keep cleanup, compatible updates, platform migration, and each editor/UI major migration in separate commits. If a unit cannot meet its verification gate, revert only that unit and retain earlier verified upgrades.
