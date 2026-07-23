# Homepage Hero Layout and Carousel Fix

## Context

The redesigned homepage hero renders one primary recipe carousel beside two supporting recipe cards. On desktop, the section is constrained by the global `--container-max` value of 1200px. The primary card receives about 790px and the supporting column about 382px.

Browser inspection confirmed a rendering regression after Embla moves away from its initial position. The selected slide still has valid text, a loaded image, and the correct dimensions, but its image, overlay, and content are not painted. The card currently places the image and overlay at negative stacking levels inside a track that Embla transforms. That transformed stacking context causes the negative layers to disappear behind the carousel surface.

The server-rendered initial state, data resolution, image URLs, image dimensions, and supporting cards are valid. The bug is isolated to carousel enhancement and CSS stacking.

## Goals

1. Keep every selected hero slide visible during arrow, dot, drag, and autoplay navigation.
2. Increase the desktop hero to the approved editorial-large composition.
3. Preserve progressive enhancement, responsive behavior, accessibility, and reduced-motion behavior.
4. Avoid changing the global container width used by other public-site sections.

## Non-Goals

- No changes to homepage settings, stored references, article data, or image contracts.
- No redesign of other homepage sections.
- No replacement of Embla Carousel.
- No changes to the global `--container-max` token.

## Approved Layout

The approved direction is **Option A: Editorial large**.

### Desktop

- Hero-only maximum width: 1400px.
- Available width remains bounded by the viewport and existing horizontal section padding.
- Primary/supporting column ratio targets approximately 930px / 430px at the maximum width, with the existing responsive gap included.
- Primary card height targets approximately 680px, using a bounded responsive clamp rather than viewport-width font scaling.
- Supporting cards split their width between a large food image and a readable text panel.
- Existing brand tokens, typography, borders, shadows, and colors remain authoritative.

### Tablet

- At 900px and below, the primary carousel occupies one full row.
- The two supporting cards remain side by side.
- The primary card uses its existing bounded tablet height behavior.

### Mobile

- At 640px and below, the primary carousel and supporting cards form one column.
- Controls remain inside the primary card without covering the title.
- Long titles wrap within their card; they never resize or overflow the layout.
- No horizontal page overflow is permitted.

## Carousel Rendering Fix

The hero card will use an explicit non-negative stacking order:

1. Card fallback background.
2. Media layer at `z-index: 0`.
3. Gradient overlay at `z-index: 1`.
4. Recipe content at `z-index: 2`.
5. Carousel controls at `z-index: 3`.

The card remains a local stacking context. This makes painting deterministic when Embla applies a transform to the track.

The server-rendered carousel remains a horizontal CSS scroll-snap list before JavaScript runs. After successful Embla initialization, the root receives an enhancement class. In that state, Embla owns horizontal movement and the track no longer exposes native overflow or scroll snapping. Destroying the instance removes the enhancement class.

If an image is absent or still loading, the primary card displays a dark token-compatible fallback rather than a white empty surface. Text remains readable in that state.

## Data Flow

No data-flow change is required:

1. Homepage settings select curated recipe references or the trending fallback.
2. `resolveHomeData` resolves live article rows in reference order.
3. `HeroSection.astro` chooses the best hero or thumbnail image variant.
4. Astro renders all slides as crawlable HTML.
5. `home-carousels.ts` progressively enhances the existing markup with Embla.

## Error Handling

- A missing image must not make recipe text invisible.
- Failure to initialize Embla leaves the server-rendered scroll-snap carousel usable.
- Enhancement state is applied only after Embla is created successfully.
- Carousel teardown restores the unenhanced CSS state.

The observed `MutationObserver` console message is not emitted by the hero implementation and is outside this targeted change. It does not correlate with the blank-slide reproduction.

## Accessibility

- Existing semantic articles, links, headings, labels, tab roles, and button names remain intact.
- Arrow and dot navigation remain keyboard operable.
- Selected-dot `aria-selected` and `tabindex` continue to follow the selected Embla snap.
- Reduced motion disables autoplay through the existing media-query check.
- Text and controls retain WCAG AA contrast over both loaded images and the fallback background.

## Verification

Automated verification will cover carousel enhancement state and cleanup where the current test structure permits it. Existing homepage data and settings tests remain unchanged.

Rendered browser verification must cover:

- Initial primary slide.
- Every next/previous transition.
- Every dot selection.
- Autoplay transition and pause behavior.
- Loaded-image and missing/loading-image states.
- Desktop 1440x900, tablet 768x900, and mobile 390x844.
- No relevant console errors, framework overlay, overlap, clipping, or horizontal overflow.
- TypeScript, Vitest, and architecture boundary checks.

`pnpm build` is not part of this work unless separately authorized.
