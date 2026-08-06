# Task 1 — Astro baseline report

## Status

`DONE_WITH_CONCERNS`

## Files changed

- `package.json`
- `src/site/utils/content-render.ts`
- `src/site/utils/__tests__/content-render.test.ts`
- `src/site/layouts/RecipeLayout.astro`
- `src/site/layouts/RoundupLayout.astro`
- `src/site/components/ContentRenderer.astro`
- `src/site/components/RecipeCard.astro`
- `src/site/components/RoundupItemList.astro`
- `src/site/components/content/blocks/MainRecipe.astro`
- `src/site/components/content/blocks/RoundupList.astro`
- `src/site/components/content/blocks/Video.astro`
- `src/site/components/CategoryHeader.astro`
- `src/site/components/home/CategoryBrowse.astro`
- `src/site/components/Header.astro`

## Typed boundary decision

Added `normalizeArticleForRender()` as the public-site boundary. It accepts the
fully hydrated article record and the sparse preview payload, normalizes only
the rendering fields, and preserves the original `content_json` and
`recipe_json` inputs. It also normalizes related author/category display data
without changing database, API, JSON, or image contracts. Recipe and roundup
components now consume narrow render types instead of broad `Record`/`any`
props; preview-only string ids skip the numeric ratings island safely.

## Verification

| Command | Result |
| --- | --- |
| `pnpm check:astro` | Blocked before diagnostics; see concern below. |
| `pnpm typecheck` | Passed. |
| `pnpm test` | Passed: 89 files, 548 tests. |
| `pnpm check:boundaries` | Passed. |
| `git diff --check` | Passed. |

Focused TDD coverage was added first for hydrated and sparse-preview boundary
inputs. It failed initially because the new module did not exist, then passed
with 2 tests after implementation.

## Astro Check concern

The required command was added exactly as `astro check --minimumSeverity error`.
On this Windows checkout it cannot reach template diagnostics: the normal Astro
invocation starts the Cloudflare runtime, then Miniflare terminates while Vite
reports that the Workers runtime failed to start. The direct output identified
`miniflare/dist/src/index.js:87889` and `std::terminate() called with no
exception`. A later exact `pnpm check:astro` invocation produced no diagnostics
and remained running until it was stopped after approximately one minute.

This environment failure means the expected post-change Astro error count could
not be independently confirmed here. No build, preview, browser, package
version, or contract-document change was performed.

## Commit

`f51cae44575c0ca434bf95101f1df5fb7090b036` (amended below to include this report).
