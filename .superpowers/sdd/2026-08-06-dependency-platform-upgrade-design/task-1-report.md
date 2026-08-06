# Task 1 — Astro baseline report

## Status

`DONE`

## Files changed

- `package.json`
- `src/site/utils/content-render.ts`
- `src/site/utils/__tests__/content-render.test.ts`
- `src/site/layouts/RecipeLayout.astro`
- `src/site/layouts/RoundupLayout.astro`
- `src/site/components/ContentRenderer.astro`
- `src/site/components/RecipeCard.astro`
- `src/site/components/content/CookModeOverlay.astro`
- `src/site/components/content/PrintRecipeOverlay.astro`
- `src/site/components/content/blocks/Alert.astro`
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
| `pnpm check:astro` | Passed: 0 errors across 847 files. |
| `pnpm typecheck` | Passed. |
| `pnpm test` | Passed: 89 files, 549 tests. |
| `pnpm check:boundaries` | Passed. |
| `git diff --check` | Passed. |

Focused TDD coverage was added first for hydrated and sparse-preview boundary
inputs. It failed initially because the new module did not exist, then passed
with 2 tests after implementation.

## Astro Check resolution

The required command is exactly `astro check --minimumSeverity error`. An
initial Windows/Miniflare startup failure and a later local timeout were
transient: the controller re-ran the exact `pnpm check:astro` command after
commit `f812ea6`, and it completed in approximately 59 seconds with **0
errors** across 847 files. No build, preview, browser, package-version, or
contract-document change was performed.

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

The initial Miniflare startup failure was investigated without changing the
required command or adopting a workaround. The final controller run of the
exact gate subsequently completed successfully; see the final verification
below.

## Fix round 2 — Astro diagnostics

The controller’s exact `pnpm check:astro` run reached Astro diagnostics and
reported 17 remaining template errors. This round removes those reported
boundary mismatches: FAQ payloads are normalized to the FAQ component contract,
heading and alert blocks use their discriminated content-block types, recipe
overlays accept the render model directly, nullable image props become optional
child props, and roundup data is parsed as `RoundupJson`.

The final controller run of the exact gate completed successfully after these
fixes. Local typecheck, the full test suite (89 files, 549 tests), boundary
checks, and diff checks also passed.

### Diagnostic result

`pnpm exec astro check --minimumSeverity error --noSync` completed successfully
with **0 errors** across 847 files during local diagnosis. More importantly,
the final required exact `pnpm check:astro` controller run completed in
approximately 59 seconds with **0 errors** across 847 files. Final verification
also passed: `pnpm typecheck`; `pnpm test` (89 files, 549 tests); `pnpm
check:boundaries`; and `git diff --check`.
