# Task 5 report — Astro, Cloudflare, and Vite platform migration

## Changes

- Updated Astro to 7.2.0, the Cloudflare and React integrations to 14.2.0 and 6.0.2, Vite to 8.2.1, Astro Check to 0.9.10, and Workers types to 5.20260804.1.
- Removed the Vite 7 override and added exact release-age exclusions for the three platform packages.
- Preserved `imageService: 'passthrough'`, added `compressHTML: true`, and updated the Vite 8 Oxc/Rolldown build comment.
- Removed the `ssr.external` configuration because Cloudflare Vite Plugin 1.5 rejects Worker environments with `resolve.external`.
- Added `@vitejs/plugin-react@^5.2.0` as an explicit development dependency and registered it in Vitest. The same version is already transitive through `@astrojs/react`; making it direct allows Vite 8 to transform the TSX route-contract test without loading the Cloudflare Worker plugin.
- Corrected the site global stylesheet import from `../shared/design-tokens.css` to `../../shared/design-tokens.css`, the actual relative path from `src/site/styles/`.
- Removed three non-functional HTML comments nested inside Astro conditional expressions in `RelatedContent.astro`; Astro 7 rejects that syntax, while the rendered markup is unchanged.

## Verification

| Check | Result |
| --- | --- |
| `corepack pnpm@11.20.0 install --lockfile-only --ignore-scripts` | Passed; lockfile policy verification passed. |
| Frozen install | Passed in the reconstructed checkout with `CI=true`, `--frozen-lockfile`, and `--ignore-scripts`. |
| Router contract under Vite 8 | Passed: 4 tests. |
| TypeScript | Passed with `pnpm typecheck`. |
| Astro Check | Passed: `0 errors` across 850 files. |
| Vitest | Passed: 90 files / 553 tests with historical `.tmp` and `.pnpm-store` copies excluded. Permanent exclusions are added in the reproducibility unit. |
| Boundary check | Passed. |
| Audit (prod) | 0 critical / 4 high / 20 moderate / 6 low. |
| `git diff --check` | Passed. |
| Production build | Passed with `CI=true`; Cloudflare output was generated successfully. |

## Known follow-up

`src/pages/api/upload-font.ts` still relies on `node:fs/promises`, `node:path`, and `process.cwd()`. The repository already documents that endpoint as broken in local Workerd and it needs a separate R2-backed design; this platform unit does not change its API or storage behavior.

The successful build emits two pre-existing non-blocking warnings: `getStaticPaths()` is ignored for the dynamic Pinterest RSS route, and the CSS optimizer warns about the generated `--space-1.5` custom property token.
