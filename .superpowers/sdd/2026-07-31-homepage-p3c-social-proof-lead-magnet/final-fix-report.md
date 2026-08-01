# P3C Final Review Fix Report

Date: 2026-07-31

## Scope

Implemented the final P3C review findings on branch
`feat/homepage-config-redesign`, starting from `93ec669d`. No browser was
opened, no development server was started, and `pnpm build` was not run.

## Findings and fixes

1. Social-proof validation required an enabled section to have an eyebrow,
   although the approved design and public renderer treat it as optional.
   The enabled schema now requires only a nonblank title plus at least one
   valid stat, testimonial, or logo. Required fields on every retained item
   and existing array limits remain enforced.
2. Missing P3C defaults used only their primary insertion anchors and appended
   when those anchors were absent. Normalization now inserts `social_proof`
   after `latest`, otherwise before `about_author`, and inserts `lead_magnet`
   after `about_author`, otherwise before `newsletter`. Existing sections keep
   their relative order and FAQ remains fixed last. Getter and direct-update
   persistence paths use the same normalizer.
3. Social-proof logo images now use `filter: grayscale(1)` for the specified
   monochrome treatment. Existing responsive source selection, intrinsic
   dimensions, lazy loading, alt text, and token-based surrounding styles are
   unchanged; no color literal was introduced.
4. `SITE_SETTINGS_TABLE_CONTRACT.md` now states that the social-proof eyebrow
   is optional and normatively requires FAQ to be the only fixed-position,
   final homepage section on both read and update normalization.

## TDD evidence

Baseline before test edits:

```text
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/shared/validation/schemas/__tests__/settings.test.ts
PASS: 6 test files, 37 tests
```

RED schema regression:

```text
pnpm test -- src/shared/validation/schemas/__tests__/settings.test.ts
FAIL: 1 test failed, 21 passed
Failure: enabled social proof with blank eyebrow, valid title, and valid stat was rejected
```

RED normalization regressions:

```text
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts
FAIL: 3 tests failed, 16 passed
Failures: social_proof appended instead of falling back before about_author;
lead_magnet appended instead of falling back before newsletter; direct-save
persistence reproduced the same incorrect social_proof order
```

Focused GREEN runs:

```text
Schema: 3 test files passed, 22 tests passed
Normalization: 3 test files passed, 19 tests passed
```

The final validation tests independently reject a blank social-proof title and
an enabled section with no valid item, while accepting a blank eyebrow with a
valid title and item.

## Final verification

```text
P3C targeted Vitest command: PASS, 12 test files, 101 tests
pnpm typecheck: PASS
pnpm check:boundaries: PASS (Boundary check passed.)
git diff --check: PASS
```

## Files

- `src/shared/validation/schemas/settings.ts`
- `src/shared/validation/schemas/__tests__/settings.test.ts`
- `src/modules/settings/services/settings.service.ts`
- `src/modules/settings/services/__tests__/homepage-settings-service.test.ts`
- `src/site/components/home/SocialProof.astro`
- `docs/SITE_SETTINGS_TABLE_CONTRACT.md`
- `.superpowers/sdd/2026-07-31-homepage-p3c-social-proof-lead-magnet/final-fix-report.md`

## Commit

Single commit subject: `fix(homepage): close P3C final review gaps`.

The final hash is reported in the task result because a commit cannot contain
its own final object hash.

## Protected worktree state

The pre-existing user-owned changes remained untouched and are excluded from
the P3C stage:

- `src/site/components/content/NutritionFacts.astro`
- `src/site/components/content/toc/TocHeader.astro`
- `docs/superpowers/plans/2026-07-29-recipes-pages-fixes.md`

## Concerns

- Visual browser verification was intentionally not performed. The grayscale
  rule was inspected statically; responsive and accessibility markup was not
  changed.
- The Task 6 report records a pre-existing repository-wide `pnpm astro check`
  failure in non-P3C files. That command was not part of this final-fix request
  and was not rerun.
