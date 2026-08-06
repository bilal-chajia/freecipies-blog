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
| `pnpm test` | Passed: 89 files, 549 tests. |
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

## Fix round 1 — preview relations and Astro gate investigation

### Preview relation fix

`src/pages/api/preview/render.astro` constructs fallback `recipe.author` and
`recipe.category` values from form data, but calls `RecipeLayout` with separate
database relation arguments that remain `null` when no saved relation exists.
The original boundary treated `null` as an explicit override, discarding those
valid nested fallbacks. `normalizeArticleForRender()` now uses the separate
relation only when it is non-nullish, preserving a fetched production relation
when present and the nested preview fallback otherwise.

Added a focused regression test for the actual call shape: nested preview
author/category values plus `{ author: null, category: null }` relation args.
It failed before the change and passes after it.

### Astro gate investigation

The package script remains exactly `astro check --minimumSeverity error`. The
Astro 6.3.3 CLI runs `astro sync` before calling `@astrojs/check` unless the
unsupported-for-this-gate `--noSync` flag is passed. The sync path loads the
Cloudflare Vite integration and Miniflare, where the installed workerd binary
(`workerd 2026-04-21`) exits with `std::terminate() called with no exception`.
Miniflare then throws `ERR_RUNTIME_FAILURE` at
`miniflare/dist/src/index.js:87889` before Astro reaches “Getting diagnostics
for Astro files”. Because bypassing sync would weaken the required exact gate,
no workaround was adopted. The environment blocker remains explicit.

## Fix round 2 — Astro diagnostics

The controller’s exact `pnpm check:astro` run reached Astro diagnostics and
reported 17 remaining template errors. This round removes those reported
boundary mismatches: FAQ payloads are normalized to the FAQ component contract,
heading and alert blocks use their discriminated content-block types, recipe
overlays accept the render model directly, nullable image props become optional
child props, and roundup data is parsed as `RoundupJson`.

The local exact command was also re-run after these fixes, but its Miniflare
startup produced no diagnostics and remained running until stopped after about
50 seconds. The controller’s diagnostic result is therefore the actionable
Astro baseline for this round; local typecheck, full tests (89 files, 549
tests), boundary checks, and diff checks passed.

### Diagnostic result

After the fixes, `pnpm exec astro check --minimumSeverity error --noSync`
completed successfully with **0 errors** across 847 files. The required exact
`pnpm check:astro` command was re-run and again timed out after roughly one
minute without reaching diagnostics, so the sync/Miniflare startup issue
remains isolated to the exact local gate. No temporary probe files were kept.
