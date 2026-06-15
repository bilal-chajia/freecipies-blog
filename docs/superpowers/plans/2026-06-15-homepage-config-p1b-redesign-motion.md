# Homepage Config — Phase 1b (Redesign + Motion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the settings-driven public homepage sections built in P1a into a cohesive editorial food-blog experience with accessible motion and progressive carousel enhancement, without touching admin config or adding P3-only section types.

**Architecture:** Keep the P1a data rail unchanged: `index.astro` stays thin, `resolveHomeData` stays the data boundary, and each `src/site/components/home/*` component owns its rendering and scoped styles. Add a small shared homepage card/style utility layer and a deferred vanilla carousel enhancement for hero/featured/collections while preserving SSR markup and CSS scroll-snap as the no-JS baseline.

**Tech Stack:** Astro SSR, TypeScript strict, CSS tokens, vanilla browser script, Embla Carousel vanilla core, Vitest, Lighthouse/manual runtime verification.

**Spec:** `docs/superpowers/specs/2026-06-15-homepage-config-and-redesign-design.md` sections 7, 8, 10, 11.

**Branch:** Continue on `feat/homepage-config-redesign`.

**Non-goals for this phase:**
- Do not wire the admin UI. That is P2.
- Do not add `quick_filters`, `seasonal_spotlight`, `social_proof`, `faq`, `lead_magnet`, `social_feed`, `banner`, hero search, `ItemList`, or `FAQPage`. Those are P3.
- Do not change `homepage_settings` storage shape beyond P0/P1a.
- Do not run `pnpm build` or `pnpm preview` without explicit user approval.

---

## Current State

P0 and P1a are implemented. `src/pages/index.astro` delegates to:

- `src/site/components/home/HomeSections.astro`
- `src/site/components/home/HeroSection.astro`
- `src/site/components/home/FeaturedRecipes.astro`
- `src/site/components/home/CategoryBrowse.astro`
- `src/site/components/home/Collections.astro`
- `src/site/components/home/LatestRecipes.astro`
- `src/site/components/home/AboutAuthor.astro`
- `src/site/components/home/NewsletterBanner.astro`

Current visuals are mostly moved-from-old-page styles. P1b changes presentation and motion only.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` / `pnpm-lock.yaml` | Add direct vanilla Embla dependencies if not already present. |
| `src/site/scripts/home-carousels.ts` | Deferred progressive enhancement for SSR carousel markup. |
| `src/site/components/home/HeroSection.astro` | Premium hero carousel redesign, real `<h2>`, CSS scroll-snap baseline, Embla hooks. |
| `src/site/components/home/FeaturedRecipes.astro` | Editorial featured carousel/grid with shared card language and reveal motion. |
| `src/site/components/home/Collections.astro` | Same carousel/card language for roundups, hidden when empty. |
| `src/site/components/home/LatestRecipes.astro` | Dense latest recipe grid with unified cards and reveal motion. |
| `src/site/components/home/CategoryBrowse.astro` | Polished category hub with chip/card hybrid and no carousel. |
| `src/site/components/home/AboutAuthor.astro` | Editorial author band refresh. |
| `src/site/components/home/NewsletterBanner.astro` | Premium newsletter band with accessible form states. |
| `src/site/components/home/HomeSections.astro` | Import the deferred carousel script only when carousel sections exist. |
| `src/site/utils/__tests__/home-jsonld.test.ts` | Keep existing JSON-LD tests green; no P3 JSON-LD in this phase. |
| `src/site/utils/__tests__/home-data.test.ts` | Keep existing resolver tests green. |

---

## Task 1: Add Vanilla Carousel Dependency

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Confirm dependency state**

Run:

```bash
pnpm list embla-carousel embla-carousel-autoplay
```

Expected before this task:

- `embla-carousel-react` may be present.
- `embla-carousel` and `embla-carousel-autoplay` may not be direct dependencies.

- [ ] **Step 2: Add direct dependencies**

Run:

```bash
pnpm add embla-carousel embla-carousel-autoplay
```

Expected:

- `package.json` includes direct dependencies:

```json
"embla-carousel": "^8.6.0",
"embla-carousel-autoplay": "^8.6.0"
```

Use the version resolved by pnpm if it differs from `8.6.0`; keep both packages on the same major/minor.

- [ ] **Step 3: Verify install did not touch unrelated packages**

Run:

```bash
git diff -- package.json pnpm-lock.yaml
```

Expected:

- Only dependency additions and lockfile entries related to Embla.

- [ ] **Step 4: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(home): add vanilla Embla carousel dependencies" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Create Deferred Carousel Enhancer

**Files:**
- Create: `src/site/scripts/home-carousels.ts`

- [ ] **Step 1: Create the script**

Create `src/site/scripts/home-carousels.ts`:

```ts
import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';

type ManagedCarousel = {
  root: HTMLElement;
  embla: EmblaCarouselType;
  autoplay: ReturnType<typeof Autoplay> | null;
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const carousels: ManagedCarousel[] = [];

function setSelected(root: HTMLElement, embla: EmblaCarouselType) {
  const selected = embla.selectedScrollSnap();
  root.querySelectorAll<HTMLElement>('[data-home-carousel-dot]').forEach((dot, index) => {
    const isSelected = index === selected;
    dot.classList.toggle('is-selected', isSelected);
    dot.setAttribute('aria-selected', String(isSelected));
  });
}

function initCarousel(root: HTMLElement) {
  if (root.dataset.carouselReady === 'true') return;

  const viewport = root.querySelector<HTMLElement>('[data-home-carousel-viewport]');
  const previous = root.querySelector<HTMLButtonElement>('[data-home-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-home-carousel-next]');
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-home-carousel-dot]'));
  if (!viewport) return;

  root.dataset.carouselReady = 'true';

  const autoplay = !reduceMotion && root.dataset.homeCarouselAutoplay === 'true'
    ? Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
    : null;

  const embla = EmblaCarousel(
    viewport,
    {
      align: 'start',
      containScroll: 'trimSnaps',
      loop: root.dataset.homeCarouselLoop === 'true',
      skipSnaps: false,
      dragFree: false,
    },
    autoplay ? [autoplay] : [],
  );

  previous?.addEventListener('click', () => embla.scrollPrev());
  next?.addEventListener('click', () => embla.scrollNext());
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => embla.scrollTo(index));
  });

  embla.on('select', () => setSelected(root, embla));
  embla.on('reInit', () => setSelected(root, embla));
  setSelected(root, embla);

  carousels.push({ root, embla, autoplay });
}

function initHomeCarousels() {
  document.querySelectorAll<HTMLElement>('[data-home-carousel]').forEach(initCarousel);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomeCarousels, { once: true });
} else {
  initHomeCarousels();
}

window.addEventListener('pagehide', () => {
  for (const item of carousels) {
    item.autoplay?.destroy();
    item.embla.destroy();
    item.root.dataset.carouselReady = 'false';
  }
  carousels.length = 0;
});
```

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/site/scripts/home-carousels.ts
git commit -m "feat(home): add deferred homepage carousel enhancer" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Wire Carousel Script Through Dispatcher

**Files:**
- Modify: `src/site/components/home/HomeSections.astro`

- [ ] **Step 1: Update dispatcher script loading**

Replace `src/site/components/home/HomeSections.astro` with:

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
const hasCarousel = sections.some((section) =>
  section.kind === 'hero' ||
  section.kind === 'featured_recipes' ||
  section.kind === 'collections',
);
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
{hasCarousel && <script type="module" src="/src/site/scripts/home-carousels.ts"></script>}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/site/components/home/HomeSections.astro
git commit -m "feat(home): load carousel enhancer only for carousel sections" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Redesign Hero Section

**Files:**
- Modify: `src/site/components/home/HeroSection.astro`

- [ ] **Step 1: Replace the component**

Replace `src/site/components/home/HeroSection.astro` with:

```astro
---
import { extractImage, getImageSrcSet } from '@shared/utils';
import type { HomepageHeroSection } from '@modules/settings/types/settings.types';
import type { HydratedArticle } from '@modules/articles/types';

interface Props {
  section: HomepageHeroSection;
  recipes: HydratedArticle[];
}

const { section, recipes } = Astro.props;
const slides = recipes.slice(0, 4);
const supportCards = recipes.slice(1, 3);

const getRecipeImage = (recipe: HydratedArticle, targetWidth: number, prefer: 'hero' | 'thumbnail' = 'hero') => {
  const hero = extractImage(recipe.images_json, 'hero', targetWidth);
  const thumbnail = extractImage(recipe.images_json, 'thumbnail', targetWidth);
  const slotName = prefer === 'hero'
    ? (hero.image_url ? 'hero' : 'thumbnail')
    : (thumbnail.image_url ? 'thumbnail' : 'hero');
  const selected = slotName === 'hero' ? hero : thumbnail;
  const srcSet = getImageSrcSet(recipe.images_json, slotName);
  return { selected, srcSet };
};

const getRecipeUrl = (recipe: HydratedArticle) => recipe.route || `/recipes/${recipe.slug}`;
---

{slides.length > 0 && (
  <section class="home-hero" aria-labelledby="home-hero-title" data-fade-up>
    <div class="home-hero__inner">
      <div
        class="home-hero__carousel"
        data-home-carousel
        data-home-carousel-loop="true"
        data-home-carousel-autoplay="true"
      >
        <div class="home-hero__viewport" data-home-carousel-viewport>
          <div class="home-hero__track">
            {slides.map((recipe, index) => {
              const { selected, srcSet } = getRecipeImage(recipe, 1400, 'hero');
              return (
                <article class="home-hero__slide">
                  <a href={getRecipeUrl(recipe)} class="home-hero__media">
                    {(selected.image_url || recipe.image_url) && (
                      <img
                        src={selected.image_url || recipe.image_url}
                        alt={selected.imageAlt || recipe.imageAlt || recipe.headline}
                        width={selected.imageWidth || recipe.imageWidth || 1400}
                        height={selected.imageHeight || recipe.imageHeight || 900}
                        srcset={srcSet || undefined}
                        sizes={srcSet ? '(max-width: 900px) 100vw, 68vw' : undefined}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchpriority={index === 0 ? 'high' : 'auto'}
                        style={selected.imageStyle || undefined}
                      />
                    )}
                  </a>
                  <div class="home-hero__copy">
                    <p class="home-eyebrow">Editor's pick</p>
                    <h2 id={index === 0 ? 'home-hero-title' : undefined} class="home-hero__title">
                      <a href={getRecipeUrl(recipe)}>{recipe.headline}</a>
                    </h2>
                    {recipe.excerpt && <p class="home-hero__excerpt">{recipe.excerpt}</p>}
                    <a href={getRecipeUrl(recipe)} class="home-hero__cta">Cook this recipe</a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        {slides.length > 1 && (
          <div class="home-carousel-controls" aria-label="Featured recipe carousel controls">
            <button type="button" class="home-carousel-button" data-home-carousel-prev aria-label="Previous recipe">‹</button>
            <div class="home-carousel-dots" role="tablist" aria-label="Featured recipes">
              {slides.map((recipe, index) => (
                <button
                  type="button"
                  class="home-carousel-dot"
                  data-home-carousel-dot
                  role="tab"
                  aria-label={`Show ${recipe.headline}`}
                  aria-selected={index === 0 ? 'true' : 'false'}
                />
              ))}
            </div>
            <button type="button" class="home-carousel-button" data-home-carousel-next aria-label="Next recipe">›</button>
          </div>
        )}
      </div>

      {supportCards.length > 0 && (
        <aside class="home-hero__side" aria-label="More featured recipes">
          {supportCards.map((recipe, index) => {
            const { selected, srcSet } = getRecipeImage(recipe, 560, 'thumbnail');
            return (
              <a href={getRecipeUrl(recipe)} class="home-hero-side-card" data-fade-up style={`--fade-delay: ${index * 80}ms`}>
                {(selected.image_url || recipe.image_url) && (
                  <img
                    src={selected.image_url || recipe.image_url}
                    alt={selected.imageAlt || recipe.imageAlt || recipe.headline}
                    width={selected.imageWidth || recipe.imageWidth || 560}
                    height={selected.imageHeight || recipe.imageHeight || 420}
                    srcset={srcSet || undefined}
                    sizes={srcSet ? '(max-width: 900px) 50vw, 22vw' : undefined}
                    loading="lazy"
                    style={selected.imageStyle || undefined}
                  />
                )}
                <span>{recipe.category?.label || 'Recipe'}</span>
                <strong>{recipe.headline}</strong>
              </a>
            );
          })}
        </aside>
      )}
    </div>
  </section>
)}

<style>
  .home-hero {
    padding: clamp(var(--space-6), 5vw, var(--space-12)) var(--space-5) clamp(var(--space-12), 8vw, var(--space-20));
    background: linear-gradient(180deg, var(--brand-primary-light), var(--bg) 72%);
  }

  .home-hero__inner {
    max-width: var(--container-max);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(260px, 0.75fr);
    gap: clamp(var(--space-5), 3vw, var(--space-8));
    align-items: stretch;
  }

  .home-hero__carousel {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-2xl);
    background: var(--bg-elevated);
    box-shadow: var(--shadow-xl);
  }

  .home-hero__viewport {
    overflow: hidden;
  }

  .home-hero__track {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .home-hero__track::-webkit-scrollbar {
    display: none;
  }

  .home-hero__slide {
    position: relative;
    flex: 0 0 100%;
    min-height: clamp(440px, 58vw, 680px);
    scroll-snap-align: start;
    isolation: isolate;
  }

  .home-hero__media,
  .home-hero__media img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .home-hero__media img {
    object-fit: cover;
  }

  .home-hero__slide::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(90deg, rgba(18, 22, 19, 0.82), rgba(18, 22, 19, 0.46) 48%, rgba(18, 22, 19, 0.12));
  }

  .home-hero__copy {
    position: relative;
    z-index: 1;
    max-width: 640px;
    padding: clamp(var(--space-8), 7vw, var(--space-16));
    color: var(--text-inverse);
  }

  .home-eyebrow {
    margin: 0 0 var(--space-3);
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--text-lg);
    color: var(--brand-accent);
  }

  .home-hero__title {
    margin: 0;
    max-width: 11ch;
    font-family: var(--font-serif);
    font-size: clamp(2.4rem, 6vw, 5.8rem);
    line-height: 0.96;
    letter-spacing: 0;
  }

  .home-hero__title a {
    color: inherit;
    text-decoration: none;
  }

  .home-hero__excerpt {
    max-width: 42rem;
    margin: var(--space-5) 0 0;
    font-size: var(--text-lg);
    line-height: var(--leading-relaxed);
  }

  .home-hero__cta {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    margin-top: var(--space-7);
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-full);
    background: var(--brand-accent);
    color: var(--text);
    font-weight: var(--font-bold);
    text-decoration: none;
    transition: transform var(--transition-base), background var(--transition-base);
  }

  .home-hero__cta:hover,
  .home-hero__cta:focus-visible {
    background: var(--brand-accent-hover);
    transform: translateY(-2px);
  }

  .home-carousel-controls {
    position: absolute;
    right: var(--space-5);
    bottom: var(--space-5);
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--bg-elevated) 82%, transparent);
    backdrop-filter: blur(12px);
  }

  .home-carousel-button,
  .home-carousel-dot {
    min-width: 32px;
    min-height: 32px;
    border: 0;
    border-radius: var(--radius-full);
    cursor: pointer;
  }

  .home-carousel-button {
    background: var(--brand-primary);
    color: var(--text-inverse);
    font-size: var(--text-xl);
    line-height: 1;
  }

  .home-carousel-dots {
    display: flex;
    gap: var(--space-1);
  }

  .home-carousel-dot {
    background: transparent;
  }

  .home-carousel-dot::before {
    content: "";
    display: block;
    width: var(--space-2);
    height: var(--space-2);
    margin: auto;
    border-radius: var(--radius-full);
    background: var(--text-secondary);
    transition: transform var(--transition-base), background var(--transition-base);
  }

  .home-carousel-dot.is-selected::before,
  .home-carousel-dot[aria-selected="true"]::before {
    background: var(--brand-primary);
    transform: scale(1.45);
  }

  .home-hero__side {
    display: grid;
    gap: var(--space-4);
  }

  .home-hero-side-card {
    position: relative;
    min-height: 220px;
    overflow: hidden;
    border-radius: var(--radius-xl);
    color: var(--text-inverse);
    text-decoration: none;
    box-shadow: var(--shadow-lg);
    isolation: isolate;
  }

  .home-hero-side-card img {
    position: absolute;
    inset: 0;
    z-index: -2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-slow);
  }

  .home-hero-side-card::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(0deg, rgba(18, 22, 19, 0.82), rgba(18, 22, 19, 0.12));
  }

  .home-hero-side-card span,
  .home-hero-side-card strong {
    display: block;
    margin-inline: var(--space-5);
  }

  .home-hero-side-card span {
    margin-top: auto;
    padding-top: var(--space-24);
    color: var(--brand-accent);
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    text-transform: uppercase;
  }

  .home-hero-side-card strong {
    margin-top: var(--space-2);
    margin-bottom: var(--space-5);
    font-family: var(--font-serif);
    font-size: var(--text-xl);
    line-height: var(--leading-tight);
  }

  .home-hero-side-card:hover img {
    transform: scale(1.05);
  }

  @media (max-width: 980px) {
    .home-hero__inner {
      grid-template-columns: 1fr;
    }

    .home-hero__side {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .home-hero {
      padding-inline: 0;
    }

    .home-hero__carousel {
      border-radius: 0;
    }

    .home-hero__slide {
      min-height: 560px;
    }

    .home-hero__side {
      grid-template-columns: 1fr;
      padding-inline: var(--space-5);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-hero__cta,
    .home-hero-side-card img,
    .home-carousel-dot::before {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/site/components/home/HeroSection.astro
git commit -m "feat(home): redesign hero as editorial carousel" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Redesign Featured and Collections as Horizontal Editorial Rails

**Files:**
- Modify: `src/site/components/home/FeaturedRecipes.astro`
- Modify: `src/site/components/home/Collections.astro`

- [ ] **Step 1: Apply shared rail structure to FeaturedRecipes**

In `FeaturedRecipes.astro`, keep the frontmatter helper functions, then replace the rendered markup with this structure:

```astro
{recipes.length > 0 && (
  <section class="home-rail home-rail--featured" aria-labelledby="featured-recipes-title" data-fade-up>
    <div class="home-rail__header">
      <p class="home-rail__eyebrow">Featured recipes</p>
      <h2 id="featured-recipes-title">{section.title}</h2>
      {section.subtitle && <p>{section.subtitle}</p>}
    </div>
    <div class="home-rail__carousel" data-home-carousel data-home-carousel-loop="false" data-home-carousel-autoplay="false">
      <div class="home-rail__viewport" data-home-carousel-viewport>
        <div class="home-rail__track">
          {recipes.map((recipe, index) => {
            const { selected, srcSet } = getRecipeImage(recipe, 520, 'hero');
            const cachedRecipe = parseCachedRecipe(recipe.cached_recipe_json);
            const cookTime = cachedRecipe?.cook_time_minutes ?? null;
            return (
              <article class="home-card" data-fade-up style={`--fade-delay: ${index * 70}ms`}>
                <a href={getRecipeUrl(recipe)} class="home-card__image">
                  {(selected.image_url || recipe.image_url) && (
                    <img
                      src={selected.image_url || recipe.image_url}
                      alt={selected.imageAlt || recipe.imageAlt || recipe.headline}
                      width={selected.imageWidth || recipe.imageWidth || 520}
                      height={selected.imageHeight || recipe.imageHeight || 390}
                      srcset={srcSet || undefined}
                      sizes={srcSet ? '(max-width: 640px) 82vw, (max-width: 1024px) 42vw, 28vw' : undefined}
                      loading="lazy"
                      style={selected.imageStyle || undefined}
                    />
                  )}
                  <span style={`--badge-color: ${recipe.category?.color || 'var(--brand-primary)'}`}>{recipe.category?.label || 'Recipe'}</span>
                </a>
                <div class="home-card__body">
                  <h3><a href={getRecipeUrl(recipe)}>{recipe.headline}</a></h3>
                  <p>{recipe.excerpt || recipe.category?.label || 'Fresh from the kitchen.'}</p>
                  {cookTime && <small>{cookTime} min cook</small>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 2: Apply matching structure to Collections**

In `Collections.astro`, keep the frontmatter helpers, then replace the rendered markup with:

```astro
{roundups.length > 0 && (
  <section class="home-rail home-rail--collections" aria-labelledby="collections-title" data-fade-up>
    <div class="home-rail__header">
      <p class="home-rail__eyebrow">Collections</p>
      <h2 id="collections-title">{section.title}</h2>
      {section.subtitle && <p>{section.subtitle}</p>}
    </div>
    <div class="home-rail__carousel" data-home-carousel data-home-carousel-loop="false" data-home-carousel-autoplay="false">
      <div class="home-rail__viewport" data-home-carousel-viewport>
        <div class="home-rail__track">
          {roundups.map((roundup, index) => {
            const { selected, srcSet } = getRecipeImage(roundup, 520, 'hero');
            return (
              <article class="home-card home-card--collection" data-fade-up style={`--fade-delay: ${index * 70}ms`}>
                <a href={getRoundupUrl(roundup)} class="home-card__image">
                  {(selected.image_url || roundup.image_url) && (
                    <img
                      src={selected.image_url || roundup.image_url}
                      alt={selected.imageAlt || roundup.imageAlt || roundup.headline}
                      width={selected.imageWidth || roundup.imageWidth || 520}
                      height={selected.imageHeight || roundup.imageHeight || 390}
                      srcset={srcSet || undefined}
                      sizes={srcSet ? '(max-width: 640px) 82vw, (max-width: 1024px) 42vw, 28vw' : undefined}
                      loading="lazy"
                      style={selected.imageStyle || undefined}
                    />
                  )}
                  <span style={`--badge-color: ${roundup.category?.color || 'var(--brand-primary)'}`}>{roundup.category?.label || 'Collection'}</span>
                </a>
                <div class="home-card__body">
                  <h3><a href={getRoundupUrl(roundup)}>{roundup.headline}</a></h3>
                  <p>{roundup.excerpt || 'A curated set of recipes for easier planning.'}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 3: Replace both style blocks with this shared CSS**

Use this same `<style>` in both files:

```css
.home-rail {
  padding: clamp(var(--space-12), 8vw, var(--space-20)) var(--space-5);
  background: var(--bg-elevated);
}

.home-rail--collections {
  background: var(--bg);
}

.home-rail__header {
  max-width: var(--container-max);
  margin: 0 auto var(--space-8);
}

.home-rail__eyebrow {
  margin: 0 0 var(--space-2);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-lg);
  color: var(--brand-accent);
}

.home-rail__header h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: var(--leading-tight);
  letter-spacing: 0;
  color: var(--text);
}

.home-rail__header p:not(.home-rail__eyebrow) {
  max-width: 52rem;
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
}

.home-rail__carousel {
  max-width: var(--container-max);
  margin: 0 auto;
}

.home-rail__viewport {
  overflow: hidden;
}

.home-rail__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(280px, 31%);
  gap: var(--space-5);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.home-rail__track::-webkit-scrollbar {
  display: none;
}

.home-card {
  scroll-snap-align: start;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.home-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.home-card__image {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  color: var(--text-inverse);
}

.home-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.home-card:hover .home-card__image img {
  transform: scale(1.04);
}

.home-card__image span {
  position: absolute;
  left: var(--space-3);
  bottom: var(--space-3);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: linear-gradient(rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.32)), var(--badge-color);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
}

.home-card__body {
  padding: var(--space-5);
}

.home-card__body h3 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  line-height: var(--leading-tight);
  letter-spacing: 0;
}

.home-card__body h3 a {
  color: var(--text);
  text-decoration: none;
}

.home-card__body h3 a:hover,
.home-card__body h3 a:focus-visible {
  color: var(--brand-primary);
}

.home-card__body p {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.home-card__body small {
  display: inline-flex;
  margin-top: var(--space-4);
  color: var(--text-brand);
  font-weight: var(--font-bold);
}

@media (max-width: 760px) {
  .home-rail__track {
    grid-auto-columns: minmax(260px, 82%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-card,
  .home-card__image img {
    transition: none;
  }
}
```

- [ ] **Step 4: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/site/components/home/FeaturedRecipes.astro src/site/components/home/Collections.astro
git commit -m "feat(home): redesign featured and collection rails" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Redesign Category, Latest, Author, and Newsletter Sections

**Files:**
- Modify: `src/site/components/home/CategoryBrowse.astro`
- Modify: `src/site/components/home/LatestRecipes.astro`
- Modify: `src/site/components/home/AboutAuthor.astro`
- Modify: `src/site/components/home/NewsletterBanner.astro`

- [ ] **Step 1: Add reveal attributes**

Add `data-fade-up` to each outer `<section>`:

```astro
<section class="section categories-section" data-fade-up>
```

```astro
<section class="section more-recipes-section" data-fade-up>
```

```astro
<section class="section about-author-section" data-fade-up>
```

```astro
<section class="newsletter-banner" data-fade-up>
```

- [ ] **Step 2: Add stagger to repeated items**

In `CategoryBrowse.astro`, add `style={`--fade-delay: ${index * 55}ms`}` and `data-fade-up` to category chips. The map signature becomes:

```astro
{categories.map((category: HydratedCategory, index: number) => {
```

and the chip link becomes:

```astro
<a
  href={`/categories/${category.slug}`}
  class="chip-standard category-chip"
  data-fade-up
  style={`--fade-delay: ${index * 55}ms`}
>
```

In `LatestRecipes.astro`, add `index` to the recipe map and add `data-fade-up` plus the same delay:

```astro
{recipes.map((recipe: HydratedArticle, index: number) => {
```

```astro
<a
  href={getRecipeUrl(recipe)}
  class="recipe-card-vertical"
  data-fade-up
  style={`--fade-delay: ${index * 55}ms`}
>
```

- [ ] **Step 3: Normalize outdated token aliases**

Replace these old aliases:

```css
var(--primary)
var(--primary-hover)
var(--transition)
var(--text-light)
var(--shadow)
```

with:

```css
var(--brand-primary)
var(--brand-primary-hover)
var(--transition-base)
var(--text-secondary)
var(--shadow-sm)
```

Apply this in all four modified files.

- [ ] **Step 4: Improve section surfaces**

In `CategoryBrowse.astro`, change `.categories-section` to:

```css
.categories-section {
  background: linear-gradient(180deg, var(--bg), var(--bg-alt));
  padding: clamp(var(--space-12), 8vw, var(--space-20)) 0;
}
```

In `LatestRecipes.astro`, change `.more-recipes-section` to:

```css
.more-recipes-section {
  background: var(--bg-alt);
}
```

In `AboutAuthor.astro`, change `.about-author-section` to:

```css
.about-author-section {
  background: linear-gradient(180deg, var(--brand-primary-light) 0%, var(--bg) 100%);
  padding: clamp(var(--space-12), 8vw, var(--space-20)) 0;
}
```

In `NewsletterBanner.astro`, change `.newsletter-banner` to:

```css
.newsletter-banner {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 88%, black), var(--brand-primary-hover)),
    var(--brand-primary);
  padding: clamp(var(--space-12), 7vw, var(--space-18)) 0;
}
```

- [ ] **Step 5: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/site/components/home/CategoryBrowse.astro src/site/components/home/LatestRecipes.astro src/site/components/home/AboutAuthor.astro src/site/components/home/NewsletterBanner.astro
git commit -m "feat(home): polish supporting homepage sections" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Add Motion Safety and Runtime Verification

**Files:** none required unless verification finds a defect.

- [ ] **Step 1: Static gates**

Run:

```bash
pnpm typecheck
pnpm check:boundaries
pnpm test
```

Expected:

- `pnpm typecheck`: PASS.
- `pnpm check:boundaries`: `Boundary check passed.`
- `pnpm test`: all tests pass.

- [ ] **Step 2: Dev runtime**

Run:

```bash
pnpm dev --host 127.0.0.1
```

In a second terminal, verify:

```bash
curl -s http://127.0.0.1:4321/ > scratch/homepage-p1b.html
```

Then run a script equivalent to:

```bash
node -e "const fs=require('fs');const html=fs.readFileSync('scratch/homepage-p1b.html','utf8');const checks=[['h1',(html.match(/<h1\\b/g)||[]).length===1],['jsonld',(html.match(/application\\/ld\\+json/g)||[]).length===2],['carousel',html.includes('data-home-carousel')],['fade',html.includes('data-fade-up')],['hero',html.includes('home-hero')],['featured',html.includes('home-rail--featured')]];console.log(checks.map(([k,v])=>`${k}=${v}`).join('\\n')); if(checks.some(([,v])=>!v)) process.exit(1)"
```

Expected:

```text
h1=true
jsonld=true
carousel=true
fade=true
hero=true
featured=true
```

- [ ] **Step 3: Browser/Lighthouse gate**

This step needs explicit user permission because it opens a browser and ideally uses `pnpm preview`, which runs a build.

Ask the user:

```text
Do you want me to run `pnpm preview` and Lighthouse for P1b? It will run a production build first.
```

If approved, run:

```bash
pnpm preview
```

Then run Lighthouse desktop on `/` and compare against the P1a baseline. Expected: no material regression from home `100/100/100/100`. If there is a regression, fix before continuing to P2.

- [ ] **Step 4: Commit verification notes only if a file changed**

If Task 7 required code fixes, commit them:

```bash
git add <fixed-files>
git commit -m "fix(home): preserve homepage redesign verification gates" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

If no files changed, do not create a commit.

---

## Self-Review

**Spec coverage:**

- P1b covers spec section 7 design/motion for existing sections.
- P1b covers Embla progressive enhancement for hero, featured, and collections.
- P1b keeps `<h1>` and WebSite/Organization JSON-LD from P1a intact.
- P1b does not implement P2 admin or P3 new sections/AEO; those remain separate plans.

**Placeholder scan:**

- No `TBD`, `TODO`, or unspecified files.
- Every task has exact files and commands.
- Large visual component changes are specified with concrete markup/CSS snippets.

**Type consistency:**

- Uses existing `Homepage*Section` types.
- Uses existing `HydratedArticle`, `HydratedCategory`, `Author`, `extractImage`, `getImageSrcSet`, `parseCachedRecipe`.
- Carousel script uses direct `embla-carousel` imports added in Task 1.

**Execution handoff:**

After this plan is complete, execute it with `superpowers:executing-plans` or subagent-driven development. Stop after P1b verification and write a separate P2 plan for admin wiring.
