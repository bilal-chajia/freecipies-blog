# Homepage Hero Layout and Carousel Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every Embla-selected hero slide visible and enlarge the desktop hero to the approved 1400px editorial layout.

**Architecture:** Preserve the existing Astro SSR and CSS scroll-snap fallback, then let `home-carousels.ts` mark a root only after Embla initializes successfully. `HeroSection.astro` will use deterministic positive stacking layers and a hero-local 1400px container without changing global design tokens.

**Tech Stack:** Astro 6.3.3, TypeScript 6 strict, Embla Carousel 8, CSS, Vitest 4, pnpm.

## Global Constraints

- Use `pnpm` only.
- Do not run `pnpm build` without explicit user approval.
- Do not modify `--container-max`; the 1400px width applies only to the homepage hero.
- Keep all persisted and serialized data in `snake_case`; this change adds no stored data.
- Keep image `width`, `height`, and lazy/eager loading behavior intact.
- Preserve server-rendered scroll-snap behavior when JavaScript or Embla initialization is unavailable.
- Preserve semantic articles, links, headings, tab roles, accessible button names, and reduced-motion behavior.
- Work with the existing uncommitted admin picker fix; do not stage or commit those files as part of this plan.

## File Map

- Modify `src/site/components/home/HeroSection.astro`: positive layer stack, fallback surface, 1400px desktop geometry, and enhanced/unenhanced overflow rules.
- Modify `src/site/scripts/home-carousels.ts`: apply and remove `is-carousel-enhanced` only for a live Embla instance.
- No schema, service, API, settings, database, or contract file changes.

---

### Task 1: Capture the Failing Carousel State

**Files:**
- Inspect: `src/site/components/home/HeroSection.astro:148-474`
- Inspect: `src/site/scripts/home-carousels.ts:1-127`
- No production edits in this task.

**Interfaces:**
- Consumes: homepage route `/`, `.home-hero__track`, `[data-home-carousel-next]`, and `[data-home-carousel-dot]`.
- Produces: a reproducible browser baseline showing a selected, loaded slide whose painted card is blank.

- [ ] **Step 1: Start the development server**

Run:

```bash
pnpm dev --host 127.0.0.1
```

Expected: Astro reports a local URL, normally `http://127.0.0.1:4321/`.

- [ ] **Step 2: Record the initial rendered state**

Using the Browser plugin at `1440x900`, load `/` and inspect `.home-hero__slide`, `.home-hero__media img`, `.home-hero__content`, and `.home-hero__track`.

Expected initial evidence:

```text
Selected dot: 0
Primary image naturalWidth: greater than 0
Primary content opacity: 1
Track transform: none or identity matrix
Visible result: image, overlay, and text are painted
```

- [ ] **Step 3: Reproduce the regression**

Wait for autoplay or click the unique `Next featured recipe` button until the selected dot changes. Read the selected slide image dimensions and the track transform, then capture a screenshot.

Expected failing evidence:

```text
Selected dot: non-zero
Selected image naturalWidth: greater than 0
Selected content opacity: 1
Track transform: non-identity matrix
Visible result: primary card surface is blank
```

- [ ] **Step 4: Confirm the failure is not data loading**

Check that the selected article still has a headline, link, image `currentSrc`, and non-zero card rectangle.

Expected: all values exist; the defect is paint/stacking, not `resolveHomeData` or image resolution.

---

### Task 2: Make Hero Layer Painting Deterministic

**Files:**
- Modify: `src/site/components/home/HeroSection.astro:170-279`

**Interfaces:**
- Consumes: existing `.home-hero__card`, `::after`, `.home-hero__media`, and `.home-hero__content` markup.
- Produces: a local stack with media at layer 0, overlay at 1, content at 2, and controls at 3.

- [ ] **Step 1: Use the Task 1 browser reproduction as the failing test**

Repeat the non-zero slide selection without editing production code.

Expected: selected image and content exist in the DOM, while the primary card remains visually blank.

- [ ] **Step 2: Implement the positive layer stack and fallback surface**

Replace the relevant declarations in `HeroSection.astro` with:

```css
.home-hero__card {
  position: relative;
  display: grid;
  min-height: clamp(29rem, 58vw, 40rem);
  overflow: hidden;
  background: color-mix(in srgb, var(--brand-primary) 55%, black);
  color: var(--text-inverse);
  text-decoration: none;
  isolation: isolate;
}

.home-hero__card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.28) 58%, rgba(0, 0, 0, 0.05)),
    linear-gradient(0deg, rgba(0, 0, 0, 0.55), transparent 56%);
}

.home-hero__media {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.home-hero__content {
  position: relative;
  z-index: 2;
  align-self: end;
  max-width: 44rem;
  padding: clamp(var(--space-6), 5vw, var(--space-12));
}
```

Keep `.home-hero__controls { z-index: 3; }` unchanged.

- [ ] **Step 3: Verify every slide paints after movement**

Reload `/`, select every dot, then use previous and next once each.

Expected: every selected slide paints its image or dark fallback, overlay, and readable content. No selected state is blank.

- [ ] **Step 4: Verify image-loading fallback**

Use browser request blocking or inspect a recipe without a usable image.

Expected: dark primary surface and readable recipe text; no white empty card.

- [ ] **Step 5: Run static checks**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: TypeScript exits 0; all Vitest files pass.

- [ ] **Step 6: Commit the stacking fix**

```bash
git add src/site/components/home/HeroSection.astro
git commit -m "fix(home): keep hero carousel layers visible"
```

Expected: the commit contains only `HeroSection.astro`.

---

### Task 3: Separate Scroll-Snap Fallback from Embla Enhancement

**Files:**
- Modify: `src/site/scripts/home-carousels.ts:34-109`
- Modify: `src/site/components/home/HeroSection.astro:178-189`

**Interfaces:**
- Consumes: `HomeCarouselNode`, `initCarousel(root)`, and Embla's existing `destroy()` lifecycle.
- Produces: root class `is-carousel-enhanced`, present only while a successfully initialized Embla instance owns movement.

- [ ] **Step 1: Capture the unenhanced fallback behavior**

Disable JavaScript in the browser and reload `/`.

Expected: `.home-hero__track` remains horizontally scrollable with CSS scroll snapping and all slide markup remains present.

- [ ] **Step 2: Add enhancement lifecycle state**

In `home-carousels.ts`, add the constant and lifecycle calls:

```ts
const ENHANCED_CLASS = 'is-carousel-enhanced';
```

Immediately after `EmblaCarousel(...)` returns successfully:

```ts
root.classList.add(ENHANCED_CLASS);
```

In the returned `destroy` function, before `embla.destroy()`:

```ts
root.classList.remove(ENHANCED_CLASS);
```

The full teardown remains:

```ts
destroy: () => {
  prevButton?.removeEventListener('click', selectPrev);
  nextButton?.removeEventListener('click', selectNext);
  root.classList.remove(ENHANCED_CLASS);
  embla.destroy();
},
```

- [ ] **Step 3: Add enhanced-only ownership CSS**

Keep the current unenhanced track declarations, then add:

```css
.home-hero__showcase.is-carousel-enhanced .home-hero__track {
  overflow-x: visible;
  scroll-snap-type: none;
}
```

Expected: without JS the track remains scroll-snap; with Embla the nested native scroll surface is disabled.

- [ ] **Step 4: Verify enhancement and cleanup in the browser**

With JavaScript enabled, reload and inspect `.home-hero__showcase`.

Expected:

```text
Root class: is-carousel-enhanced present
Track overflow-x: visible
Track scroll-snap-type: none
Arrow/dot navigation: functional
```

Navigate away or trigger pagehide and confirm no new carousel error is logged.

- [ ] **Step 5: Recheck the no-JavaScript fallback**

Disable JavaScript and reload again.

Expected:

```text
Root class: is-carousel-enhanced absent
Track overflow-x: auto
Track scroll-snap-type: x mandatory
Slides: horizontally scrollable
```

- [ ] **Step 6: Run checks**

```bash
pnpm typecheck
pnpm test
pnpm check:boundaries
```

Expected: all three commands exit 0.

- [ ] **Step 7: Commit enhancement ownership**

```bash
git add src/site/scripts/home-carousels.ts src/site/components/home/HeroSection.astro
git commit -m "fix(home): isolate Embla carousel ownership"
```

---

### Task 4: Apply the Approved 1400px Editorial Layout

**Files:**
- Modify: `src/site/components/home/HeroSection.astro:149-163,196-204,337-464`

**Interfaces:**
- Consumes: existing site spacing and typography tokens plus the approved Option A geometry.
- Produces: hero-only 1400px desktop width, approximately 930px primary column and 430px supporting column, with existing tablet/mobile stacking.

- [ ] **Step 1: Record the current desktop geometry as the failing layout assertion**

At `1440x900`, read the rectangles for `.home-hero__inner`, `.home-hero__showcase`, and `.home-hero__side`.

Expected before the change:

```text
Inner width: 1200px
Showcase width: approximately 790px
Side width: approximately 382px
```

- [ ] **Step 2: Implement the hero-only width and desktop columns**

Update the desktop rules:

```css
.home-hero__inner {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 2.15fr) minmax(360px, 1fr);
  gap: clamp(var(--space-4), 2.5vw, var(--space-7));
  align-items: stretch;
}

.home-hero__card {
  min-height: clamp(34rem, 48vw, 42.5rem);
}
```

Do not edit `src/shared/design-tokens.css`.

- [ ] **Step 3: Increase supporting-card readability without changing the component model**

Update the supporting column rules:

```css
.home-hero__mini {
  grid-template-columns: minmax(10rem, 48%) minmax(0, 1fr);
  min-height: 13rem;
}

.home-hero__mini > div:last-child {
  padding: clamp(var(--space-4), 2vw, var(--space-6));
}

.home-hero__mini h3 {
  font-size: var(--text-xl);
}
```

Keep letter spacing at `0` through the inherited site typography rules.

- [ ] **Step 4: Verify desktop geometry and content fit**

At `1440x900`, confirm:

```text
Hero width: viewport width minus section padding, capped at 1400px
Primary column: dominant and larger than before
Supporting column: at least 360px
Both cards: equal total column height
Long supporting title: wrapped, not clipped or overlapping
Horizontal overflow: false
```

- [ ] **Step 5: Verify tablet layout**

At `768x900`, confirm the existing `max-width: 900px` rules produce one primary row and two supporting cards side by side.

Expected: no horizontal overflow, overlap, or clipped title.

- [ ] **Step 6: Verify mobile layout**

At `390x844`, confirm the existing `max-width: 640px` rules produce one column.

Expected: controls remain inside the primary card, the title does not collide with controls, supporting cards stack, and horizontal overflow is false.

- [ ] **Step 7: Commit the approved layout**

```bash
git add src/site/components/home/HeroSection.astro
git commit -m "feat(home): enlarge editorial hero layout"
```

---

### Task 5: Complete Interaction and Regression Verification

**Files:**
- Verify: `src/site/components/home/HeroSection.astro`
- Verify: `src/site/scripts/home-carousels.ts`
- Verify: existing unrelated admin modifications remain unstaged.

**Interfaces:**
- Consumes: completed stacking, enhancement lifecycle, and approved layout tasks.
- Produces: verified homepage hero ready for review.

- [ ] **Step 1: Run the complete repository checks**

```bash
pnpm typecheck
pnpm test
pnpm check:boundaries
git diff --check
```

Expected: TypeScript passes, all Vitest tests pass, boundaries pass, and no whitespace errors are reported.

- [ ] **Step 2: Verify page identity and initial rendering**

Open `/` in the Browser plugin and confirm the expected URL/title, meaningful DOM, no framework overlay, and a visible first hero slide.

- [ ] **Step 3: Exercise every carousel control**

At `1440x900`:

1. Click next and verify the selected dot and visible recipe change.
2. Click previous and verify the original recipe returns.
3. Click each dot and verify its matching headline and image/fallback are painted.
4. Wait for one autoplay interval and verify the slide advances.
5. Hover the hero and verify autoplay pauses.

Expected: no blank selected slide and no relevant console error.

- [ ] **Step 4: Repeat responsive visual checks**

Capture browser evidence at:

```text
Desktop: 1440x900
Tablet: 768x900
Mobile: 390x844
```

Expected: approved composition on desktop, defined stacking on tablet/mobile, no overlap, clipping, or horizontal overflow.

- [ ] **Step 5: Review the final diff and commit scope**

```bash
git status --short
git diff HEAD~3 -- src/site/components/home/HeroSection.astro src/site/scripts/home-carousels.ts
```

Expected: hero work touches only the two public-site files. The pre-existing admin picker files remain modified but outside all hero commits.

- [ ] **Step 6: Report verification evidence**

Report the root cause, user-visible changes, exact commands and counts, Browser viewports, interactions exercised, and any residual risk. Do not claim `pnpm build` passed because it is intentionally excluded without explicit approval.
