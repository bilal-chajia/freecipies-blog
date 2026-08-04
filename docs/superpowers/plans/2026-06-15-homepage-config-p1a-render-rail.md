# Homepage Config — Phase 1a (Render Rail) Implementation Plan

## Current Status (2026-08-03)

- [x] Render rail implementation is complete: homepage resolver, JSON-LD foundation, section components, dispatcher, visible H1, and settings-driven rendering.
- [x] Static and focused verification is complete.
- [ ] Browser render verification and Lighthouse re-check remain pending.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public homepage render from `homepage_settings.sections` (Phase 0) instead of hardcoded slices — by splitting `index.astro` into focused `home/*` components driven by a typed dispatcher, adding a semantic `<h1>` and homepage JSON-LD (WebSite/SearchAction/Organization), while reusing the current visual styles (no redesign yet — that is Phase 1b).

**Architecture:** A pure resolver (`resolveHomeData`) turns the ordered `sections` config into an ordered array of typed view-models (fetching live data per section, caching the shared "latest recipes" query). A dispatcher component (`HomeSections.astro`) maps each view-model to its section component. `index.astro` becomes a thin orchestrator: load settings + identity, resolve data, emit `<h1>` + JSON-LD, delegate. Existing section markup/CSS is moved verbatim into the new components and rewired to read from props.

**Tech Stack:** Astro SSR, Cloudflare D1, TypeScript (strict, no `any`), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-15-homepage-config-and-redesign-design.md` (§6 render refactor, §8 SEO/AEO). Phase 0 plan: `docs/superpowers/plans/2026-06-15-homepage-config-p0-foundation.md`.

**Branch:** continue on `feat/homepage-config-redesign` (Phase 0 already merged into it).

**Conventions:** No `any`. `src/site` must not access Cloudflare bindings directly except `env.DB` already used in `index.astro` (pages may; components receive resolved data as props). Reuse existing path aliases (`@components`, `@layouts`, `@site`, `@modules`, `@server`, `@shared`). Every commit ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Reference: existing data/signatures (already in the repo)

- `getArticles(db, { type?, workflow_status?, categorySlug?, limit? }): Promise<{ items: HydratedArticle[] }>` — `@modules/articles`. Roundups are `type: 'roundup'`; recipes `type: 'recipe'`.
- `getArticleById(db, id): Promise<HydratedArticle | null>` — hydrated (includes `category.label/slug/color`, `tags`).
- `getCategories(db, { workflow_status }): Promise<RawCategory[]>` then `hydrateCategory(c): HydratedCategory` — `@modules/categories`, `@shared/utils/hydration`.
- `getAuthors(db, { workflow_status }): Promise<Author[]>` — `@modules/authors`; `Author` has `id`, `is_featured`, `images_json`, `name`, `slug`, `short_description`.
- `getStories(): Promise<StoryPreview[]>`, `getPublicHomepageSettings()`, `getPublicSiteIdentity()`, `getPublicOrganizationProfile()`, `getPublicSocialLinks()` — `@server/site-data`.
- Image helpers used by current markup: `extractImage(images_json, slot, width)`, `getImageSrcSet(images_json, slot)` — `@shared/utils`. `parseCachedRecipe(cached_recipe_json)` — `@modules/articles/utils/cached-fields`.
- `HydratedArticle` exposes `category?.color` directly — use it for badge colors (no category-color map needed).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/site/utils/home-data.ts` (create) | `HomeSectionVM` union + `resolveHomeData(sections, ctx)` pure resolver. |
| `src/site/utils/home-jsonld.ts` (create) | `buildHomeJsonLd(input)` → WebSite/SearchAction + Organization nodes. |
| `src/site/components/home/HomeSections.astro` (create) | Dispatcher: VM → section component, in order. |
| `src/site/components/home/HeroSection.astro` (create) | Hero slider + side cards (moved from index.astro). |
| `src/site/components/home/FeaturedRecipes.astro` (create) | "Popular/Featured" foxiz card grid (moved). |
| `src/site/components/home/CategoryBrowse.astro` (create) | Category chips/filter row (moved). |
| `src/site/components/home/Collections.astro` (create) | Roundup collection cards (new; renders nothing if empty). |
| `src/site/components/home/LatestRecipes.astro` (create) | "More Recipes" vertical card grid (moved). |
| `src/site/components/home/AboutAuthor.astro` (create) | About-the-author band (moved). |
| `src/site/components/home/NewsletterBanner.astro` (create) | Newsletter banner (moved, copy from props). |
| `src/pages/index.astro` (rewrite) | Thin orchestrator + `<h1>` + JSON-LD + `<HomeSections>`. |
| `src/site/utils/__tests__/home-data.test.ts` (create) | Resolver selection logic tests (mocked modules). |
| `src/site/utils/__tests__/home-jsonld.test.ts` (create) | JSON-LD builder tests. |

---

## Task 1: JSON-LD builder (TDD)

**Files:**
- Create: `src/site/utils/home-jsonld.ts`
- Test: `src/site/utils/__tests__/home-jsonld.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/site/utils/__tests__/home-jsonld.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildHomeJsonLd } from '../home-jsonld';

const identity = { site_name: 'Freecipes', site_url: 'https://x.test', tagline: 'Good food', locale: 'en-US' };
const organization = { name: 'Freecipes', url: 'https://x.test', logo_url: 'https://x.test/logo.png', same_as: ['https://instagram.com/x'], contact_email: 'c@x.test' };

describe('buildHomeJsonLd', () => {
  it('emits a WebSite node with a SearchAction', () => {
    const [website] = buildHomeJsonLd({ identity, organization, socialLinks: [], searchUrlTemplate: 'https://x.test/recipes?q={search_term_string}' });
    expect(website['@type']).toBe('WebSite');
    expect(website.url).toBe('https://x.test');
    expect(website.potentialAction['@type']).toBe('SearchAction');
    expect(website.potentialAction.target.urlTemplate).toContain('{search_term_string}');
  });

  it('emits an Organization node merging same_as with social links (deduped)', () => {
    const nodes = buildHomeJsonLd({
      identity, organization,
      socialLinks: [{ network: 'instagram', url: 'https://instagram.com/x', label: '@x' }, { network: 'youtube', url: 'https://youtube.com/x', label: 'YT' }],
      searchUrlTemplate: 'https://x.test/recipes?q={search_term_string}',
    });
    const org = nodes.find((n) => n['@type'] === 'Organization');
    expect(org).toBeDefined();
    expect(org!.sameAs).toEqual(['https://instagram.com/x', 'https://youtube.com/x']);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm exec vitest run src/site/utils/__tests__/home-jsonld.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/site/utils/home-jsonld.ts`:

```ts
import type {
  OrganizationProfileSettings,
  PublicSocialLink,
  SiteIdentitySettings,
} from '@modules/settings/types/settings.types';

export interface HomeJsonLdInput {
  identity: SiteIdentitySettings;
  organization: OrganizationProfileSettings;
  socialLinks: PublicSocialLink[];
  /** Absolute URL template containing the literal `{search_term_string}`. */
  searchUrlTemplate: string;
}

type JsonLdNode = Record<string, unknown> & { '@type': string };

/** Build homepage JSON-LD: a WebSite (+ SearchAction) node and an Organization node. */
export function buildHomeJsonLd(input: HomeJsonLdInput): JsonLdNode[] {
  const { identity, organization, socialLinks, searchUrlTemplate } = input;

  const website: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: identity.site_name,
    url: identity.site_url,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: searchUrlTemplate },
      'query-input': 'required name=search_term_string',
    },
  };

  const sameAs = [...organization.same_as, ...socialLinks.map((l) => l.url)].filter(
    (url, index, arr) => Boolean(url) && arr.indexOf(url) === index,
  );

  const org: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organization.name,
    url: organization.url,
    logo: organization.logo_url,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return [website, org];
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm exec vitest run src/site/utils/__tests__/home-jsonld.test.ts` → PASS (2). Then `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/site/utils/home-jsonld.ts src/site/utils/__tests__/home-jsonld.test.ts
git commit -m "feat(home): add homepage JSON-LD builder (WebSite/SearchAction/Organization)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Home data resolver (TDD)

**Files:**
- Create: `src/site/utils/home-data.ts`
- Test: `src/site/utils/__tests__/home-data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/site/utils/__tests__/home-data.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getArticles = vi.fn();
const getArticleById = vi.fn();
const getCategories = vi.fn();
const getAuthors = vi.fn();

vi.mock('@modules/articles', () => ({ getArticles, getArticleById }));
vi.mock('@modules/categories', () => ({ getCategories }));
vi.mock('@modules/authors', () => ({ getAuthors }));
vi.mock('@shared/utils/hydration', () => ({ hydrateCategory: (c: unknown) => c }));

import { resolveHomeData } from '../home-data';
import type { HomepageSection } from '@modules/settings/types/settings.types';

const DB = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  getArticles.mockResolvedValue({ items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
  getCategories.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  getAuthors.mockResolvedValue([{ id: 9, is_featured: true }, { id: 10, is_featured: false }]);
});

it('skips disabled sections', async () => {
  const sections: HomepageSection[] = [
    { id: 'latest', type: 'latest', enabled: false, title: 'L', count: 4 },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms).toHaveLength(0);
});

it('resolves latest recipes via getArticles and respects count', async () => {
  const sections: HomepageSection[] = [
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 2 },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms[0]).toMatchObject({ kind: 'latest' });
  expect((vms[0] as { recipes: unknown[] }).recipes).toHaveLength(2);
  expect(getArticles).toHaveBeenCalledWith(DB, expect.objectContaining({ type: 'recipe', workflow_status: 'published' }));
});

it('only fetches the shared latest list once across hero + featured + latest', async () => {
  const sections: HomepageSection[] = [
    { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
    { id: 'featured', type: 'featured_recipes', enabled: true, title: 'F', subtitle: '', source: 'latest', category_slug: null, count: 4, refs: [] },
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 4 },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  // one recipe-type query is reused for all three auto sections
  expect(getArticles).toHaveBeenCalledTimes(1);
});

it('picks the is_featured author when author_id is null', async () => {
  const sections: HomepageSection[] = [
    { id: 'about', type: 'about_author', enabled: true, author_id: null },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect((vms[0] as { author: { id: number } }).author.id).toBe(9);
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm exec vitest run src/site/utils/__tests__/home-data.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/site/utils/home-data.ts`:

```ts
import type { D1Database } from '@cloudflare/workers-types';
import { getArticles, getArticleById } from '@modules/articles';
import { getCategories } from '@modules/categories';
import { getAuthors } from '@modules/authors';
import { hydrateCategory } from '@shared/utils/hydration';
import type { HydratedArticle } from '@modules/articles/types';
import type { HydratedCategory } from '@modules/categories/types/categories.types';
import type { Author } from '@modules/authors/schema/authors.schema';
import type { StoryPreview } from '@server/site-data';
import type {
  HomepageSection,
  HomepageStoriesSection,
  HomepageHeroSection,
  HomepageFeaturedRecipesSection,
  HomepageCategoryBrowseSection,
  HomepageCollectionsSection,
  HomepageLatestSection,
  HomepageAboutAuthorSection,
  HomepageNewsletterSection,
} from '@modules/settings/types/settings.types';

export type HomeSectionVM =
  | { kind: 'stories'; section: HomepageStoriesSection; stories: StoryPreview[] }
  | { kind: 'hero'; section: HomepageHeroSection; recipes: HydratedArticle[] }
  | { kind: 'featured_recipes'; section: HomepageFeaturedRecipesSection; recipes: HydratedArticle[] }
  | { kind: 'category_browse'; section: HomepageCategoryBrowseSection; categories: HydratedCategory[] }
  | { kind: 'collections'; section: HomepageCollectionsSection; roundups: HydratedArticle[] }
  | { kind: 'latest'; section: HomepageLatestSection; recipes: HydratedArticle[] }
  | { kind: 'about_author'; section: HomepageAboutAuthorSection; author: Author | null }
  | { kind: 'newsletter'; section: HomepageNewsletterSection };

export interface ResolveContext {
  db: D1Database;
  stories: StoryPreview[];
}

async function resolveArticlesByIds(db: D1Database, ids: number[]): Promise<HydratedArticle[]> {
  const rows = await Promise.all(ids.map((id) => getArticleById(db, id)));
  return rows.filter((row): row is HydratedArticle => row !== null);
}

/** Turn the ordered, enabled homepage sections into ordered, data-loaded view-models. */
export async function resolveHomeData(
  sections: HomepageSection[],
  ctx: ResolveContext,
): Promise<HomeSectionVM[]> {
  const { db, stories } = ctx;

  // Shared "latest recipes" query, fetched at most once and sliced per section.
  let latestCache: HydratedArticle[] | null = null;
  const latestRecipes = async (count: number): Promise<HydratedArticle[]> => {
    if (latestCache === null) {
      const { items } = await getArticles(db, { type: 'recipe', workflow_status: 'published', limit: 24 });
      latestCache = items;
    }
    return latestCache.slice(0, count);
  };

  const vms: HomeSectionVM[] = [];

  for (const section of sections) {
    if (!section.enabled) continue;

    switch (section.type) {
      case 'stories':
        vms.push({ kind: 'stories', section, stories });
        break;

      case 'hero': {
        const recipes = section.refs.length > 0
          ? await resolveArticlesByIds(db, section.refs.map((ref) => ref.article_id))
          : await latestRecipes(4);
        vms.push({ kind: 'hero', section, recipes });
        break;
      }

      case 'featured_recipes': {
        let recipes: HydratedArticle[];
        if (section.source === 'manual' && section.refs.length > 0) {
          recipes = await resolveArticlesByIds(db, section.refs.map((ref) => ref.article_id));
        } else if (section.source === 'category' && section.category_slug) {
          const { items } = await getArticles(db, { type: 'recipe', workflow_status: 'published', categorySlug: section.category_slug, limit: section.count });
          recipes = items;
        } else {
          recipes = await latestRecipes(section.count);
        }
        vms.push({ kind: 'featured_recipes', section, recipes });
        break;
      }

      case 'category_browse': {
        const raw = await getCategories(db, { workflow_status: 'published' });
        const categories = raw.map(hydrateCategory).slice(0, section.max);
        vms.push({ kind: 'category_browse', section, categories });
        break;
      }

      case 'collections': {
        const roundups = section.refs.length > 0
          ? await resolveArticlesByIds(db, section.refs.map((ref) => ref.roundup_id))
          : (await getArticles(db, { type: 'roundup', workflow_status: 'published', limit: 6 })).items;
        vms.push({ kind: 'collections', section, roundups });
        break;
      }

      case 'latest': {
        const recipes = await latestRecipes(section.count);
        vms.push({ kind: 'latest', section, recipes });
        break;
      }

      case 'about_author': {
        const authorsList = await getAuthors(db, { workflow_status: 'published' });
        const author = section.author_id != null
          ? authorsList.find((a) => a.id === section.author_id) ?? null
          : authorsList.find((a) => a.is_featured) ?? authorsList[0] ?? null;
        vms.push({ kind: 'about_author', section, author });
        break;
      }

      case 'newsletter':
        vms.push({ kind: 'newsletter', section });
        break;

      case 'faq':
        // FAQ rendering + FAQPage JSON-LD ship in Phase 3; skip in Phase 1a.
        break;
    }
  }

  return vms;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm exec vitest run src/site/utils/__tests__/home-data.test.ts` → PASS (4). Then `pnpm typecheck` → PASS.

> If `getCategories`/`getAuthors` real signatures reject the `{ workflow_status }` arg in typecheck, match the exact call already used in the current `src/pages/index.astro` (it calls `getCategories(env.DB, { workflow_status: 'published' })` and `getAuthors(env.DB, { workflow_status: 'published' })`). Do not change those module signatures.

- [ ] **Step 5: Commit**

```bash
git add src/site/utils/home-data.ts src/site/utils/__tests__/home-data.test.ts
git commit -m "feat(home): add settings-driven homepage data resolver" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Tasks 3–9: Section components (extraction + rewire)

Each component lives in `src/site/components/home/`. **Strategy:** move the matching markup block AND its scoped CSS verbatim from the CURRENT `src/pages/index.astro`, then rewire it to read from props instead of the page-level variables. Keep the existing class names and styles (this phase is NOT a redesign). Use `recipe.category?.color || 'var(--brand-primary)'` for badge colors (drop the old `categoryColorMap`). Each component must render nothing when its data is empty (return null / `{data.length > 0 && (...)}`).

Shared image helper to inline at the top of any component that renders recipe images (same behavior as the current page helper):

```ts
import { extractImage, getImageSrcSet } from '@shared/utils';
import type { HydratedArticle } from '@modules/articles/types';

const getRecipeImage = (recipe: HydratedArticle, targetWidth: number, prefer: 'hero' | 'thumbnail' = 'hero') => {
  const hero = extractImage(recipe.images_json, 'hero', targetWidth);
  const thumbnail = extractImage(recipe.images_json, 'thumbnail', targetWidth);
  const slotName = prefer === 'hero' ? (hero.image_url ? 'hero' : 'thumbnail') : (thumbnail.image_url ? 'thumbnail' : 'hero');
  const selected = slotName === 'hero' ? hero : thumbnail;
  const srcSet = getImageSrcSet(recipe.images_json, slotName);
  return { selected, srcSet };
};

const getRecipeUrl = (recipe: HydratedArticle) => recipe.route || `/recipes/${recipe.slug}`;
```

### Task 3: `HeroSection.astro`
- **Props:** `{ section: HomepageHeroSection; recipes: HydratedArticle[] }`.
- Move the `hero-grid-section` markup (current `index.astro` ~lines 89–183) and ALL `.hero-*`, `.slide*`, `.slider-*`, `.recipe-card*`, `.dot*` CSS, plus the hero slider `<script>` (current ~lines 1214–1267), into this component.
- Replace `featuredRecipes` with `recipes`. Slides = `recipes.slice(0, 4)`; side cards = `recipes.slice(1, 3)`. Badge color via `recipe.category?.color`.
- Render nothing when `recipes.length === 0`.
- The hero image keeps `loading="eager"` / `fetchpriority="high"` on the first slide (LCP).
- **Commit:** `feat(home): extract HeroSection component`.

### Task 4: `FeaturedRecipes.astro`
- **Props:** `{ section: HomepageFeaturedRecipesSection; recipes: HydratedArticle[] }`.
- Move the `popular-recipes-section` markup (current ~lines 186–255) and `.foxiz-*`, `.popular-*` CSS. Use `section.title` / `section.subtitle` for the heading instead of the hardcoded "Popular Recipes". Map over `recipes`. Keep `parseCachedRecipe` cook-time logic.
- Render nothing when empty.
- **Commit:** `feat(home): extract FeaturedRecipes component`.

### Task 5: `CategoryBrowse.astro`
- **Props:** `{ section: HomepageCategoryBrowseSection; categories: HydratedCategory[] }`.
- Move the `categories-section` markup (current ~lines 258–306) and `.category-*`, `.chip-*` CSS. Use `section.title` for the heading. Map over `categories` (already sliced to `section.max` by the resolver). Keep the `getCategoryImage` helper (inline it, same as current page).
- Render nothing when empty.
- **Commit:** `feat(home): extract CategoryBrowse component`.

### Task 6: `Collections.astro` (new)
- **Props:** `{ section: HomepageCollectionsSection; roundups: HydratedArticle[] }`.
- New component reusing the `FeaturedRecipes` card visual language (foxiz card) but linking to roundup routes (`roundup.route || '/roundups/' + roundup.slug`) and using `section.title`/`section.subtitle`. Reuse the shared image helper.
- Render nothing when `roundups.length === 0` (so the default empty collections section is invisible until populated).
- **Commit:** `feat(home): add Collections component`.

### Task 7: `LatestRecipes.astro`
- **Props:** `{ section: HomepageLatestSection; recipes: HydratedArticle[] }`.
- Move the `more-recipes-section` markup (current ~lines 351–419) and `.recipes-grid`, `.recipe-card-vertical*`, `.card-*` CSS. Use `section.title` (instead of "More Recipes"). Keep the "View All → /recipes" link and `parseCachedRecipe` prep-time logic. Map over `recipes`.
- Render nothing when empty.
- **Commit:** `feat(home): extract LatestRecipes component`.

### Task 8: `AboutAuthor.astro`
- **Props:** `{ section: HomepageAboutAuthorSection; author: Author | null }`.
- Move the `about-author-section` markup (current ~lines 309–349) and `.about-author-*` CSS. Replace `featuredAuthor` with the `author` prop. Render nothing when `author` is null. Keep the `extractImage(author.images_json, 'avatar', 600)` logic.
- **Commit:** `feat(home): extract AboutAuthor component`.

### Task 9: `NewsletterBanner.astro`
- **Props:** `{ section: HomepageNewsletterSection }`.
- Move the `newsletter-banner` markup (current ~lines 421–433) and `.newsletter-*` CSS. Replace the hardcoded copy with `section.title`, `section.subtitle`, `section.button_text`, `section.placeholder_text`. Keep the existing non-functional `<form>` as-is (a real subscribe endpoint is out of scope).
- **Commit:** `feat(home): extract NewsletterBanner component`.

For **each** of Tasks 3–9: after creating the component, run `pnpm typecheck` (expect PASS) before committing. These components are not unit-tested (Astro presentational components; verified via the page render in Task 12).

---

## Task 10: Dispatcher

**Files:**
- Create: `src/site/components/home/HomeSections.astro`

- [ ] **Step 1: Implement**

```astro
---
import type { HomeSectionVM } from '@site/utils/home-data';
import StoriesBar from '@components/StoriesBar.astro';
import HeroSection from './HeroSection.astro';
import FeaturedRecipes from './FeaturedRecipes.astro';
import CategoryBrowse from './CategoryBrowse.astro';
import Collections from './Collections.astro';
import LatestRecipes from './LatestRecipes.astro';
import AboutAuthor from './AboutAuthor.astro';
import NewsletterBanner from './NewsletterBanner.astro';

interface Props {
  sections: HomeSectionVM[];
}
const { sections } = Astro.props as Props;
---
{
  sections.map((vm) => {
    switch (vm.kind) {
      case 'stories':
        return <StoriesBar stories={vm.stories} />;
      case 'hero':
        return <HeroSection section={vm.section} recipes={vm.recipes} />;
      case 'featured_recipes':
        return <FeaturedRecipes section={vm.section} recipes={vm.recipes} />;
      case 'category_browse':
        return <CategoryBrowse section={vm.section} categories={vm.categories} />;
      case 'collections':
        return <Collections section={vm.section} roundups={vm.roundups} />;
      case 'latest':
        return <LatestRecipes section={vm.section} recipes={vm.recipes} />;
      case 'about_author':
        return <AboutAuthor section={vm.section} author={vm.author} />;
      case 'newsletter':
        return <NewsletterBanner section={vm.section} />;
    }
  })
}
```

- [ ] **Step 2: typecheck + commit**

Run `pnpm typecheck` → PASS.
```bash
git add src/site/components/home/HomeSections.astro
git commit -m "feat(home): add HomeSections dispatcher" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Rewrite `index.astro` (thin orchestrator + h1 + JSON-LD)

**Files:**
- Rewrite: `src/pages/index.astro`

- [ ] **Step 1: Replace the ENTIRE file** with:

```astro
---
import { env } from 'cloudflare:workers';
import Layout from '@layouts/Layout.astro';
import HomeSections from '@components/home/HomeSections.astro';
import { resolveHomeData, type HomeSectionVM } from '@site/utils/home-data';
import { buildHomeJsonLd } from '@site/utils/home-jsonld';
import {
  getPublicHomepageSettings,
  getStories,
  getPublicSiteIdentity,
  getPublicOrganizationProfile,
  getPublicSocialLinks,
} from '@server/site-data';

const homepageSettings = await getPublicHomepageSettings();

const [stories, identity, organization, socialLinks] = await Promise.all([
  getStories(),
  getPublicSiteIdentity(),
  getPublicOrganizationProfile(),
  getPublicSocialLinks(),
]);

let sectionVms: HomeSectionVM[] = [];
try {
  sectionVms = await resolveHomeData(homepageSettings.sections, { db: env.DB, stories });
} catch (error) {
  console.error('Error resolving homepage data:', error);
}

const jsonLd = buildHomeJsonLd({
  identity,
  organization,
  socialLinks,
  searchUrlTemplate: `${identity.site_url}/recipes?q={search_term_string}`,
});
---

<Layout
  title={homepageSettings.seo.meta_title}
  description={homepageSettings.seo.meta_description}
  image={homepageSettings.seo.og_image}
  noindex={homepageSettings.seo.no_index}
>
  <h1 class="home-h1">{identity.tagline || identity.site_name}</h1>
  <main class="homepage">
    <HomeSections sections={sectionVms} />
  </main>
  {jsonLd.map((node) => (
    <script type="application/ld+json" set:html={JSON.stringify(node)} />
  ))}
</Layout>

<style>
  /* Visually-hidden semantic H1 (Phase 1b makes the hero heading the visible H1). */
  .home-h1 {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .homepage {
    background: var(--bg);
  }
</style>
```

- [ ] **Step 2: typecheck**

Run `pnpm typecheck` → PASS. (Confirm `Layout` accepts `title`, `description`, `image`, `noindex` — it already did in the previous `index.astro`.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): render homepage from settings sections + h1 + JSON-LD" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Verification gate

**Files:** none (verification only).

- [ ] **Step 1: Static checks**

Run: `pnpm typecheck` → PASS. `pnpm check:boundaries` → PASS. `pnpm test` → all pass (incl. the two new util tests).

- [ ] **Step 2: Render verification (user-driven save→reload on `pnpm dev`)**

Start `pnpm dev`, open `/`. Confirm:
- The page renders all default sections in order: stories → hero → featured → categories → (collections hidden if no roundups) → latest → about → newsletter.
- Visual output matches the previous homepage (styles were moved, not changed).
- View source: exactly one `<h1>` exists; two `<script type="application/ld+json">` blocks (WebSite + Organization) are present and valid (paste into Google Rich Results Test).
- Toggle a section off via `PUT /api/settings/homepage` (or once Phase 2 admin exists) and reload — that section disappears; reorder the array and the visual order follows.

- [ ] **Step 3: Lighthouse**

Run Lighthouse on `/`. Confirm no regression vs the pre-refactor baseline (home was 100/100/100/100). Investigate any drop before proceeding.

- [ ] **Step 4: Confirm green and stop**

Phase 1a complete: the homepage is settings-driven, split into focused components, with a semantic `<h1>` and homepage JSON-LD — visuals preserved. Hand off to Phase 1b (component redesign + Embla + animations, with visual review).

---

## Self-Review (completed)

- **Spec coverage (P1a scope):** resolver + dispatcher + thin page (spec §6) = Tasks 2,10,11; component split = Tasks 3–9; `<h1>` + WebSite/SearchAction/Organization JSON-LD (spec §8) = Tasks 1,11. ItemList + FAQPage + the visual redesign + Embla are intentionally Phase 1b/Phase 3 (noted in Task 2 `faq` case and Task 11 h1 comment).
- **Placeholder scan:** mechanical glue (resolver, JSON-LD, dispatcher, page) is given as exact code with tests. Component tasks are extraction-of-existing-code with exact source line ranges, prop interfaces, and the shared image-helper snippet — not hand-waving.
- **Type consistency:** `HomeSectionVM` `kind` values, the section types from Phase 0, and the dispatcher cases all align; `resolveHomeData(sections, ctx)` signature matches its callers (test + page); `buildHomeJsonLd(input)` shape matches its test and the page call site.
- **Risk:** the only behavioral change vs today is filtering recipe sections to `type: 'recipe'` and adding the `<h1>`/JSON-LD; everything else is a move. Verified by Task 12 render + Lighthouse parity.
```
