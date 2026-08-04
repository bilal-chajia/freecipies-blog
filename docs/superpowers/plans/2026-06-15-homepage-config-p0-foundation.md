# Homepage Config — Phase 0 (Foundation) Implementation Plan

## Current Status (2026-08-03)

- [x] Foundation implementation is complete: settings contract, section types/defaults, service normalization/update, schema, and homepage API.
- [x] Focused tests, typecheck, and boundary checks are complete.
- [x] Full suite passes on merged `main` (84 test files, 530 tests). The earlier isolated-worktree `debug.test.ts` failure was caused by missing `.wrangler` D1 state.
- [ ] Manual API/browser verification remains part of the global homepage verification pass.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted, validated configuration rail for the homepage (`site_settings.homepage_settings` extended from `{ seo }` to `{ seo, sections[] }`), with no public/admin UI change yet.

**Architecture:** Mirror the existing category-page settings rail exactly: contract doc → TypeScript types + defaults → Zod discriminated-union schema → service `get`/`update` (+ KV write-through) → `/api/settings/homepage` GET/PUT. The public site keeps rendering as before; `getHomepageSettings` becomes back-compatible (missing `sections` → `DEFAULT_HOME_SECTIONS`).

**Tech Stack:** TypeScript (strict), Zod 4, Drizzle ORM, Astro API routes, Cloudflare D1/KV, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-15-homepage-config-and-redesign-design.md`

**Branch:** Work on `feat/homepage-config-redesign` (branch from `main`). This phase is backend-only and independent of the open `perf/site-cwv-fonts` PR.

**Conventions:**
- App JSON is `snake_case`; TS is `camelCase`. No `any`. Drizzle only. Inputs validated with Zod.
- Every commit ends with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Run from repo root with `pnpm`.

---

## File Structure

| File | Responsibility |
|---|---|
| `docs/SITE_SETTINGS_TABLE_CONTRACT.md` (modify) | Extend the `homepage_settings` contract with the `sections` shape + rules. |
| `src/modules/settings/types/settings.types.ts` (modify) | Section TS types, `HomepageSection` union, `HomepageSettings.sections`, `DEFAULT_HOME_SECTIONS`, extended `HOMEPAGE_SETTINGS_DEFAULTS`. |
| `src/shared/validation/schemas/settings.ts` (modify) | `HomepageSettingsSchema` (Zod discriminated union by `type`). |
| `src/shared/validation/schemas/__tests__/settings.test.ts` (create) | Zod accept/reject tests. |
| `src/modules/settings/services/settings.service.ts` (modify) | Extend `getHomepageSettings` (back-compat) + add `updateHomepageSettings`. |
| `src/modules/settings/services/__tests__/homepage-settings-service.test.ts` (create) | Service get/update tests (cache-stub, no DB). |
| `src/pages/api/settings/homepage.ts` (create) | `GET`/`PUT` route, mirrors `category-page.ts`. |

---

## Task 1: Extend the settings contract doc

**Files:**
- Modify: `docs/SITE_SETTINGS_TABLE_CONTRACT.md` (the `### Homepage Settings` section)

No test (documentation only).

- [ ] **Step 1: Update the `homepage_settings` shape example**

In `docs/SITE_SETTINGS_TABLE_CONTRACT.md`, find the `### Homepage Settings` JSON shape block (the object with only `"seo"`). Replace that ```json block with:

```json
{
  "seo": {
    "meta_title": "SaaS Blog",
    "meta_description": "Reliable recipes and cooking guides.",
    "no_index": false,
    "canonical": "https://example.com",
    "og_image": "https://example.com/images/home-og.webp",
    "og_title": "SaaS Blog",
    "og_description": "Reliable recipes and cooking guides.",
    "twitter_card": "summary_large_image"
  },
  "sections": [
    { "id": "stories", "type": "stories", "enabled": true },
    { "id": "hero", "type": "hero", "enabled": true, "mode": "slider", "show_search": true, "refs": [] },
    { "id": "featured", "type": "featured_recipes", "enabled": true, "title": "Featured Recipes", "subtitle": "Handpicked for you", "source": "latest", "category_slug": null, "count": 4, "refs": [] },
    { "id": "categories", "type": "category_browse", "enabled": true, "title": "Browse by Category", "subtitle": "", "max": 8 },
    { "id": "collections", "type": "collections", "enabled": true, "title": "Recipe Collections", "subtitle": "", "refs": [] },
    { "id": "latest", "type": "latest", "enabled": true, "title": "Latest Recipes", "count": 8 },
    { "id": "about", "type": "about_author", "enabled": true, "author_id": null },
    { "id": "newsletter", "type": "newsletter", "enabled": true, "title": "Get New Recipes Weekly", "subtitle": "Subscribe to receive delicious recipes straight to your inbox.", "button_text": "Subscribe", "placeholder_text": "Your email address" }
  ]
}
```

- [ ] **Step 2: Add section rules**

Immediately AFTER the existing homepage `Rules:` bullet list (the bullet that ends `Admin edit/preview paths can force a fresh read when needed.`) and BEFORE `### Site Identity`, insert:

```markdown
Section rules:

- `homepage_settings.sections` is an ordered array; array order is the public render
  order. Reordering is expressed by reordering the array.
- Each section has `id` (stable string), `type` (from the catalog below), and `enabled`.
- Disabled sections (`enabled = false`) are persisted but not rendered.
- v1 section `type` values: `stories`, `hero`, `featured_recipes`, `category_browse`,
  `collections`, `latest`, `about_author`, `newsletter`, `faq`. Additional catalog types
  (`quick_filters`, `seasonal_spotlight`, `popular`, `social_proof`, `lead_magnet`,
  `social_feed`, `banner`) are reserved and added in later phases; unknown types are
  rejected by validation.
- Manually-curated sections store light references, not image snapshots:
  - recipe ref: `{ article_id, headline, route, category? { label, slug, color? } }`
  - roundup ref: `{ roundup_id, title, route }`
  - author ref: `author_id` (or `null` to use the `is_featured` author)
- Images and heavy fields are resolved at render time from the live rows; settings must
  not store recipe/roundup image snapshots or `r2_key` for these refs.
- `hero.mode` is `slider` or `grid`; `hero.show_search` toggles the hero search box.
- `featured_recipes.source` is `manual`, `category`, or `latest`. With `manual`, `refs`
  drives the list; with `category`, `category_slug` selects the source; with `latest`,
  the newest published recipes are used.
- `faq.items[]` use `{ question, answer }` and are the source for homepage `FAQPage`
  JSON-LD.
- When `homepage_settings` is missing `sections` (legacy seo-only value), the service
  falls back to the default section set.
- `homepage_settings.sections` must not store Schema.org JSON-LD; JSON-LD is generated at
  render from these sections plus `organization_profile` / `site_identity`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/SITE_SETTINGS_TABLE_CONTRACT.md
git commit -m "docs(settings): extend homepage_settings contract with sections" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Homepage section types + defaults

**Files:**
- Modify: `src/modules/settings/types/settings.types.ts` (the `HomepageSettings` interface + `HOMEPAGE_SETTINGS_DEFAULTS`, around lines 108-153)
- Test: `src/modules/settings/services/__tests__/homepage-settings-service.test.ts` (created in Task 4; types here are exercised there)

This task has no standalone test — it defines types/constants consumed by Tasks 3-4. Verification is `tsc`.

- [ ] **Step 1: Replace the `HomepageSettings` interface with the section model**

In `src/modules/settings/types/settings.types.ts`, replace this exact block:

```ts
export interface HomepageSettings {
  seo: PageSeoSettings;
}
```

with:

```ts
// ── Homepage section model ──

export type HomepageSectionType =
  | 'stories'
  | 'hero'
  | 'featured_recipes'
  | 'category_browse'
  | 'collections'
  | 'latest'
  | 'about_author'
  | 'newsletter'
  | 'faq';

export interface HomepageRecipeRef {
  article_id: number;
  headline: string;
  route: string;
  category?: { label: string; slug: string; color?: string } | null;
}

export interface HomepageRoundupRef {
  roundup_id: number;
  title: string;
  route: string;
}

export interface HomepageFaqItem {
  question: string;
  answer: string;
}

interface HomepageSectionBase {
  id: string;
  enabled: boolean;
}

export interface HomepageStoriesSection extends HomepageSectionBase {
  type: 'stories';
}

export interface HomepageHeroSection extends HomepageSectionBase {
  type: 'hero';
  mode: 'slider' | 'grid';
  show_search: boolean;
  refs: HomepageRecipeRef[];
}

export interface HomepageFeaturedRecipesSection extends HomepageSectionBase {
  type: 'featured_recipes';
  title: string;
  subtitle: string;
  source: 'manual' | 'category' | 'latest';
  category_slug: string | null;
  count: number;
  refs: HomepageRecipeRef[];
}

export interface HomepageCategoryBrowseSection extends HomepageSectionBase {
  type: 'category_browse';
  title: string;
  subtitle: string;
  max: number;
}

export interface HomepageCollectionsSection extends HomepageSectionBase {
  type: 'collections';
  title: string;
  subtitle: string;
  refs: HomepageRoundupRef[];
}

export interface HomepageLatestSection extends HomepageSectionBase {
  type: 'latest';
  title: string;
  count: number;
}

export interface HomepageAboutAuthorSection extends HomepageSectionBase {
  type: 'about_author';
  author_id: number | null;
}

export interface HomepageNewsletterSection extends HomepageSectionBase {
  type: 'newsletter';
  title: string;
  subtitle: string;
  button_text: string;
  placeholder_text: string;
}

export interface HomepageFaqSection extends HomepageSectionBase {
  type: 'faq';
  title: string;
  items: HomepageFaqItem[];
}

export type HomepageSection =
  | HomepageStoriesSection
  | HomepageHeroSection
  | HomepageFeaturedRecipesSection
  | HomepageCategoryBrowseSection
  | HomepageCollectionsSection
  | HomepageLatestSection
  | HomepageAboutAuthorSection
  | HomepageNewsletterSection
  | HomepageFaqSection;

export interface HomepageSettings {
  seo: PageSeoSettings;
  sections: HomepageSection[];
}

export const DEFAULT_HOME_SECTIONS: HomepageSection[] = [
  { id: 'stories', type: 'stories', enabled: true },
  { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
  {
    id: 'featured',
    type: 'featured_recipes',
    enabled: true,
    title: 'Featured Recipes',
    subtitle: 'Handpicked for you',
    source: 'latest',
    category_slug: null,
    count: 4,
    refs: [],
  },
  { id: 'categories', type: 'category_browse', enabled: true, title: 'Browse by Category', subtitle: '', max: 8 },
  { id: 'collections', type: 'collections', enabled: true, title: 'Recipe Collections', subtitle: '', refs: [] },
  { id: 'latest', type: 'latest', enabled: true, title: 'Latest Recipes', count: 8 },
  { id: 'about', type: 'about_author', enabled: true, author_id: null },
  {
    id: 'newsletter',
    type: 'newsletter',
    enabled: true,
    title: 'Get New Recipes Weekly',
    subtitle: 'Subscribe to receive delicious recipes straight to your inbox.',
    button_text: 'Subscribe',
    placeholder_text: 'Your email address',
  },
];
```

- [ ] **Step 2: Add `sections` to `HOMEPAGE_SETTINGS_DEFAULTS`**

In the same file, find:

```ts
export const HOMEPAGE_SETTINGS_DEFAULTS: HomepageSettings = {
  seo: {
    meta_title: 'SaaS Blog',
    meta_description: 'Reliable recipes and cooking guides.',
    no_index: false,
    canonical: SITE_IDENTITY_DEFAULTS.site_url,
    og_image: SEO_DEFAULTS.default_og_image,
    og_title: 'SaaS Blog',
    og_description: 'Reliable recipes and cooking guides.',
    twitter_card: 'summary_large_image',
  },
};
```

Replace its closing `};` line so the object also includes sections — i.e. change the trailing `  },\n};` to:

```ts
  },
  sections: DEFAULT_HOME_SECTIONS,
};
```

(The `DEFAULT_HOME_SECTIONS` const is declared above in Step 1, so it is in scope.)

- [ ] **Step 3: Verify types compile**

Run: `pnpm typecheck`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/modules/settings/types/settings.types.ts
git commit -m "feat(settings): add homepage section types and default sections" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Extend service get + add update

**Files:**
- Modify: `src/modules/settings/services/settings.service.ts` (the `getHomepageSettings` function, ~lines 377-390; and the type imports block ~lines 242-259)

Test is added in Task 4 (the service and its tests are committed together there). Verification here is `tsc`.

- [ ] **Step 1: Import the new constants/types**

In `src/modules/settings/services/settings.service.ts`, find the import from `'../types/settings.types'` (the block starting `HOMEPAGE_SETTINGS_DEFAULTS,`). Add these two lines inside that import list:

```ts
  DEFAULT_HOME_SECTIONS,
```
(add near `HOMEPAGE_SETTINGS_DEFAULTS,`) and, in the `type` imports of the same statement, add:
```ts
  type HomepageSection,
```

- [ ] **Step 2: Replace `getHomepageSettings` with a sections-aware version**

Replace this exact function:

```ts
export async function getHomepageSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<HomepageSettings> {
  const stored = await getSettingValue<Partial<HomepageSettings>>(db, 'homepage_settings', options);
  return {
    ...HOMEPAGE_SETTINGS_DEFAULTS,
    ...(stored && typeof stored === 'object' ? stored : {}),
    seo: {
      ...HOMEPAGE_SETTINGS_DEFAULTS.seo,
      ...(stored?.seo && typeof stored.seo === 'object' ? stored.seo : {}),
    },
  };
}
```

with:

```ts
export async function getHomepageSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<HomepageSettings> {
  const stored = await getSettingValue<Partial<HomepageSettings>>(db, 'homepage_settings', options);
  return {
    seo: {
      ...HOMEPAGE_SETTINGS_DEFAULTS.seo,
      ...(stored?.seo && typeof stored.seo === 'object' ? stored.seo : {}),
    },
    sections:
      Array.isArray(stored?.sections) && stored.sections.length > 0
        ? (stored.sections as HomepageSection[])
        : DEFAULT_HOME_SECTIONS,
  };
}

export async function updateHomepageSettings(
  db: D1Database | DrizzleDb,
  updates: Partial<HomepageSettings>,
  options?: SettingServiceOptions,
): Promise<HomepageSettings> {
  const current = await getHomepageSettings(db);
  const merged: HomepageSettings = {
    seo: { ...current.seo, ...(updates.seo ?? {}) },
    sections: Array.isArray(updates.sections) ? updates.sections : current.sections,
  };

  await upsertSetting(db, 'homepage_settings', merged, {
    description: 'Homepage sections and SEO configuration',
    category: 'appearance',
    type: 'json',
    cache: options?.cache,
  });

  return merged;
}
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm typecheck`
Expected: PASS.

(No commit yet — committed with its tests in Task 4.)

---

## Task 4: Service tests (TDD)

**Files:**
- Test: `src/modules/settings/services/__tests__/homepage-settings-service.test.ts` (create)

- [ ] **Step 1: Write the failing tests**

Create `src/modules/settings/services/__tests__/homepage-settings-service.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getHomepageSettings,
  updateHomepageSettings,
  type SettingsCacheStore,
} from '../settings.service';
import { DEFAULT_HOME_SECTIONS, HOMEPAGE_SETTINGS_DEFAULTS } from '../../types/settings.types';

// Cache-hit path: getSettingValue returns the cached value WITHOUT touching the DB.
function cacheReturning(value: string | null) {
  return {
    get: async () => value,
    put: async () => {},
    delete: async () => {},
  };
}

const NO_DB = {} as never;

describe('getHomepageSettings', () => {
  it('defaults sections when the stored value is seo-only (back-compat)', async () => {
    const cache = cacheReturning(
      JSON.stringify({ seo: { meta_title: 'Custom' } }),
    ) as unknown as SettingsCacheStore;
    const result = await getHomepageSettings(NO_DB, { cache });
    expect(result.seo.meta_title).toBe('Custom');
    expect(result.sections).toEqual(DEFAULT_HOME_SECTIONS);
  });

  it('uses stored sections when present and falls back seo to defaults', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: false, mode: 'grid', show_search: false, refs: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;
    const result = await getHomepageSettings(NO_DB, { cache });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].enabled).toBe(false);
    expect(result.seo.meta_title).toBe(HOMEPAGE_SETTINGS_DEFAULTS.seo.meta_title);
  });

  it('exports updateHomepageSettings as a function', () => {
    expect(typeof updateHomepageSettings).toBe('function');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm exec vitest run src/modules/settings/services/__tests__/homepage-settings-service.test.ts`
Expected: PASS (Task 3 already implemented the behavior). If any fail, fix the service in `settings.service.ts` until green.

- [ ] **Step 3: Commit**

```bash
git add src/modules/settings/services/settings.service.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts
git commit -m "feat(settings): sections-aware getHomepageSettings + updateHomepageSettings" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Zod schema (TDD)

**Files:**
- Modify: `src/shared/validation/schemas/settings.ts` (append after the Category page settings section)
- Test: `src/shared/validation/schemas/__tests__/settings.test.ts` (create)

- [ ] **Step 1: Write the failing tests**

Create `src/shared/validation/schemas/__tests__/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { HomepageSettingsSchema } from '../settings';

describe('HomepageSettingsSchema', () => {
  it('accepts a valid sections array', () => {
    const result = HomepageSettingsSchema.safeParse({
      seo: { meta_title: 'Home' },
      sections: [
        { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
        {
          id: 'featured',
          type: 'featured_recipes',
          enabled: true,
          title: 'Featured',
          subtitle: '',
          source: 'manual',
          category_slug: null,
          count: 4,
          refs: [
            { article_id: 12, headline: 'Pasta', route: '/recipes/pasta', category: { label: 'Dinner', slug: 'dinner' } },
          ],
        },
        { id: 'faq', type: 'faq', enabled: true, title: 'FAQ', items: [{ question: 'Q?', answer: 'A.' }] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown section type', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [{ id: 'x', type: 'mystery', enabled: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a hero section missing required fields', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [{ id: 'hero', type: 'hero', enabled: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = HomepageSettingsSchema.safeParse({ nope: true });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/shared/validation/schemas/__tests__/settings.test.ts`
Expected: FAIL — `HomepageSettingsSchema` is not exported yet.

- [ ] **Step 3: Implement the schema**

In `src/shared/validation/schemas/settings.ts`, append at the end of the file:

```ts
// ────────────────────────────────────────────
// Homepage settings schema
// ────────────────────────────────────────────

const HomepagePageSeoSchema = z
  .object({
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    no_index: z.boolean().optional(),
    canonical: z.string().optional(),
    og_image: z.string().optional(),
    og_title: z.string().optional(),
    og_description: z.string().optional(),
    twitter_card: z.enum(['summary', 'summary_large_image']).optional(),
  })
  .strict();

const HomepageRecipeRefSchema = z
  .object({
    article_id: z.number().int().positive(),
    headline: z.string(),
    route: z.string().min(1),
    category: z
      .object({
        label: z.string(),
        slug: z.string(),
        color: z.string().optional(),
      })
      .nullable()
      .optional(),
  })
  .strict();

const HomepageRoundupRefSchema = z
  .object({
    roundup_id: z.number().int().positive(),
    title: z.string(),
    route: z.string().min(1),
  })
  .strict();

const homepageSectionBase = {
  id: z.string().min(1),
  enabled: z.boolean(),
};

const HomepageSectionSchema = z.discriminatedUnion('type', [
  z.object({ ...homepageSectionBase, type: z.literal('stories') }).strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('hero'),
      mode: z.enum(['slider', 'grid']),
      show_search: z.boolean(),
      refs: z.array(HomepageRecipeRefSchema),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('featured_recipes'),
      title: z.string(),
      subtitle: z.string(),
      source: z.enum(['manual', 'category', 'latest']),
      category_slug: z.string().nullable(),
      count: z.number().int().min(1).max(24),
      refs: z.array(HomepageRecipeRefSchema),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('category_browse'),
      title: z.string(),
      subtitle: z.string(),
      max: z.number().int().min(1).max(24),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('collections'),
      title: z.string(),
      subtitle: z.string(),
      refs: z.array(HomepageRoundupRefSchema),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('latest'),
      title: z.string(),
      count: z.number().int().min(1).max(24),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('about_author'),
      author_id: z.number().int().positive().nullable(),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('newsletter'),
      title: z.string(),
      subtitle: z.string(),
      button_text: z.string(),
      placeholder_text: z.string(),
    })
    .strict(),
  z
    .object({
      ...homepageSectionBase,
      type: z.literal('faq'),
      title: z.string(),
      items: z.array(
        z.object({ question: z.string().min(1), answer: z.string().min(1) }).strict(),
      ),
    })
    .strict(),
]);

/** PUT body for homepage settings: optional seo + optional ordered sections array. */
export const HomepageSettingsSchema = z
  .object({
    seo: HomepagePageSeoSchema.optional(),
    sections: z.array(HomepageSectionSchema).optional(),
  })
  .strict();
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run src/shared/validation/schemas/__tests__/settings.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/validation/schemas/settings.ts src/shared/validation/schemas/__tests__/settings.test.ts
git commit -m "feat(settings): add HomepageSettingsSchema discriminated-union validation" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: API route GET/PUT

**Files:**
- Create: `src/pages/api/settings/homepage.ts`

This mirrors `src/pages/api/settings/category-page.ts` (same auth posture, error helpers, cache resolution). No unit test (the repo verifies settings routes via dev/E2E, consistent with `category-page.ts`); verification is manual against `pnpm dev`.

- [ ] **Step 1: Create the route**

Create `src/pages/api/settings/homepage.ts`:

```ts
/**
 * Homepage Settings API (global)
 *
 * GET  - Retrieve homepage settings (seo + ordered sections)
 * PUT  - Update homepage settings (partial: seo and/or full sections array)
 *
 * Source of truth: site_settings.homepage_settings (see SITE_SETTINGS_TABLE_CONTRACT.md).
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getHomepageSettings, updateHomepageSettings } from '@modules/settings/services/settings.service';
import { validateBody } from '@shared/validation';
import { HomepageSettingsSchema } from '@shared/validation/schemas/settings';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

const getSettingsCache = () => env?.SETTINGS_CACHE ?? env?.SESSION ?? null;

/** GET /api/settings/homepage */
export const GET: APIRoute = async () => {
  try {
    const db = env?.DB;
    if (!db) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500),
      );
      return new Response(body, { status, headers });
    }

    const settings = await getHomepageSettings(db, { cache: getSettingsCache() });

    const { body, status, headers } = formatSuccessResponse({ homepage: settings });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching homepage settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch homepage settings', 500),
    );
    return new Response(body, { status, headers });
  }
};

/** PUT /api/settings/homepage — Body: Partial<HomepageSettings> */
export const PUT: APIRoute = async ({ request }) => {
  try {
    const db = env?.DB;
    if (!db) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500),
      );
      return new Response(body, { status, headers });
    }

    const body = await validateBody(request, HomepageSettingsSchema);
    const updated = await updateHomepageSettings(db, body, { cache: getSettingsCache() });

    const { body: responseBody, status, headers } = formatSuccessResponse({ homepage: updated });
    return new Response(responseBody, { status, headers });
  } catch (error) {
    console.error('Error updating homepage settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update homepage settings', 500),
    );
    return new Response(body, { status, headers });
  }
};
```

- [ ] **Step 2: Manual verification against dev**

Start dev (`pnpm dev`) in one terminal. In another:

Run:
```bash
curl -s http://localhost:4321/api/settings/homepage | head -c 400
```
Expected: JSON success with `"homepage": { "seo": {...}, "sections": [ ... 8 sections ... ] }`.

Run (toggle one section off, then read back):
```bash
curl -s -X PUT http://localhost:4321/api/settings/homepage \
  -H 'Content-Type: application/json' \
  -d '{"sections":[{"id":"stories","type":"stories","enabled":false}]}'
curl -s http://localhost:4321/api/settings/homepage | head -c 200
```
Expected: PUT returns success with the single stored section; the follow-up GET returns that same single section (persistence + KV write-through confirmed). (Restore defaults afterward by PUTting the full default array if desired, or delete the `homepage_settings` row.)

> Note: if `/api/settings/*` is gated by admin auth middleware in this project, run the
> curls with the same session/cookie the admin UI uses, or perform the toggle from the
> admin once Phase 2 is built. The route itself adds no auth beyond the existing
> `category-page.ts` posture.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/settings/homepage.ts
git commit -m "feat(settings): add /api/settings/homepage GET/PUT route" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Phase verification gate

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all tests pass, including the two new files.

- [ ] **Step 2: Boundaries**

Run: `pnpm check:boundaries`
Expected: PASS (no new violations; `src/pages/api` → `@modules`/`@shared` is allowed, matching `category-page.ts`).

- [ ] **Step 3: Type check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Confirm green and stop**

Phase 0 is complete: `homepage_settings` now carries validated `sections`, the service is
back-compatible, and the API persists with cache write-through — with no visible change to
the public site or admin yet. Hand off for Phase 1 (render rail + redesign) plan.

---

## Self-Review (completed)

- **Spec coverage (P0 scope):** contract extension (Task 1), types + defaults (Task 2),
  Zod discriminated union (Task 5), `getHomepageSettings` back-compat + `updateHomepageSettings`
  + KV write-through (Tasks 3-4), `/api/settings/homepage` GET/PUT (Task 6). The 7 reserved
  later-phase section types are intentionally out of this phase (documented in Task 1 rules).
- **Placeholder scan:** none — every code/step contains concrete content.
- **Type consistency:** `HomepageSection`, `HomepageRecipeRef`, `HomepageRoundupRef`,
  `DEFAULT_HOME_SECTIONS`, `HOMEPAGE_SETTINGS_DEFAULTS`, `getHomepageSettings`,
  `updateHomepageSettings`, and `HomepageSettingsSchema` names are used consistently across
  types, service, schema, tests, and route. The Zod section fields match the TS interfaces
  field-for-field.
```
