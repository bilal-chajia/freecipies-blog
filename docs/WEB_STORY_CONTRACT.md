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
