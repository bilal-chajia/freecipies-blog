# Rule: Modern Responsive Design

Always prioritize modern CSS techniques for responsiveness to ensure components are robust, reusable, and performant across all viewports (Mobile, Tablet, Desktop).

## Core Principles

### 1. Container Queries First
- Use **CSS Container Queries** (`container-type`, `@container`) for component internals. 
- Components should adapt to their **parent container's width** rather than the global viewport width whenever possible.
- This makes components truly reusable in different layout contexts (e.g., a card in a 3-column grid vs. a card in a full-width section).

### 2. Intrinsic Web Design
- Favor **fluid layouts** and **intrinsic sizing** over fixed widths and excessive breakpoints.
- Use modern functions like `clamp()`, `min()`, `max()`, and CSS Grid `minmax()`.
- Example: `font-size: clamp(1rem, 2.5vw, 1.5rem);` ensures typography scales smoothly without needing multiple media queries.

### 3. Modern Layout Tools
- Use **CSS Grid** for complex 2D layouts.
- Use **Flexbox** for 1D layouts and alignment.
- Use `gap` (even for Flexbox) instead of margins for spacing between elements.

### 4. Logical Properties
- Use logical properties (`margin-inline`, `padding-block`, `inset-inline-start`, etc.) instead of physical properties (`margin-left`, `padding-top`).
- This prepares the codebase for better localization and follows modern standards.

### 5. Mobile-First, but Viewport-Aware
- Start with mobile styles and layer progressively.
- Use `@media` queries only for major structural changes that Container Queries cannot handle.
- Avoid "pixel-pushing" for specific device widths. Use broad ranges (Mobile, Tablet, Desktop).

## Implementation Checklist
- [ ] component has `container-type: inline-size` if it contains responsive elements?
- [ ] Are sizes fluid using `clamp()` or percentages?
- [ ] Are `gap` and `flex-wrap` used to handle overflow naturally?
- [ ] Is horizontal scrolling used for long single-line elements on small screens?
