# Homepage Intro Editorial Design

## Context

The homepage renders a visible `h1` above its settings-driven sections. It is intentionally retained because it exposes the site tagline as the page's primary semantic heading for search engines and assistive technologies. The current centered treatment has excessive vertical whitespace and does not align with the editorial hero that follows it.

## Goal

Restyle the homepage intro as a compact editorial lead-in that belongs visually to the hero while preserving the existing `h1`, tagline data source, and SEO semantics.

## Approved Design

### Desktop

- The intro uses the same 1400px maximum width and horizontal alignment as the homepage hero.
- Content aligns to the left edge of the primary hero column rather than centering in a separate band.
- The `Welcome` eyebrow remains present but becomes a small, restrained brand label.
- The `h1` keeps the existing tagline text and semantic level, with a readable editorial scale that does not dominate the first viewport.
- Vertical padding is compact, creating a clear transition from the site header to the hero without a large empty field.
- The intro remains a full-width page band, not a card, and uses existing background and design tokens only.

### Responsive Behavior

- The intro aligns with the page padding at tablet widths.
- On mobile, text remains left-aligned and wraps naturally without clipping or horizontal overflow.
- The `h1` uses bounded `clamp()` typography; it must not use viewport-width font sizing alone.

## Non-Goals

- Do not remove or demote the `h1`.
- Do not add a new homepage setting or change the stored identity/tagline content.
- Do not change hero recipe carousel layout, data loading, or navigation.
- Do not redesign the site header or Stories bar.

## Verification

- The document contains exactly one homepage `h1` whose text remains `identity.tagline || identity.site_name`.
- Desktop rendering aligns the intro content with the hero's 1400px container and has no oversized empty vertical region.
- Tablet and mobile rendering have no horizontal overflow, overlap, or clipped text.
- Run TypeScript, Vitest, and the architecture boundary check. Do not run `pnpm build` unless separately authorized.
