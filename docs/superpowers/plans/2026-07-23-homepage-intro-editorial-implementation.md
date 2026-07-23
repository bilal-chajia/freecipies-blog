# Homepage Intro Editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the visible homepage `h1` as a compact editorial lead-in aligned with the 1400px hero while preserving its SEO semantics and tagline source.

**Architecture:** The existing intro markup in `src/pages/index.astro` remains the single semantic source of the homepage heading. Only its scoped CSS changes: desktop uses the same maximum width and left alignment as the hero; the existing small-screen rule preserves page-padding alignment and natural wrapping.

**Tech Stack:** Astro 6, scoped CSS, existing site design tokens, Vitest, TypeScript.

## Global Constraints

- Preserve exactly one homepage `h1` with `{identity.tagline || identity.site_name}`.
- Do not add homepage settings, change stored identity data, or modify carousel behavior.
- Use existing design tokens and bounded `clamp()` typography; do not use viewport-width font sizing alone.
- Do not run `pnpm build` unless separately authorized.

---

### Task 1: Compact and Align the Homepage Intro

**Files:**
- Modify: `src/pages/index.astro:45-48,58-88`

**Interfaces:**
- Consumes: existing `identity.tagline` and `identity.site_name` values loaded by the page.
- Produces: the same semantic `header > p + h1` markup with a scoped editorial layout.

- [ ] **Step 1: Confirm the current semantic heading before styling**

Run:

```powershell
rg -n "home-intro|<h1|identity.tagline" src/pages/index.astro
```

Expected: one `home-intro` header containing `<h1 class="home-intro__title">{identity.tagline || identity.site_name}</h1>`.

- [ ] **Step 2: Replace the centered intro styles with the approved editorial layout**

In `src/pages/index.astro`, update the scoped rules to use:

```css
.home-intro {
  max-width: 1400px;
  margin: 0 auto;
  padding: clamp(var(--space-5), 3vw, var(--space-8)) var(--space-5) var(--space-4);
  text-align: left;
}

.home-intro__eyebrow {
  margin: 0 0 var(--space-1);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--brand-primary);
}

.home-intro__title {
  max-width: 18ch;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 1.5rem + 1.8vw, 3rem);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: 0;
  color: var(--text);
}

@media (max-width: 640px) {
  .home-intro {
    padding-inline: var(--space-4);
  }

  .home-intro__title {
    max-width: 14ch;
    font-size: clamp(1.9rem, 9vw, 2.45rem);
  }
}
```

- [ ] **Step 3: Run static verification**

Run:

```powershell
pnpm typecheck
pnpm check:boundaries
pnpm test
```

Expected: TypeScript exits 0, boundary check reports `Boundary check passed.`, and all Vitest tests pass.

- [ ] **Step 4: Perform browser verification with permission**

Open the local homepage only after explicit user permission. Verify desktop, tablet, and mobile:

- the intro starts at the same left edge as the hero container;
- the `h1` remains readable and is not clipped;
- the oversized empty region above Stories is removed;
- no horizontal overflow or overlap occurs.

- [ ] **Step 5: Commit the implementation**

```powershell
git add src/pages/index.astro
git commit -m "refine(home): align editorial intro with hero"
```

Expected: the commit includes only the homepage intro style change.

## Self-Review

- Spec coverage: Task 1 preserves the `h1` and tagline source, aligns the desktop intro to 1400px, reduces vertical spacing, uses token-based bounded typography, and defines small-screen behavior.
- Placeholder scan: no placeholders or deferred implementation steps remain.
- Type consistency: no new types, APIs, data contracts, or settings are introduced.
