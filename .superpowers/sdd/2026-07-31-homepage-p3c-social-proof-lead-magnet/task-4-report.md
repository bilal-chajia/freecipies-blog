# Homepage P3C Task 4 Report

## Status

Implemented and committed Task 4 public view models and Astro components.

## RED

Command:

```text
pnpm test -- src/site/utils/__tests__/home-data.test.ts
```

Output:

```text
Test Files  1 failed | 2 passed (3)
Tests  3 failed | 37 passed (40)

FAIL trims social proof content and omits invalid items without fetching content
expected [] to deeply equal [ ObjectContaining{...} ]

FAIL resolves a complete lead magnet with a safe internal CTA without fetching content
expected [] to deeply equal [ ObjectContaining{...} ]

FAIL omits lead magnets with incomplete images or unsafe CTAs
expected [] to deeply equal [ ObjectContaining{...} ]
```

The initial sandboxed test command could not load `vitest.config.ts`; rerunning with the required filesystem access produced the expected behavioral failures above.

## GREEN

Command:

```text
pnpm test -- src/site/utils/__tests__/home-data.test.ts
```

Output:

```text
Test Files  3 passed (3)
Tests  40 passed (40)
```

Static verification:

```text
pnpm typecheck
$ tsc --noEmit --pretty false --ignoreDeprecations 6.0
exit 0

git diff --check -- <Task 4 files>
exit 0
```

## Files

- Modified: `src/site/utils/home-data.ts`
- Modified: `src/site/utils/__tests__/home-data.test.ts`
- Created: `src/site/components/home/SocialProof.astro`
- Created: `src/site/components/home/LeadMagnet.astro`
- Modified: `src/site/components/home/HomeSections.astro`

## Commit

`acc95eb feat(home): render P3C editorial sections`

## Self-Review

- Added settings-only P3C view models with no article, category, author, or media loader calls.
- Generalized homepage CTA and complete structural-image checks for spotlight, social proof, and lead magnet.
- Trimmed valid data and omitted invalid social-proof entries independently.
- Used token-only Astro styles, unframed editorial bands, responsive image `srcset`/`sizes`, fixed dimensions, lazy loading, `data-fade-up`, and no client carousel script.
- Confirmed the new Astro components do not contain `r2_key`, hardcoded colors/fonts, container queries, or decorative arrow glyphs.
- Staged and committed only the requested Task 4 files; user-owned NutritionFacts, TocHeader, and recipe-plan changes were not staged.

## Concerns

No functional concerns found in the prescribed test/typecheck scope. Browser verification was not run because no browser permission was provided.

## Fix Round 1

### RED

Command:

```text
pnpm test -- src/site/utils/__tests__/home-data.test.ts
```

Output after rerunning outside the filesystem sandbox:

```text
Test Files  1 failed | 2 passed (3)
Tests  2 failed | 41 passed (43)

FAIL omits lead magnets with incomplete images or unsafe CTAs
received an additional lead magnet with href `/\\evil.example`

FAIL uses URL-based HTTPS classification for LeadMagnet link attributes
LeadMagnet.astro did not import the URL-based CTA classifier and still used startsWith('https://')
```

### GREEN

```text
pnpm test -- src/site/utils/__tests__/home-data.test.ts
Test Files  3 passed (3)
Tests  43 passed (43)

pnpm typecheck
$ tsc --noEmit --pretty false --ignoreDeprecations 6.0
exit 0
```

### Changes

- Rejected slash-backslash CTA paths in homepage view-model validation; unsafe P3C lead magnets are omitted.
- Added URL-protocol-based HTTPS classification for the Lead Magnet CTA so uppercase HTTPS links receive `_blank` plus `noopener noreferrer`, while internal paths receive neither.
- Added a P3C media-loader boundary sentinel: importing either homepage P3C resolution code and a media loader fails the focused regression suite.

### Concerns

No functional concerns in the requested test/typecheck scope. Browser verification was not run because no browser permission was provided.
