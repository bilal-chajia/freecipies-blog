# Web Stories AMP Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the auto-generated web-story feature to project standards and to the strict Google Web Stories (AMP) standard: a typed `Story` model derived from any published article, rendered as valid `amp-story` pages, with an on-site Instagram-style bar that replays those pages through the official `amp-story-player`.

**Architecture:** A pure server-side builder turns a `HydratedArticle` into a `Story` (slides) or a `StoryPreview` (ring). The AMP page `/stories/[slug]` renders the `Story` as a standalone, strictly-valid AMP document (no Layout, no custom JS). The homepage bar renders accessible ring links plus a hidden `<amp-story-player>` listing the same URLs; a small typed client module opens the player lightbox on click and falls back to navigation without JS. The legacy hand-rolled viewer is deleted.

**Tech Stack:** Astro 6 (SSR on Cloudflare), TypeScript 6 strict, Drizzle/D1, Vitest, AMP (`amp-story-1.0`, `amp-story-player-v0`).

**Spec:** `docs/superpowers/specs/2026-06-13-web-stories-amp-redesign-design.md`

---

## File Structure

**Create**
- `src/server/site-data/stories/types.ts` — `StoryImage`, `StorySlide`, `Story`, `StoryPreview`, `StoryContext` contract types.
- `src/server/site-data/stories/images.ts` — pure image-pool helpers (slot → `StoryImage`, build pool from `images_json`).
- `src/server/site-data/stories/eligibility.ts` — `isStoryEligible(article)`.
- `src/server/site-data/stories/build-preview.ts` — `buildStoryPreview(article)`.
- `src/server/site-data/stories/build-story.ts` — `buildStory(article, ctx)`.
- `src/server/site-data/stories/list.ts` — pure `selectStoryArticles(items, limit)`; async `getStories()`, `getStory(slug)`, `getStoryContext()`.
- `src/server/site-data/stories/index.ts` — barrel re-export.
- `src/server/site-data/stories/__tests__/images.test.ts`
- `src/server/site-data/stories/__tests__/eligibility.test.ts`
- `src/server/site-data/stories/__tests__/build-preview.test.ts`
- `src/server/site-data/stories/__tests__/build-story.test.ts`
- `src/server/site-data/stories/__tests__/list.test.ts`
- `src/site/components/story/StoryAmp.astro` — renders a full strict-AMP document from a `Story`.
- `src/pages/stories/[slug].astro` — thin SSR entry: fetch → build → render `StoryAmp`.
- `src/site/scripts/stories-player.ts` — typed client controller for the bar + player.
- `docs/WEB_STORY_CONTRACT.md` — presentation contract.

**Modify**
- `src/server/site-data/presenters.ts` — remove `StoryPreview` / `StoryPageData` / `presentStories`.
- `src/server/site-data/__tests__/site-data.test.ts` — remove the `presentStories` describe block.
- `src/site/components/StoriesBar.astro` — full rewrite.
- `src/pages/index.astro` — new `getStories()` shape; remove the `WebStoryViewer` import + usage.
- `CLAUDE.md` — add `docs/WEB_STORY_CONTRACT.md` to the Contracts list.

**Delete**
- `src/server/site-data/stories.ts` — replaced by `stories/` folder.
- `src/site/components/WebStoryViewer.astro` — legacy viewer.

---

## Task 1: Story contract types

**Files:**
- Create: `src/server/site-data/stories/types.ts`

- [ ] **Step 1: Write the types file**

```ts
// src/server/site-data/stories/types.ts

/** A fully-resolved public image for a story (never exposes r2_key). */
export interface StoryImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export type StorySlideKind = 'cover' | 'ingredients' | 'step' | 'info' | 'cta';

/** Optional cover metadata pills (recipe stories). */
export interface StorySlideMeta {
  total_time?: string;
  servings?: string;
  rating?: string;
}

export interface StorySlide {
  /** Stable id, e.g. "cover", "step-3", "nutrition", "cta". */
  id: string;
  kind: StorySlideKind;
  /** Full-screen background image. */
  image?: StoryImage;
  heading?: string;
  /** Short body text (already truncated for full-screen legibility). */
  body?: string;
  /** Ingredient lines for the 'ingredients' slide (already capped). */
  items?: string[];
  meta?: StorySlideMeta;
}

export interface StoryPreview {
  slug: string;
  headline: string;
  /** Ring thumbnail. */
  image: StoryImage;
  /** Canonical story page, e.g. "/stories/easy-pasta". */
  href: string;
}

export interface Story {
  slug: string;
  type: 'recipe' | 'article' | 'roundup';
  title: string;
  publisher: string;
  publisher_logo_url: string;
  poster_portrait_url: string;
  poster_square_url?: string;
  poster_landscape_url?: string;
  /** Absolute canonical URL of the story page. */
  canonical_url: string;
  /** Full-article CTA target (e.g. "/recipes/easy-pasta"). */
  target_url: string;
  slides: StorySlide[];
}

/** Settings-derived context passed into the pure story builder. */
export interface StoryContext {
  /** Absolute site origin, no trailing slash, e.g. "https://site.com". */
  origin: string;
  publisher: string;
  publisher_logo_url: string;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors introduced by this file).

- [ ] **Step 3: Commit**

```bash
git add src/server/site-data/stories/types.ts
git commit -m "feat(stories): add Story/StorySlide contract types"
```

---

## Task 2: Image-pool helpers

Resolves `images_json` slots into `StoryImage`s, server-side, choosing the best variant. Pure and fully unit-testable.

**Files:**
- Create: `src/server/site-data/stories/images.ts`
- Test: `src/server/site-data/stories/__tests__/images.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/site-data/stories/__tests__/images.test.ts
import { describe, expect, it } from "vitest";
import { slotToStoryImage, buildImagePool } from "../images";

describe("slotToStoryImage", () => {
  it("picks the largest available variant and resolves its public url", () => {
    const slot = {
      alt: "Bowl of pasta",
      variants: {
        xs: { r2_key: "p-xs.webp", width: 360, height: 240 },
        md: { r2_key: "p-md.webp", width: 1200, height: 800 },
      },
    };
    expect(slotToStoryImage(slot, "fallback")).toEqual({
      url: "/api/images/p-md.webp",
      alt: "Bowl of pasta",
      width: 1200,
      height: 800,
    });
  });

  it("uses the fallback alt when the slot has none", () => {
    const slot = { variants: { sm: { r2_key: "p-sm.webp", width: 720, height: 480 } } };
    expect(slotToStoryImage(slot, "My Headline")?.alt).toBe("My Headline");
  });

  it("returns null when there is no usable variant", () => {
    expect(slotToStoryImage(null, "x")).toBeNull();
    expect(slotToStoryImage({ variants: {} }, "x")).toBeNull();
  });
});

describe("buildImagePool", () => {
  it("extracts hero, recipe step images (keyed by ref), and content images", () => {
    const images_json = JSON.stringify({
      hero: { alt: "Hero", variants: { md: { r2_key: "hero-md.webp", width: 1200, height: 800 } } },
      recipe_steps: {
        "boil-water": { alt: "Boiling", variants: { sm: { r2_key: "boil-sm.webp", width: 720, height: 480 } } },
      },
      content_images: {
        "img-1": { alt: "In content", variants: { sm: { r2_key: "c1-sm.webp", width: 720, height: 480 } } },
      },
    });
    const pool = buildImagePool(images_json, "Headline");
    expect(pool.hero?.url).toBe("/api/images/hero-md.webp");
    expect(pool.steps["boil-water"]?.url).toBe("/api/images/boil-sm.webp");
    expect(pool.content.map((i) => i.url)).toEqual(["/api/images/c1-sm.webp"]);
  });

  it("returns empty structures for null/garbage images_json", () => {
    const pool = buildImagePool(null, "Headline");
    expect(pool.hero).toBeNull();
    expect(pool.steps).toEqual({});
    expect(pool.content).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/images.test.ts`
Expected: FAIL with "Cannot find module '../images'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server/site-data/stories/images.ts
import { safeParseJson } from "@shared/utils";
import { resolveVariantUrl } from "@shared/types/images";
import type { StoryImage } from "./types";

/** Best-to-worst variant preference for a full-screen story background. */
const VARIANT_ORDER = ["lg", "md", "sm", "xs"] as const;

interface RawVariant { r2_key?: string; r2Key?: string; url?: string; width?: number; height?: number; }
interface RawSlot { alt?: string; variants?: Record<string, RawVariant | undefined>; }

/** Resolve a single image slot to a public StoryImage, or null when unusable. */
export function slotToStoryImage(slot: unknown, fallbackAlt: string): StoryImage | null {
  if (!slot || typeof slot !== "object") return null;
  const s = slot as RawSlot;
  const variants = s.variants;
  if (!variants || typeof variants !== "object") return null;

  for (const key of VARIANT_ORDER) {
    const v = variants[key];
    if (!v) continue;
    const url = resolveVariantUrl(v);
    if (url && typeof v.width === "number" && typeof v.height === "number") {
      return {
        url,
        alt: (typeof s.alt === "string" && s.alt.trim() !== "") ? s.alt : fallbackAlt,
        width: v.width,
        height: v.height,
      };
    }
  }
  return null;
}

export interface StoryImagePool {
  hero: StoryImage | null;
  /** Recipe step images keyed by the step's image_ref. */
  steps: Record<string, StoryImage>;
  /** Content-body images in document order. */
  content: StoryImage[];
}

/** Parse images_json once and resolve hero, recipe step, and content images. */
export function buildImagePool(images_json: string | null | undefined, fallbackAlt: string): StoryImagePool {
  const parsed = safeParseJson<Record<string, unknown>>(images_json);
  if (!parsed) return { hero: null, steps: {}, content: [] };

  const hero = slotToStoryImage(parsed.hero, fallbackAlt)
    ?? slotToStoryImage(parsed.thumbnail, fallbackAlt);

  const steps: Record<string, StoryImage> = {};
  const rawSteps = parsed.recipe_steps;
  if (rawSteps && typeof rawSteps === "object") {
    for (const [ref, slot] of Object.entries(rawSteps as Record<string, unknown>)) {
      const img = slotToStoryImage(slot, fallbackAlt);
      if (img) steps[ref] = img;
    }
  }

  const content: StoryImage[] = [];
  const rawContent = parsed.content_images;
  if (rawContent && typeof rawContent === "object") {
    for (const slot of Object.values(rawContent as Record<string, unknown>)) {
      const img = slotToStoryImage(slot, fallbackAlt);
      if (img) content.push(img);
    }
  }

  return { hero, steps, content };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/images.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/server/site-data/stories/images.ts src/server/site-data/stories/__tests__/images.test.ts
git commit -m "feat(stories): add pure image-pool resolution helpers"
```

---

## Task 3: Eligibility

**Files:**
- Create: `src/server/site-data/stories/eligibility.ts`
- Test: `src/server/site-data/stories/__tests__/eligibility.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/site-data/stories/__tests__/eligibility.test.ts
import { describe, expect, it } from "vitest";
import { isStoryEligible } from "../eligibility";
import type { HydratedArticle } from "@modules/articles";

const heroImages = JSON.stringify({
  hero: { alt: "Hero", variants: { md: { r2_key: "hero-md.webp", width: 1200, height: 800 } } },
});

function article(overrides: Record<string, unknown>): HydratedArticle {
  return {
    type: "article",
    headline: "Headline",
    slug: "slug",
    workflow_status: "published",
    short_description: "A tasty thing",
    images_json: heroImages,
    ...overrides,
  } as unknown as HydratedArticle;
}

describe("isStoryEligible", () => {
  it("accepts a published non-recipe with a cover image and a description", () => {
    expect(isStoryEligible(article({}))).toBe(true);
  });

  it("rejects unpublished articles", () => {
    expect(isStoryEligible(article({ workflow_status: "draft" }))).toBe(false);
  });

  it("rejects when there is no usable cover image", () => {
    expect(isStoryEligible(article({ images_json: null, image_url: undefined }))).toBe(false);
  });

  it("rejects a non-recipe with no description and no content", () => {
    expect(isStoryEligible(article({ short_description: "", content_json: null }))).toBe(false);
  });

  it("accepts a recipe with at least one instruction step", () => {
    const recipe = article({
      type: "recipe",
      recipe: { ingredients: [], instructions: [{ section_title: "S", steps: [{ text: "Do it" }] }] },
    });
    expect(isStoryEligible(recipe)).toBe(true);
  });

  it("rejects a recipe with no steps and no ingredients", () => {
    const recipe = article({ type: "recipe", recipe: { ingredients: [], instructions: [] } });
    expect(isStoryEligible(recipe)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/eligibility.test.ts`
Expected: FAIL with "Cannot find module '../eligibility'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server/site-data/stories/eligibility.ts
import type { HydratedArticle } from "@modules/articles";
import type { RecipeJson } from "@modules/articles/types/recipes.types";
import { buildImagePool } from "./images";

function hasCoverImage(article: HydratedArticle): boolean {
  const pool = buildImagePool(article.images_json, article.headline ?? "");
  if (pool.hero) return true;
  // Fall back to the legacy flat image_url some rows still carry.
  return typeof (article as { image_url?: string }).image_url === "string"
    && (article as { image_url?: string }).image_url!.trim() !== "";
}

function recipeHasContent(recipe: RecipeJson | null | undefined): boolean {
  if (!recipe) return false;
  const stepCount = (recipe.instructions ?? []).reduce((n, s) => n + (s.steps?.length ?? 0), 0);
  const ingredientCount = (recipe.ingredients ?? []).reduce((n, g) => n + (g.items?.length ?? 0), 0);
  return stepCount > 0 || ingredientCount > 0;
}

function nonRecipeHasContent(article: HydratedArticle): boolean {
  if (typeof article.short_description === "string" && article.short_description.trim() !== "") return true;
  const content = article.content_json;
  return typeof content === "string" && content.includes('"blocks"') && !content.includes('"blocks":[]');
}

/** A published article is eligible when it has a cover image and usable content. */
export function isStoryEligible(article: HydratedArticle | null | undefined): boolean {
  if (!article) return false;
  if (article.workflow_status !== "published") return false;
  if (!hasCoverImage(article)) return false;

  if (article.type === "recipe") {
    const recipe = (article as { recipe?: RecipeJson | null }).recipe
      ?? (article as { recipe_json?: RecipeJson | null }).recipe_json
      ?? null;
    return recipeHasContent(recipe) || nonRecipeHasContent(article);
  }
  return nonRecipeHasContent(article);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/eligibility.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/site-data/stories/eligibility.ts src/server/site-data/stories/__tests__/eligibility.test.ts
git commit -m "feat(stories): add story eligibility rule"
```

---

## Task 4: Build story preview (ring data)

**Files:**
- Create: `src/server/site-data/stories/build-preview.ts`
- Test: `src/server/site-data/stories/__tests__/build-preview.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/site-data/stories/__tests__/build-preview.test.ts
import { describe, expect, it } from "vitest";
import { buildStoryPreview } from "../build-preview";
import type { HydratedArticle } from "@modules/articles";

const images = JSON.stringify({
  thumbnail: { alt: "Thumb", variants: { sm: { r2_key: "t-sm.webp", width: 720, height: 720 } } },
});

describe("buildStoryPreview", () => {
  it("builds a ring with slug, headline, public image and story href", () => {
    const article = { type: "recipe", slug: "easy-pasta", headline: "Easy Pasta", images_json: images } as unknown as HydratedArticle;
    expect(buildStoryPreview(article)).toEqual({
      slug: "easy-pasta",
      headline: "Easy Pasta",
      image: { url: "/api/images/t-sm.webp", alt: "Thumb", width: 720, height: 720 },
      href: "/stories/easy-pasta",
    });
  });

  it("never leaks an r2_key in the preview image url", () => {
    const article = { type: "article", slug: "guide", headline: "Guide", images_json: images } as unknown as HydratedArticle;
    const preview = buildStoryPreview(article);
    expect(preview?.image.url.includes("r2")).toBe(false);
    expect(preview?.image.url.startsWith("/api/images/")).toBe(true);
  });

  it("returns null when no usable cover image exists", () => {
    const article = { type: "article", slug: "x", headline: "X", images_json: null } as unknown as HydratedArticle;
    expect(buildStoryPreview(article)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/build-preview.test.ts`
Expected: FAIL with "Cannot find module '../build-preview'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server/site-data/stories/build-preview.ts
import type { HydratedArticle } from "@modules/articles";
import { buildImagePool, slotToStoryImage } from "./images";
import { safeParseJson } from "@shared/utils";
import type { StoryImage, StoryPreview } from "./types";

/** Prefer the thumbnail slot for the ring; fall back to hero, then content. */
function previewImage(article: HydratedArticle): StoryImage | null {
  const headline = article.headline ?? "";
  const parsed = safeParseJson<Record<string, unknown>>(article.images_json);
  const thumb = parsed ? slotToStoryImage(parsed.thumbnail, headline) : null;
  if (thumb) return thumb;
  const pool = buildImagePool(article.images_json, headline);
  return pool.hero ?? pool.content[0] ?? null;
}

export function buildStoryPreview(article: HydratedArticle): StoryPreview | null {
  const image = previewImage(article);
  if (!image) return null;
  return {
    slug: article.slug,
    headline: article.headline ?? "",
    image,
    href: `/stories/${article.slug}`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/build-preview.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/site-data/stories/build-preview.ts src/server/site-data/stories/__tests__/build-preview.test.ts
git commit -m "feat(stories): build ring preview from an article"
```

---

## Task 5: Build story slides (text + truncation + caps)

Implements `buildStory`. Composition rules from the spec: caps are **7 steps**, **8 ingredients + "+N autres"**, nutrition slide only when validated, image pool hero+steps+content with consecutive-dedup and hero fallback, non-recipe fallback.

**Files:**
- Create: `src/server/site-data/stories/build-story.ts`
- Test: `src/server/site-data/stories/__tests__/build-story.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/site-data/stories/__tests__/build-story.test.ts
import { describe, expect, it } from "vitest";
import { buildStory } from "../build-story";
import type { HydratedArticle } from "@modules/articles";
import type { StoryContext } from "../types";

const ctx: StoryContext = {
  origin: "https://site.com",
  publisher: "Freecipies",
  publisher_logo_url: "https://site.com/logo.png",
};

const heroImages = JSON.stringify({
  hero: { alt: "Hero", variants: { md: { r2_key: "hero-md.webp", width: 1200, height: 800 } } },
  recipe_steps: {
    "s1": { alt: "Step one", variants: { sm: { r2_key: "s1-sm.webp", width: 720, height: 480 } } },
  },
});

function recipeArticle(recipe: Record<string, unknown>): HydratedArticle {
  return {
    type: "recipe",
    slug: "easy-pasta",
    headline: "Easy Pasta",
    short_description: "A quick weeknight pasta.",
    route: "/recipes/easy-pasta",
    images_json: heroImages,
    recipe,
  } as unknown as HydratedArticle;
}

describe("buildStory — recipe", () => {
  const story = buildStory(recipeArticle({
    total: 30, servings: 4,
    aggregate_rating: { rating_value: 4.8, rating_count: 12 },
    ingredients: [{ group_title: "Main", items: Array.from({ length: 10 }, (_, i) => ({ amount: 1, unit: "cup", name: `ing ${i + 1}`, is_optional: false })) }],
    instructions: [{ section_title: "Cook", steps: Array.from({ length: 9 }, (_, i) => ({ text: `Step ${i + 1} text`, ...(i === 0 ? { image_ref: "s1" } : {}) })) }],
    nutrition: { basis: "per_serving", serving_size: { label: "1 plate", grams: 300 }, servings_per_recipe: 4, calories: 520, total_fat_g: 18, sodium_mg: 600, total_carbohydrate_g: 60, protein_g: 22, status: "validated" },
  }), ctx);

  it("starts with a cover carrying headline, description and meta", () => {
    expect(story.slides[0].kind).toBe("cover");
    expect(story.slides[0].heading).toBe("Easy Pasta");
    expect(story.slides[0].meta).toMatchObject({ total_time: "30 min", servings: "4 servings", rating: "4.8" });
  });

  it("caps ingredients at 8 with a '+N autres' trailing item", () => {
    const ing = story.slides.find((s) => s.kind === "ingredients");
    expect(ing?.items).toHaveLength(9); // 8 + summary line
    expect(ing?.items?.[8]).toBe("+2 autres");
  });

  it("caps steps at 7 and resolves a step image when present", () => {
    const steps = story.slides.filter((s) => s.kind === "step");
    expect(steps).toHaveLength(7);
    expect(steps[0].image?.url).toBe("/api/images/s1-sm.webp");
    expect(steps[0].heading).toBe("Étape 1");
  });

  it("adds a nutrition info slide before the CTA when validated", () => {
    const kinds = story.slides.map((s) => s.kind);
    expect(kinds).toContain("info");
    expect(kinds[kinds.length - 1]).toBe("cta");
    const nutrition = story.slides.find((s) => s.id === "nutrition");
    expect(nutrition?.body).toContain("520");
  });

  it("ends with a CTA targeting the full article", () => {
    const cta = story.slides[story.slides.length - 1];
    expect(cta.kind).toBe("cta");
    expect(story.target_url).toBe("/recipes/easy-pasta");
  });

  it("sets canonical and poster from context and hero", () => {
    expect(story.canonical_url).toBe("https://site.com/stories/easy-pasta");
    expect(story.publisher).toBe("Freecipies");
    expect(story.poster_portrait_url).toBe("https://site.com/api/images/hero-md.webp");
  });
});

describe("buildStory — non-recipe and fallback", () => {
  it("builds cover + cta for an article with only a description", () => {
    const article = {
      type: "article", slug: "guide", headline: "Knife Guide",
      short_description: "How to choose a knife.", route: "/articles/guide", images_json: heroImages,
    } as unknown as HydratedArticle;
    const story = buildStory(article, ctx);
    expect(story.slides.map((s) => s.kind)).toEqual(["cover", "cta"]);
  });

  it("falls back to non-recipe composition when a recipe has no steps/ingredients", () => {
    const story = buildStory(recipeArticle({ ingredients: [], instructions: [] }), ctx);
    expect(story.slides.some((s) => s.kind === "ingredients" || s.kind === "step")).toBe(false);
    expect(story.slides[0].kind).toBe("cover");
    expect(story.slides[story.slides.length - 1].kind).toBe("cta");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/build-story.test.ts`
Expected: FAIL with "Cannot find module '../build-story'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server/site-data/stories/build-story.ts
import type { HydratedArticle } from "@modules/articles";
import type { RecipeJson, InstructionStep } from "@modules/articles/types/recipes.types";
import { buildImagePool, type StoryImagePool } from "./images";
import type { Story, StoryContext, StoryImage, StorySlide } from "./types";

const MAX_STEPS = 7;
const MAX_INGREDIENTS = 8;
const COVER_BODY_MAX = 140;
const STEP_BODY_MAX = 180;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

/** Picks pool images for slides, avoiding repeating the previous slide's image. */
class ImageCursor {
  private lastUrl: string | null = null;
  private contentIndex = 0;
  constructor(private pool: StoryImagePool) {}

  private take(image: StoryImage | null): StoryImage | undefined {
    if (image && image.url !== this.lastUrl) {
      this.lastUrl = image.url;
      return image;
    }
    return image ?? undefined;
  }

  hero(): StoryImage | undefined {
    return this.take(this.pool.hero);
  }

  /** Prefer an explicit step image, then an unused content image, then hero. */
  forStep(ref: string | null | undefined): StoryImage | undefined {
    if (ref && this.pool.steps[ref]) return this.take(this.pool.steps[ref]);
    if (this.contentIndex < this.pool.content.length) {
      return this.take(this.pool.content[this.contentIndex++]);
    }
    return this.take(this.pool.hero);
  }

  /** Next content image for an info slide, falling back to hero. */
  forInfo(): StoryImage | undefined {
    if (this.contentIndex < this.pool.content.length) {
      return this.take(this.pool.content[this.contentIndex++]);
    }
    return this.take(this.pool.hero);
  }
}

function getRecipe(article: HydratedArticle): RecipeJson | null {
  return (article as { recipe?: RecipeJson | null }).recipe
    ?? (article as { recipe_json?: RecipeJson | null }).recipe_json
    ?? null;
}

function recipeHasContent(recipe: RecipeJson | null): boolean {
  if (!recipe) return false;
  const steps = (recipe.instructions ?? []).reduce((n, s) => n + (s.steps?.length ?? 0), 0);
  const ings = (recipe.ingredients ?? []).reduce((n, g) => n + (g.items?.length ?? 0), 0);
  return steps > 0 || ings > 0;
}

function coverMeta(recipe: RecipeJson | null): StorySlide["meta"] {
  if (!recipe) return undefined;
  const meta: NonNullable<StorySlide["meta"]> = {};
  const total = recipe.total ?? ((recipe.prep ?? 0) + (recipe.cook ?? 0) || null);
  if (total) meta.total_time = `${total} min`;
  if (recipe.servings) meta.servings = `${recipe.servings} servings`;
  const rating = recipe.aggregate_rating?.rating_value;
  if (typeof rating === "number" && rating > 0) meta.rating = rating.toFixed(1);
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function ingredientItems(recipe: RecipeJson): string[] {
  const flat: string[] = [];
  for (const group of recipe.ingredients ?? []) {
    for (const item of group.items ?? []) {
      const amount = item.amount && item.amount > 0 ? `${item.amount} ` : "";
      const unit = item.unit ? `${item.unit} ` : "";
      flat.push(`${amount}${unit}${item.name}`.trim());
    }
  }
  if (flat.length <= MAX_INGREDIENTS) return flat;
  const shown = flat.slice(0, MAX_INGREDIENTS);
  shown.push(`+${flat.length - MAX_INGREDIENTS} autres`);
  return shown;
}

function flatSteps(recipe: RecipeJson): InstructionStep[] {
  const steps: InstructionStep[] = [];
  for (const section of recipe.instructions ?? []) {
    for (const step of section.steps ?? []) steps.push(step);
  }
  return steps.slice(0, MAX_STEPS);
}

function nutritionSlide(recipe: RecipeJson, image: StoryImage | undefined): StorySlide | null {
  const n = recipe.nutrition;
  if (!n || n.status !== "validated") return null;
  const parts = [
    `${n.calories} kcal`,
    `${n.protein_g} g protéines`,
    `${n.total_carbohydrate_g} g glucides`,
    `${n.total_fat_g} g lipides`,
  ];
  return { id: "nutrition", kind: "info", image, heading: "Nutrition", body: parts.join(" · ") };
}

function buildCover(article: HydratedArticle, cursor: ImageCursor, recipe: RecipeJson | null): StorySlide {
  return {
    id: "cover",
    kind: "cover",
    image: cursor.hero(),
    heading: article.headline ?? "",
    body: article.short_description ? truncate(article.short_description, COVER_BODY_MAX) : undefined,
    meta: coverMeta(recipe),
  };
}

function buildCta(cursor: ImageCursor): StorySlide {
  return { id: "cta", kind: "cta", image: cursor.hero(), heading: "Voir la recette complète" };
}

function buildRecipeSlides(article: HydratedArticle, recipe: RecipeJson, cursor: ImageCursor): StorySlide[] {
  const slides: StorySlide[] = [buildCover(article, cursor, recipe)];

  const items = ingredientItems(recipe);
  if (items.length > 0) {
    slides.push({ id: "ingredients", kind: "ingredients", image: cursor.forInfo(), heading: "Ingrédients", items });
  }

  flatSteps(recipe).forEach((step, i) => {
    slides.push({
      id: `step-${i + 1}`,
      kind: "step",
      image: cursor.forStep(step.image_ref),
      heading: step.name ? truncate(step.name, 60) : `Étape ${i + 1}`,
      body: truncate([step.text, step.tip].filter(Boolean).join(" — "), STEP_BODY_MAX),
    });
  });

  const nutrition = nutritionSlide(recipe, cursor.forInfo());
  if (nutrition) slides.push(nutrition);

  slides.push(buildCta(cursor));
  return slides;
}

function buildArticleSlides(article: HydratedArticle, cursor: ImageCursor): StorySlide[] {
  const slides: StorySlide[] = [buildCover(article, cursor, null)];
  const subtitle = (article as { subtitle?: string | null }).subtitle;
  if (typeof subtitle === "string" && subtitle.trim() !== "") {
    slides.push({ id: "info-1", kind: "info", image: cursor.forInfo(), body: truncate(subtitle, STEP_BODY_MAX) });
  }
  slides.push(buildCta(cursor));
  return slides;
}

export function buildStory(article: HydratedArticle, ctx: StoryContext): Story {
  const pool = buildImagePool(article.images_json, article.headline ?? "");
  const cursor = new ImageCursor(pool);
  const recipe = article.type === "recipe" ? getRecipe(article) : null;

  const slides = (recipe && recipeHasContent(recipe))
    ? buildRecipeSlides(article, recipe, cursor)
    : buildArticleSlides(article, cursor);

  const posterImage = pool.hero ?? pool.content[0] ?? null;
  const posterUrl = posterImage ? `${ctx.origin}${posterImage.url}` : ctx.publisher_logo_url;

  return {
    slug: article.slug,
    type: article.type,
    title: article.headline ?? "",
    publisher: ctx.publisher,
    publisher_logo_url: ctx.publisher_logo_url,
    poster_portrait_url: posterUrl,
    canonical_url: `${ctx.origin}/stories/${article.slug}`,
    target_url: (article as { route?: string }).route ?? `/recipes/${article.slug}`,
    slides,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/build-story.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/server/site-data/stories/build-story.ts src/server/site-data/stories/__tests__/build-story.test.ts
git commit -m "feat(stories): build slide model from recipe and non-recipe articles"
```

---

## Task 6: Selection + data access (list.ts)

Pure `selectStoryArticles` (ordering/eligibility/limit) is unit-tested; the async DB wrappers are thin.

**Files:**
- Create: `src/server/site-data/stories/list.ts`
- Test: `src/server/site-data/stories/__tests__/list.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/site-data/stories/__tests__/list.test.ts
import { describe, expect, it } from "vitest";
import { selectStoryArticles } from "../list";
import type { HydratedArticle } from "@modules/articles";

const images = JSON.stringify({
  hero: { alt: "Hero", variants: { md: { r2_key: "h-md.webp", width: 1200, height: 800 } } },
});

function art(over: Record<string, unknown>): HydratedArticle {
  return {
    type: "article", workflow_status: "published", headline: "H", slug: "s",
    short_description: "desc", images_json: images, view_count: 0, ...over,
  } as unknown as HydratedArticle;
}

describe("selectStoryArticles", () => {
  it("keeps only eligible articles, orders by view_count desc, and applies the limit", () => {
    const items = [
      art({ slug: "a", view_count: 5 }),
      art({ slug: "b", view_count: 50 }),
      art({ slug: "c", view_count: 20, workflow_status: "draft" }), // ineligible
      art({ slug: "d", view_count: 30 }),
    ];
    const result = selectStoryArticles(items, 2);
    expect(result.map((a) => a.slug)).toEqual(["b", "d"]);
  });

  it("drops ineligible (no cover image) articles", () => {
    const items = [art({ slug: "a", view_count: 9, images_json: null, image_url: undefined })];
    expect(selectStoryArticles(items, 25)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/list.test.ts`
Expected: FAIL with "Cannot find module '../list'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/server/site-data/stories/list.ts
import type { D1Database } from "@cloudflare/workers-types";
import { getArticles, getArticleBySlug, type HydratedArticle } from "@modules/articles";
import { getCloudflareEnv } from "@server/cloudflare/env";
import { getPublicOrganizationProfile, getPublicSiteIdentity } from "../settings";
import { isStoryEligible } from "./eligibility";
import { buildStoryPreview } from "./build-preview";
import { buildStory } from "./build-story";
import type { Story, StoryContext, StoryPreview } from "./types";

const STORY_LIMIT = 25;

/** Pure: keep eligible articles, order by trending, and cap to `limit`. */
export function selectStoryArticles(items: HydratedArticle[], limit: number): HydratedArticle[] {
  return items
    .filter(isStoryEligible)
    .sort((a, b) => ((b as { view_count?: number }).view_count ?? 0) - ((a as { view_count?: number }).view_count ?? 0))
    .slice(0, limit);
}

/** Resolve publisher + origin context for the AMP page from site settings. */
export async function getStoryContext(options?: { db?: D1Database }): Promise<StoryContext> {
  const [org, identity] = await Promise.all([
    getPublicOrganizationProfile(options),
    getPublicSiteIdentity(options),
  ]);
  return {
    origin: identity.site_url.replace(/\/$/, ""),
    publisher: org.name,
    publisher_logo_url: org.logo_url,
  };
}

/** Ring previews for the homepage bar. */
export async function getStories(options?: { db?: D1Database }): Promise<StoryPreview[]> {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return [];

    const recentWindow = new Date();
    recentWindow.setDate(recentWindow.getDate() - 30);

    const trending = await getArticles(db, { workflow_status: "published", publishedAfter: recentWindow, limit: 60 });
    let items = trending.items;
    if (selectStoryArticles(items, STORY_LIMIT).length === 0) {
      const fallback = await getArticles(db, { workflow_status: "published", limit: 60 });
      items = fallback.items;
    }

    return selectStoryArticles(items, STORY_LIMIT)
      .map(buildStoryPreview)
      .filter((p): p is StoryPreview => p !== null);
  } catch (error) {
    console.error("getStories: failed to load stories:", error);
    return [];
  }
}

/** Full story for the AMP page. Returns null when missing or ineligible. */
export async function getStory(slug: string, options?: { db?: D1Database }): Promise<Story | null> {
  const db = options?.db ?? getCloudflareEnv().DB;
  if (!db) return null;

  const article = await getArticleBySlug(db, slug);
  if (!article || !isStoryEligible(article)) return null;

  const ctx = await getStoryContext({ db });
  return buildStory(article, ctx);
}
```

> Note: `getArticles` accepts `publishedAfter` and `workflow_status` (see `src/modules/articles/services/articles.service.ts`); `getArticleBySlug(db, slug)` with no `type` returns any published type.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/site-data/stories/__tests__/list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/site-data/stories/list.ts src/server/site-data/stories/__tests__/list.test.ts
git commit -m "feat(stories): add selection + getStories/getStory data access"
```

---

## Task 7: Barrel + remove legacy stories module

**Files:**
- Create: `src/server/site-data/stories/index.ts`
- Modify: `src/server/site-data/presenters.ts` (remove stories exports)
- Modify: `src/server/site-data/__tests__/site-data.test.ts` (remove `presentStories` block)
- Delete: `src/server/site-data/stories.ts`

- [ ] **Step 1: Write the barrel**

```ts
// src/server/site-data/stories/index.ts
export * from "./types";
export { getStories, getStory, getStoryContext, selectStoryArticles } from "./list";
export { buildStory } from "./build-story";
export { buildStoryPreview } from "./build-preview";
export { isStoryEligible } from "./eligibility";
```

- [ ] **Step 2: Delete the old module and its presenter exports**

```bash
git rm src/server/site-data/stories.ts
```

In `src/server/site-data/presenters.ts`, delete the entire `// --- Stories Presenters ---` section: the `StoryPreview` interface, the `StoryPageData` type, and the `presentStories` function (the block starting at `export interface StoryPreview {` through the end of `presentStories`). Also remove now-unused imports if `extractImage` / `getImageSrcSet` are no longer referenced elsewhere in the file (check first; keep them if other presenters use them).

- [ ] **Step 3: Remove the moved test block**

In `src/server/site-data/__tests__/site-data.test.ts`:
- Remove `presentStories` from the import on line 2 → `import { presentHeaderMenu, presentPopularRecipes } from "../presenters";`
- Delete the entire `describe("presentStories", () => { ... })` block.

- [ ] **Step 4: Verify the whole suite and types are green**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: PASS. No references to the deleted `presentStories` / `StoryPageData` remain.

- [ ] **Step 5: Commit**

```bash
git add -A src/server/site-data
git commit -m "refactor(stories): replace legacy stories module with stories/ package"
```

---

## Task 8: AMP story document component

Renders a complete, strictly-valid AMP document from a `Story`. No Astro scoped styles (all CSS in one `<style amp-custom>` via `set:html`), no custom JS.

**Files:**
- Create: `src/site/components/story/StoryAmp.astro`

- [ ] **Step 1: Write the component**

````astro
---
// src/site/components/story/StoryAmp.astro
// Standalone strict-AMP Web Story document. Rendered as the entire page body
// by src/pages/stories/[slug].astro. Do NOT wrap in Layout.astro and do NOT add
// scoped <style> or client scripts — AMP forbids them.
import type { Story, StorySlide } from "@server/site-data";

interface Props {
  story: Story;
  locale: string;
}
const { story, locale } = Astro.props;

// One inlined stylesheet (brand tokens hardcoded; AMP forbids external site CSS).
const ampCustomCss = `
  * { box-sizing: border-box; }
  amp-story { font-family: "Source Sans 3", system-ui, sans-serif; }
  h1, h2 { font-family: "Playfair Display", Georgia, serif; }
  .bg { width: 100%; height: 100%; }
  .scrim {
    background: linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.88) 100%);
  }
  .panel { padding: 56px 28px 88px; color: #fff; }
  .panel h1, .panel h2 { margin: 0 0 12px; line-height: 1.2; text-shadow: 0 2px 6px rgba(0,0,0,0.6); }
  .panel h1 { font-size: 30px; }
  .panel h2 { font-size: 26px; }
  .panel p { margin: 0; font-size: 18px; line-height: 1.5; text-shadow: 0 1px 4px rgba(0,0,0,0.7); }
  .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  .pill { background: rgba(216,164,62,0.92); color: #1b1b1b; font-weight: 700; font-size: 14px; padding: 6px 12px; border-radius: 999px; }
  .ingredients { list-style: none; margin: 16px 0 0; padding: 0; }
  .ingredients li { font-size: 18px; line-height: 1.7; border-bottom: 1px solid rgba(255,255,255,0.18); padding: 6px 0; }
  .kicker { display: inline-block; background: #2a5c36; color: #fff; font-weight: 700; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; padding: 5px 12px; border-radius: 6px; margin-bottom: 12px; }
`;

const ldJson = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: story.title,
  image: [story.poster_portrait_url],
  mainEntityOfPage: story.canonical_url,
  publisher: { "@type": "Organization", name: story.publisher, logo: { "@type": "ImageObject", url: story.publisher_logo_url } },
};

const renderSlide = (slide: StorySlide) => slide;
---
<html ⚡ lang={locale}>
  <head>
    <meta charset="utf-8" />
    <title>{story.title}</title>
    <link rel="canonical" href={story.canonical_url} />
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1" />
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    <script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@400;700&display=swap"
      rel="stylesheet"
    />
    <style amp-boilerplate set:html={`body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}`}></style>
    <noscript><style amp-boilerplate set:html={`body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}`}></style></noscript>
    <style amp-custom set:html={ampCustomCss}></style>
    <script type="application/ld+json" set:html={JSON.stringify(ldJson)}></script>
  </head>
  <body>
    <amp-story
      standalone
      title={story.title}
      publisher={story.publisher}
      publisher-logo-src={story.publisher_logo_url}
      poster-portrait-src={story.poster_portrait_url}
    >
      {story.slides.map((slide) => {
        const s = renderSlide(slide);
        return (
          <amp-story-page id={s.id}>
            {s.image && (
              <amp-story-grid-layer template="fill">
                <amp-img class="bg" src={s.image.url} width={s.image.width} height={s.image.height} layout="fill" alt={s.image.alt}></amp-img>
                <div class="bg scrim"></div>
              </amp-story-grid-layer>
            )}
            <amp-story-grid-layer template="vertical">
              <div class="panel" grid-area="lower-third">
                {s.kind === "step" && <span class="kicker">{s.heading}</span>}
                {s.heading && s.kind !== "step" && (s.kind === "cover" ? <h1>{s.heading}</h1> : <h2>{s.heading}</h2>)}
                {s.kind === "step" && s.body && <p>{s.body}</p>}
                {s.kind !== "step" && s.body && <p>{s.body}</p>}
                {s.items && (
                  <ul class="ingredients">
                    {s.items.map((item) => <li>{item}</li>)}
                  </ul>
                )}
                {s.meta && (
                  <div class="meta">
                    {s.meta.total_time && <span class="pill">⏱ {s.meta.total_time}</span>}
                    {s.meta.servings && <span class="pill">🍽 {s.meta.servings}</span>}
                    {s.meta.rating && <span class="pill">★ {s.meta.rating}</span>}
                  </div>
                )}
              </div>
            </amp-story-grid-layer>
            {s.kind === "cta" && (
              <amp-story-page-outlink layout="nodisplay">
                <a href={story.target_url}>Voir la recette complète</a>
              </amp-story-page-outlink>
            )}
          </amp-story-page>
        );
      })}
    </amp-story>
  </body>
</html>
````

> Implementation notes:
> - `set:html` is used for the boilerplate/custom CSS and JSON-LD so Astro outputs them verbatim (no HTML-entity escaping, no scoped-class injection).
> - `⚡` may be written as `amp` instead (`<html amp lang=...>`) if the editor mangles the character; both are valid.
> - AMP CDN scripts intentionally carry **no** `integrity`/SRI (see spec: AMP forbids extra attributes and the runtime auto-updates).

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (AMP custom elements like `amp-story` are accepted by Astro's JSX; if TS complains about unknown elements, they are treated as intrinsic by `astro check` — confirm `pnpm exec astro check` reports no new errors on this file.)

- [ ] **Step 3: Commit**

```bash
git add src/site/components/story/StoryAmp.astro
git commit -m "feat(stories): add strict-AMP story document component"
```

---

## Task 9: AMP page route

**Files:**
- Create: `src/pages/stories/[slug].astro`

- [ ] **Step 1: Write the route**

```astro
---
// src/pages/stories/[slug].astro
import { env } from "cloudflare:workers";
import StoryAmp from "@components/story/StoryAmp.astro";
import { getStory } from "@server/site-data";
import { getPublicSiteIdentity } from "@server/site-data";

const { slug } = Astro.params;
if (!slug) return new Response("Slug is missing", { status: 400 });

const story = await getStory(slug, { db: env.DB });
if (!story) return Astro.redirect("/404");

const identity = await getPublicSiteIdentity({ db: env.DB });
---
<StoryAmp story={story} locale={identity.locale} />
```

> `@components` is the path alias for `src/site/components` (same alias used by `src/pages/recipes/[slug].astro`). Confirm in `tsconfig`/`astro.config` and adjust the import if the alias differs.

- [ ] **Step 2: Manual smoke check (dev)**

Run: `pnpm dev`, open `http://localhost:4321/stories/<an-existing-published-slug>`.
Expected: the AMP story renders and swipes. (Dev injects HMR scripts, so it is **not** AMP-valid here — validity is checked in Task 13.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/stories/[slug].astro
git commit -m "feat(stories): add /stories/[slug] AMP route"
```

---

## Task 10: Client controller for the bar + player

Typed module: opens the `amp-story-player` lightbox on ring click, restores scroll on close, and degrades to navigation without JS.

**Files:**
- Create: `src/site/scripts/stories-player.ts`

- [ ] **Step 1: Write the controller**

```ts
// src/site/scripts/stories-player.ts

/** Minimal typing for the parts of the amp-story-player API we use. */
interface AmpStoryPlayerEl extends HTMLElement {
  show(storyUrl: string | null, pageId?: string | null): void;
}

export class StoriesBarController {
  private player: AmpStoryPlayerEl | null;
  private rings: NodeListOf<HTMLAnchorElement>;

  constructor(private root: HTMLElement) {
    this.player = root.querySelector<AmpStoryPlayerEl>("amp-story-player");
    this.rings = root.querySelectorAll<HTMLAnchorElement>("[data-story-href]");
    this.bind();
  }

  private bind() {
    this.rings.forEach((ring) => {
      ring.addEventListener("click", (event) => {
        // No player available → let the link navigate to the AMP page.
        if (!this.player || typeof this.player.show !== "function") return;
        event.preventDefault();
        const href = ring.getAttribute("data-story-href");
        if (href) this.player.show(href);
      });
    });

    // Restore scroll when the player lightbox closes.
    this.player?.addEventListener("amp-story-player-close", () => {
      document.body.style.overflow = "";
    });
  }
}

export function initStoriesBar() {
  document.querySelectorAll<HTMLElement>("[data-stories-bar]").forEach((bar) => {
    new StoriesBarController(bar);
  });
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/site/scripts/stories-player.ts
git commit -m "feat(stories): add typed bar/player client controller"
```

---

## Task 11: Rewrite the homepage StoriesBar

**Files:**
- Modify (full rewrite): `src/site/components/StoriesBar.astro`

- [ ] **Step 1: Replace the file contents**

````astro
---
import type { StoryPreview } from "@server/site-data";

interface Props {
  stories?: StoryPreview[];
}
const { stories = [] } = Astro.props as Props;
---

{
  stories.length > 0 && (
    <section class="stories-section" aria-label="Web Stories" data-stories-bar>
      <h2 class="sr-only">Stories</h2>
      <div class="stories-container">
        <div class="stories-scroll">
          {stories.map((story) => (
            <a
              class="story-item"
              href={story.href}
              data-story-href={story.href}
              aria-label={`Voir la story : ${story.headline}`}
            >
              <span class="story-ring">
                <span class="story-image-wrapper">
                  <img
                    src={story.image.url}
                    alt=""
                    width={story.image.width}
                    height={story.image.height}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              </span>
              <span class="story-title">{story.headline}</span>
            </a>
          ))}
        </div>
      </div>

      <amp-story-player>
        <script
          type="application/json"
          set:html={JSON.stringify({
            behavior: { autoplay: false },
            controls: [
              { name: "close", position: "start" },
              { name: "skip-to-next" },
            ],
          })}
        />
        {stories.map((story) => (
          <a href={story.href}>{story.headline}</a>
        ))}
      </amp-story-player>
    </section>
  )
}

<link rel="stylesheet" href="https://cdn.ampproject.org/amp-story-player-v0.css" />
<script async src="https://cdn.ampproject.org/amp-story-player-v0.js" is:inline></script>

<script>
  import { initStoriesBar } from "@scripts/stories-player";
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStoriesBar);
  } else {
    initStoriesBar();
  }
</script>

<style>
  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0);
    white-space: nowrap; border: 0;
  }

  .stories-section {
    padding: var(--space-4) 0;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-subtle);
  }
  .stories-container {
    max-width: var(--container-max);
    margin: 0 auto;
    padding: 0 var(--space-4);
  }
  .stories-scroll {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-1) 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .stories-scroll::-webkit-scrollbar { display: none; }

  .story-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: var(--space-20);
    text-align: center;
    text-decoration: none;
  }
  .story-ring {
    width: 76px; height: 76px;
    border-radius: var(--radius-full);
    padding: 3px;
    background: var(--brand-gradient);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: var(--space-2);
    transition: transform var(--transition-spring), box-shadow var(--transition-base);
  }
  .story-item:hover .story-ring,
  .story-item:focus-visible .story-ring {
    transform: scale(1.06);
    box-shadow: var(--shadow-hover);
  }
  .story-image-wrapper {
    width: 100%; height: 100%;
    background: var(--bg-elevated);
    border-radius: var(--radius-full);
    padding: 3px;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .story-image-wrapper img {
    width: 100%; height: 100%;
    border-radius: var(--radius-full);
    object-fit: cover;
  }
  .story-title {
    font-size: var(--text-xs);
    line-height: var(--leading-tight);
    font-weight: var(--font-medium);
    color: var(--text);
    max-width: 76px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 2.4em;
  }
  .story-item:hover .story-title,
  .story-item:focus-visible .story-title { color: var(--brand-primary); }

  /* The player renders only as a lightbox; its inline entry list stays hidden. */
  amp-story-player { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .story-ring { transition: none; }
  }
</style>
````

> Confirm `@scripts` aliases `src/site/scripts` (used by other site components that import controllers). If the project imports site scripts via a relative path instead, change the import to `../scripts/stories-player`.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/site/components/StoriesBar.astro
git commit -m "feat(stories): rewrite StoriesBar with accessible rings + amp-story-player"
```

---

## Task 12: Wire the homepage + delete the legacy viewer

**Files:**
- Modify: `src/pages/index.astro`
- Delete: `src/site/components/WebStoryViewer.astro`

- [ ] **Step 1: Update index.astro**

In `src/pages/index.astro`:
- Remove the import line: `import WebStoryViewer from "@components/WebStoryViewer.astro";`
- Remove the usage near the end: `<WebStoryViewer />`
- Keep `import StoriesBar from "@components/StoriesBar.astro";` and `import { ..., getStories } from "@server/site-data";`
- Keep `const stories = await getStories();` and `<StoriesBar stories={stories} />` (the prop type is now `StoryPreview[]`, which is what `getStories()` returns).

- [ ] **Step 2: Delete the legacy viewer**

```bash
git rm src/site/components/WebStoryViewer.astro
```

- [ ] **Step 3: Type-check + boundaries**

Run: `pnpm exec tsc --noEmit && pnpm check:boundaries`
Expected: PASS. No remaining references to `WebStoryViewer` or `window.openWebStory`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(stories): wire StoriesBar previews and remove legacy WebStoryViewer"
```

---

## Task 13: Contract doc + CLAUDE.md reference

**Files:**
- Create: `docs/WEB_STORY_CONTRACT.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write `docs/WEB_STORY_CONTRACT.md`**

```markdown
# Web Story Contract

> **Last Updated:** 2026-06-13

Presentation contract for auto-generated Web Stories. Web Stories are **derived
at request time** from published articles; they are not stored in the database
and have no admin authoring UI.

## Source & Selection

- Eligible = published + has a usable cover image + usable content
  (recipe: ≥1 step or ingredient; non-recipe: non-empty `short_description` or content).
- The homepage bar shows up to **25** eligible articles ordered by `view_count`
  over a recent window, falling back to most recent.

## Story Model (server-side, snake_case)

`Story`, `StorySlide`, `StoryImage`, `StoryPreview` are defined in
`src/server/site-data/stories/types.ts`. Images are resolved to **public URLs**
server-side; `r2_key` is never exposed.

## Slide Composition

- Recipe: cover → ingredients (≤8 + "+N autres") → steps (≤7) → nutrition
  (only when `recipe_json.nutrition.status === "validated"`) → CTA.
- Non-recipe (and recipes without steps/ingredients): cover → optional info → CTA.
- Image pool per story: hero, recipe step images (`images_json.recipe_steps`),
  and content images (`images_json.content_images`), de-duplicated across
  consecutive slides with hero fallback.

## AMP Page Contract — `/stories/<slug>`

- Strictly-valid standalone `amp-story` document (no site Layout, no scoped
  styles, no custom JS, single `<style amp-custom>`).
- Required metadata: `title`, `publisher`, `publisher-logo-src`,
  `poster-portrait-src`; canonical points to the story page.
- AMP CDN runtime scripts carry no SRI by design.
- Validity is checked with `pnpm preview` + the AMP validator (not `pnpm dev`).

## On-site Player

- The homepage bar renders accessible ring links to `/stories/<slug>` plus a
  hidden `<amp-story-player>` listing the same URLs. `src/site/scripts/stories-player.ts`
  opens the lightbox via `player.show(href)`; without JS the link navigates to
  the AMP page.
```

- [ ] **Step 2: Add the doc to CLAUDE.md**

In `CLAUDE.md`, under `## Contracts`, add this bullet to the list:
```
- `docs/WEB_STORY_CONTRACT.md`
```

- [ ] **Step 3: Commit**

```bash
git add docs/WEB_STORY_CONTRACT.md CLAUDE.md
git commit -m "docs(stories): add Web Story contract and reference it in CLAUDE.md"
```

---

## Task 14: Full verification

- [ ] **Step 1: Unit tests + types + boundaries**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm check:boundaries`
Expected: PASS. All new story tests green; no boundary violations (no `@server/*` import from `src/admin`; `src/site` only imports server **types/data** through props as before).

- [ ] **Step 2: Production-like AMP validity check**

Run: `pnpm preview`, then open `http://localhost:8788/stories/<published-slug>` (Wrangler port).
Validate AMP one of these ways:
- append `#development=1` to the URL and check the browser console for "AMP validation successful", or
- paste the page source into https://validator.ampproject.org/.
Expected: **PASS** (0 errors). Fix any reported errors (common: missing image width/height, stray `<style>`, disallowed attribute) before merging.

- [ ] **Step 3: On-site overlay + fallback check**

- On the homepage, click a ring → the `amp-story-player` lightbox opens at that story; swipe/keyboard navigates; close restores scroll.
- Disable JavaScript and click a ring → the browser navigates to `/stories/<slug>` (the AMP page) directly.
Expected: both behaviors work.

- [ ] **Step 4: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "fix(stories): resolve AMP validation + overlay review findings"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Re-architecture / typed contract → Tasks 1, 7. Server-side image resolution (no `r2_key`) → Tasks 2, 4, 5 (tests assert it). Slide composition + caps + nutrition + fallback → Task 5. All-types selection + limit 25 + trending/recency fallback → Task 6. Strict AMP page → Tasks 8, 9, 14. amp-story-player overlay + progressive enhancement → Tasks 10, 11. Cleanup of legacy viewer/presenter → Tasks 7, 12. Contract doc → Task 13. Tests → Tasks 2–6, 14. AMP-validity workflow + SRI exception → Tasks 8, 14.
- Open spec items (content-image helper, portrait posters) are addressed: content images resolve from `images_json.content_images` (Task 2, verified against `ContentRenderer.astro`); portrait poster derives from the hero/best image (Task 5) — accepted v1 limitation.

**Placeholder scan:** No "TBD/TODO/handle edge cases". Every code step contains complete code; the only prose-only steps are deletions/wiring and manual verification, each with exact instructions.

**Type consistency:** `StoryImage`/`StorySlide`/`Story`/`StoryPreview`/`StoryContext` (Task 1) are used consistently in Tasks 2, 4, 5, 6, 8, 9, 11. `buildImagePool`/`slotToStoryImage` (Task 2) reused by Tasks 4 & 5. `getStories(): StoryPreview[]` (Task 6) matches `StoriesBar` props (Task 11) and `index.astro` (Task 12). `getStory(slug): Story | null` (Task 6) matches the route (Task 9) and `StoryAmp` props (Task 8).
```
