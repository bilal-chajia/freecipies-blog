# Design-Review Fixes (High + Med) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the High + Medium findings from `reports/design-review.md` — restore dead animations, define a missing token, single-source the radius scale, complete admin dark mode, close three a11y gaps, and de-duplicate/scope two CSS rules.

**Architecture:** Surgical CSS/state changes on two surfaces (`src/admin`, `src/site`). One genuinely unit-testable change (the `useUIStore` persist config, TDD'd); everything else is CSS/JSX verified by `grep` + `pnpm dev` inspection because it is not unit-testable. No DB/JSON/API contract changes.

**Tech Stack:** Astro 6 + React 19, Tailwind v4 (`@theme` in CSS), Zustand 5 (`persist` middleware), Vitest 4 (node env), shadcn/ui.

**Branch:** `feat/design-review-fixes` (already checked out; spec already committed).

**Spec:** `docs/superpowers/specs/2026-06-13-design-review-implementation-design.md`

---

## File Structure

| Task | Files |
|------|-------|
| 1 (A) | `package.json`, `src/admin/index.css` |
| 2 (B) | `src/admin/styles/admin-theme.css` |
| 3 (C) | `src/admin/index.css` |
| 4 (D1) | `src/admin/store/useStore.ts`, `src/admin/store/__tests__/useStore.test.ts` (create) |
| 5 (D2) | `src/pages/admin/[...path].astro` |
| 6 (D3) | `src/admin/styles/admin-theme.css` |
| 7 (E1) | `src/admin/components/AdminLayout.tsx`, `src/admin/index.css` |
| 8 (E2) | `src/site/components/ui/Button.astro`, `src/site/components/ThemeToggle.astro`, `src/site/components/Header.astro`, `src/site/components/NewsletterWidget.astro` |
| 9 (E3) | `src/site/styles/global.css` |
| 10 (F1) | `src/admin/components/BlockEditor/styles/block-editor-core.css` |
| 11 (F2) | `src/admin/index.css` |

Recommended execution order matches task numbers (lowest-risk/additive first).

---

## Task 1 (A): Restore dead animation utilities — `tw-animate-css`

The shadcn overlays use `animate-in/out`, `fade-*`, `zoom-*`, `slide-from-*` across 27 files, but no animation plugin is installed → those classes generate no CSS.

**Files:**
- Modify: `package.json` (via pnpm)
- Modify: `src/admin/index.css:1-2`

- [ ] **Step 1: Install the v4 animation library**

Run: `pnpm add tw-animate-css`
Expected: `package.json` gains `"tw-animate-css"` under dependencies; lockfile updates.

- [ ] **Step 2: Import it after Tailwind in the admin entry CSS**

In `src/admin/index.css`, the file currently starts:

```css
@import "tailwindcss";
@import "../shared/design-tokens.css";
```

Change to:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "../shared/design-tokens.css";
```

- [ ] **Step 3: Verify the import is present and the package is installed**

Run: `grep -n "tw-animate-css" package.json src/admin/index.css`
Expected: one match in `package.json` (dependency) and one in `src/admin/index.css` (the `@import`).

- [ ] **Step 4: Spot-check in the running app (manual)**

Run: `pnpm dev`, open the admin, open any dialog/dropdown/tooltip.
Expected: enter/exit animation now plays (fade + zoom/slide), where before it appeared instantly. Stop the dev server when confirmed.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/admin/index.css
git commit -m "fix(admin): restore shadcn animations via tw-animate-css"
```

---

## Task 2 (B): Define the undefined `--primary-muted` token

`var(--primary-muted)` is consumed in 3 places but defined nowhere, so active highlights render with no background.

**Files:**
- Modify: `src/admin/styles/admin-theme.css:51-75` (the shadcn variable block inside `:root, [data-surface="admin"]`)

- [ ] **Step 1: Add the token next to the shadcn HSL vars**

In `src/admin/styles/admin-theme.css`, find the line:

```css
    --ring: 221 83% 53%;
    --radius: 0.5rem;
```

Insert a new line directly after `--radius: 0.5rem;`:

```css
    --ring: 221 83% 53%;
    --radius: 0.5rem;
    --primary-muted: hsl(var(--primary) / 0.08);
```

(No dark-mode duplicate needed: `--primary` is recolored in the `.dark` block, so `hsl(var(--primary) / 0.08)` adapts automatically. `0.08` matches the active sidebar style at `src/admin/index.css:124-128`.)

- [ ] **Step 2: Verify it is now defined exactly once and still consumed in 3 places**

Run: `grep -rn "\-\-primary-muted" src/admin`
Expected: 4 matches total — 1 definition in `admin-theme.css`, plus the 3 existing usages (`block-editor-tokens.css:617`, `SettingsLayout.tsx`, `HomepageLayout.tsx`).

- [ ] **Step 3: Spot-check (manual)**

Run: `pnpm dev`, open the BlockEditor structure panel (active item) and a Settings tab.
Expected: active item / active tab show a faint blue fill in both light and dark. Stop dev when confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/admin/styles/admin-theme.css
git commit -m "fix(admin): define --primary-muted token for active highlights"
```

---

## Task 3 (C): Remove the dead admin radius override

`admin/index.css` redefines `--radius-*` to tighter values, but the shared `@layer tokens` wins by cascade, so the override is dead and misleading. Deleting it is a no-op visually and makes the shared scale the single source.

**Files:**
- Modify: `src/admin/index.css:43-48`

- [ ] **Step 1: Delete the `/* Radii */` block from `@theme`**

In `src/admin/index.css`, remove these lines:

```css
  /* Radii */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

```

(Leave the `/* Typography */` block above and the `/* Shadows */` block below intact.)

- [ ] **Step 2: Verify the override is gone**

Run: `grep -n "radius-xs\|radius-sm\|radius-md\|radius-lg\|radius-xl" src/admin/index.css`
Expected: no matches (the admin `@theme` no longer redefines radii; shared tokens remain in `design-tokens.css`).

- [ ] **Step 3: Spot-check (manual)**

Run: `pnpm dev`, view a few admin cards/buttons.
Expected: corner radii unchanged from before (admin already rendered the shared scale). Stop dev when confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/admin/index.css
git commit -m "refactor(admin): drop dead radius override, use shared token scale"
```

---

## Task 4 (D1): Persist `useUIStore` (TDD)

The UI store has no `persist`, so theme resets to light on reload. Add `persist` with a fixed key + partialize. This is the one unit-testable change.

**Files:**
- Create: `src/admin/store/__tests__/useStore.test.ts`
- Modify: `src/admin/store/useStore.ts:42-51`

- [ ] **Step 1: Write the failing test**

Create `src/admin/store/__tests__/useStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { useUIStore } from '../useStore';

describe('useUIStore persistence', () => {
  it('persists under the freecipies-ui key', () => {
    expect(useUIStore.persist.getOptions().name).toBe('freecipies-ui');
  });

  it('only persists theme and sidebarOpen (not the action functions)', () => {
    const partialize = useUIStore.persist.getOptions().partialize;
    expect(partialize).toBeTypeOf('function');
    const persisted = partialize!(useUIStore.getState()) as Record<string, unknown>;
    expect(Object.keys(persisted).sort()).toEqual(['sidebarOpen', 'theme']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/admin/store/__tests__/useStore.test.ts`
Expected: FAIL — `useUIStore.persist` is `undefined` (store not wrapped in `persist`), so `.getOptions()` throws / both assertions fail.

- [ ] **Step 3: Wrap `useUIStore` in `persist`**

In `src/admin/store/useStore.ts`, replace the current `useUIStore` definition:

```ts
export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
}));
```

with the curried + `persist` form (note the `()` after `create<UIState>`):

```ts
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
    }),
    {
      name: 'freecipies-ui',
      partialize: (state) => ({ theme: state.theme, sidebarOpen: state.sidebarOpen }),
    }
  )
);
```

(`persist` is already imported at the top of the file — `import { persist } from 'zustand/middleware';` — and is already used by `useAuthStore`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/admin/store/__tests__/useStore.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/store/useStore.ts src/admin/store/__tests__/useStore.test.ts
git commit -m "feat(admin): persist UI store theme/sidebar under freecipies-ui"
```

---

## Task 5 (D2): Anti-FOUC inline theme script

The admin app is `client:only="react"` and applies `.dark` post-hydration, so a dark user gets a white flash. Add an inline script that sets `.dark` before paint, reading the same persisted blob.

**Files:**
- Modify: `src/pages/admin/[...path].astro:8-26` (the `<head>`)

- [ ] **Step 1: Add the inline script as the first child of `<head>`**

In `src/pages/admin/[...path].astro`, the `<head>` currently begins:

```astro
  <head>
    <meta charset="UTF-8" />
```

Change to:

```astro
  <head>
    <script is:inline>
      try {
        const persisted = JSON.parse(localStorage.getItem('freecipies-ui') || '{}');
        if (persisted && persisted.state && persisted.state.theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (_) {}
    </script>
    <meta charset="UTF-8" />
```

(The key `freecipies-ui` and the `{ state: { theme } }` shape match the Zustand-persist storage written in Task 4. `ThemeProvider` continues to reconcile `.dark` reactively after hydration.)

- [ ] **Step 2: Verify the script and key are present**

Run: `grep -n "freecipies-ui" src/pages/admin/[...path].astro`
Expected: one match (the inline script), using the same key as `useStore.ts`.

- [ ] **Step 3: Spot-check (manual)**

Run: `pnpm dev`, set the admin to dark, then reload.
Expected: page stays dark with no white flash on reload; `localStorage` has a `freecipies-ui` entry with `theme:"dark"`. Stop dev when confirmed.

- [ ] **Step 4: Commit**

```bash
git add "src/pages/admin/[...path].astro"
git commit -m "fix(admin): add pre-hydration dark-theme script to kill FOUC"
```

---

## Task 6 (D3): Complete dark-mode token recoloring

The admin `.dark` block doesn't recolor `--brand-primary` or the feedback tokens, so light-mode values bleed onto dark.

**Files:**
- Modify: `src/admin/styles/admin-theme.css:78-124` (the `[data-surface="admin"].dark, [data-surface="admin"] .dark` block)

- [ ] **Step 1: Add brand + feedback overrides to the admin dark block**

In `src/admin/styles/admin-theme.css`, find the start of the dark block:

```css
  [data-surface="admin"].dark,
  [data-surface="admin"] .dark {
    --bg: #020617;
```

Insert these lines immediately after the opening `{` (before `--bg: #020617;`):

```css
    /* Brand (track the dark --primary = hsl(217 91% 60%)) */
    --brand-primary: #3b82f6;
    --brand-primary-hover: #60a5fa;
    --brand-primary-light: #172554;

    /* Feedback (match the public-site dark palette) */
    --success: #34d399;
    --success-bg: #064e3b;
    --success-text: #6ee7b7;
    --warning: #fbbf24;
    --warning-bg: #451a03;
    --warning-text: #fcd34d;
    --error: #f87171;
    --error-bg: #450a0a;
    --error-text: #fca5a5;
    --info: #60a5fa;
    --info-bg: #1e3a8a;
    --info-text: #93c5fd;

```

- [ ] **Step 2: Verify the overrides are inside the dark block**

Run: `grep -n "brand-primary: #3b82f6\|success: #34d399\|error: #f87171" src/admin/styles/admin-theme.css`
Expected: 3 matches, all within the `.dark` block.

- [ ] **Step 3: Spot-check (manual)**

Run: `pnpm dev`, switch admin to dark.
Expected: primary buttons/links use the lighter dark-mode blue (matching `hsl(var(--primary))`), and success/warning/error/info chips use dark-appropriate colors (no harsh light-mode fills). Stop dev when confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/admin/styles/admin-theme.css
git commit -m "fix(admin): recolor brand + feedback tokens in dark mode"
```

---

## Task 7 (E1): Admin skip link

The admin SPA has no skip link. Add one + a focus target on `<main>`, plus an admin `.skip-link` style.

**Files:**
- Modify: `src/admin/components/AdminLayout.tsx:94-142`
- Modify: `src/admin/index.css` (append a `.skip-link` rule)

- [ ] **Step 1: Add the skip link and main focus target in AdminLayout**

In `src/admin/components/AdminLayout.tsx`, the return currently starts:

```tsx
  return (
    <SidebarProvider>
      <AppSidebar />
```

Change to:

```tsx
  return (
    <SidebarProvider>
      <a href="#admin-main" className="skip-link">Skip to content</a>
      <AppSidebar />
```

Then find the main element:

```tsx
        <main className={mainClassName}>
```

Change to:

```tsx
        <main id="admin-main" tabIndex={-1} className={mainClassName}>
```

- [ ] **Step 2: Add the `.skip-link` style to the admin CSS**

Append to the end of `src/admin/index.css`:

```css
/* ========================================
 * Skip Link (admin SPA — site stylesheet is not loaded here)
 * ======================================== */
.skip-link {
  position: absolute;
  top: -48px;
  left: 0;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: top 150ms ease;
}

.skip-link:focus {
  top: 0;
}
```

- [ ] **Step 3: Verify both edits landed**

Run: `grep -n "admin-main\|skip-link" src/admin/components/AdminLayout.tsx src/admin/index.css`
Expected: `href="#admin-main"` + `className="skip-link"` and `id="admin-main"` in the TSX; `.skip-link` + `.skip-link:focus` in the CSS.

- [ ] **Step 4: Spot-check (manual)**

Run: `pnpm dev`, load the admin and press Tab.
Expected: a "Skip to content" link appears at the top-left on first focus and jumps to the main region. Stop dev when confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/AdminLayout.tsx src/admin/index.css
git commit -m "feat(admin): add skip-to-content link for keyboard a11y"
```

---

## Task 8 (E2): Forced-colors-safe focus rings

Four site components set `outline: none` on `:focus-visible` and rely on `box-shadow`, which is not painted in forced-colors / Windows High Contrast → invisible focus. Keep a transparent outline so focus survives.

**Files:**
- Modify: `src/site/components/ui/Button.astro:62-65`
- Modify: `src/site/components/ThemeToggle.astro:45-48`
- Modify: `src/site/components/Header.astro:441-445`
- Modify: `src/site/components/NewsletterWidget.astro:128-132`

- [ ] **Step 1: Button.astro**

Replace:

```css
  .ui-btn:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
  }
```

with:

```css
  .ui-btn:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: var(--shadow-focus);
  }
```

- [ ] **Step 2: ThemeToggle.astro**

Replace:

```css
  .theme-toggle:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
  }
```

with:

```css
  .theme-toggle:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: var(--shadow-focus);
  }
```

- [ ] **Step 3: Header.astro**

Replace:

```css
  .search-input:focus-visible {
    outline: none;
    border-color: var(--brand-secondary);
    box-shadow: var(--shadow-focus);
  }
```

with:

```css
  .search-input:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    border-color: var(--brand-secondary);
    box-shadow: var(--shadow-focus);
  }
```

- [ ] **Step 4: NewsletterWidget.astro**

Replace:

```css
    .email-input:focus-visible {
        outline: none;
        border-color: var(--brand-secondary);
        box-shadow: var(--shadow-focus);
    }
```

with:

```css
    .email-input:focus-visible {
        outline: 2px solid transparent;
        outline-offset: 2px;
        border-color: var(--brand-secondary);
        box-shadow: var(--shadow-focus);
    }
```

- [ ] **Step 5: Verify no `outline: none` remains on these focus rules**

Run: `grep -rn "outline: none" src/site/components/ui/Button.astro src/site/components/ThemeToggle.astro src/site/components/Header.astro src/site/components/NewsletterWidget.astro`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add src/site/components/ui/Button.astro src/site/components/ThemeToggle.astro src/site/components/Header.astro src/site/components/NewsletterWidget.astro
git commit -m "fix(site): keep transparent outline so focus survives forced-colors"
```

---

## Task 9 (E3): Restore table semantics

The global `table { display: block }` drops native table semantics. `TableBlock.astro` already wraps its table in a `.content-table` scroll container and scopes `display: table`, so removing the global override is safe.

**Files:**
- Modify: `src/site/styles/global.css:138-143`

- [ ] **Step 1: Remove `display: block` and the now-unneeded `overflow-x` from the global table rule**

In `src/site/styles/global.css`, replace:

```css
  table {
    width: 100%;
    border-collapse: collapse;
    overflow-x: auto;
    display: block;
  }
```

with:

```css
  table {
    width: 100%;
    border-collapse: collapse;
  }
```

- [ ] **Step 2: Verify the global override is gone and TableBlock is untouched**

Run: `grep -n "display: block" src/site/styles/global.css`
Expected: the line `138-143` block no longer contains `display: block` (other unrelated `display: block` occurrences elsewhere in the file are fine).
Run: `grep -n "display: table" src/site/components/TableBlock.astro`
Expected: still present (TableBlock keeps its own `display: table` + `.content-table` scroll wrapper).

- [ ] **Step 3: Spot-check (manual)**

Run: `pnpm dev`, view an article that contains a content table on a narrow viewport.
Expected: table still scrolls horizontally (via `.content-table`) and renders as a real table. Stop dev when confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/site/styles/global.css
git commit -m "fix(site): restore native table semantics (drop global display:block)"
```

---

## Task 10 (F1): De-duplicate `.bn-form-popover`

`.bn-form-popover` is defined in both `admin/index.css` and `block-editor-core.css` with divergent values. Keep the always-loaded base in `admin/index.css`; remove the duplicated base block from `block-editor-core.css` (the later `!important` enforcement block at lines 398-411 already governs the popover's themed look).

**Files:**
- Modify: `src/admin/components/BlockEditor/styles/block-editor-core.css:292-335`

- [ ] **Step 1: Remove the duplicated base rules in block-editor-core.css**

In `src/admin/components/BlockEditor/styles/block-editor-core.css`, delete the duplicated base block that begins at `.bn-form-popover {` (around line 292) and ends after the `.bn-form-popover svg { ... }` rule (around line 335). Specifically remove these rule sets:

```css
        .bn-form-popover {
          background-color: var(--bn-colors-menu-background, hsl(var(--background)));
          border: var(--bn-border, 1px solid hsl(var(--border)));
          border-radius: var(--bn-border-radius-medium, 8px);
          box-shadow: var(--bn-shadow-medium, var(--shadow-lg));
          color: var(--bn-colors-menu-text, hsl(var(--foreground)));
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
          padding: 6px;
        }

        .bn-form-popover .bn-text-input {
          width: 300px;
          max-width: min(20rem, 75vw);
        }

        .bn-form-popover label {
          color: var(--bn-colors-menu-text, hsl(var(--muted-foreground)));
          font-size: 11px;
          margin-bottom: 2px;
        }

        .bn-form-popover input,
        .bn-form-popover textarea,
        .bn-form-popover select {
          background-color: var(--bn-colors-background, hsl(var(--background)));
          border: 1px solid var(--bn-border-color, hsl(var(--border)));
          border-radius: 6px;
          color: var(--bn-colors-menu-text, hsl(var(--foreground)));
          font-size: 12px;
          padding: 6px 36px 6px 28px;
          width: 100%;
        }

        .bn-form-popover input::placeholder,
        .bn-form-popover textarea::placeholder {
          color: var(--bn-colors-menu-text, hsl(var(--muted-foreground)));
        }

        .bn-form-popover svg {
          color: var(--bn-colors-menu-text, hsl(var(--muted-foreground)));
        }
```

Leave the rest of the file — including the `.bn-link-submit*` rules below and the `.bn-form-popover` entry in the later combined `!important` selector list (around lines 398-411) — unchanged. The base now lives solely in `src/admin/index.css:162-206`.

- [ ] **Step 2: Verify only one base definition remains**

Run: `grep -rn "\.bn-form-popover {" src/admin`
Expected: exactly one base-rule match in `src/admin/index.css` (the combined `!important` selector group in `block-editor-core.css` lists `.bn-form-popover` among other selectors and does not count as a standalone `.bn-form-popover {` base rule).

- [ ] **Step 3: Spot-check (manual)**

Run: `pnpm dev`, open the editor link/image popover.
Expected: popover looks the same as before (single consistent definition), inputs/labels styled correctly. Stop dev when confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/admin/components/BlockEditor/styles/block-editor-core.css
git commit -m "refactor(editor): de-duplicate .bn-form-popover base styles"
```

---

## Task 11 (F2): Scope the mobile grid override (opt-out)

The blanket `@media (max-width:640px){ .grid-cols-2/3/4 { 1fr !important } }` forces every grid (used in 53 files) to one column. Keep current behavior but add an opt-out hook via `:not(.grid-no-stack)`.

**Files:**
- Modify: `src/admin/index.css:413-420`

- [ ] **Step 1: Add the `:not(.grid-no-stack)` escape hatch**

In `src/admin/index.css`, replace:

```css
/* Form improvements on mobile */
@media (max-width: 640px) {
  /* Stack form grids */
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: 1fr !important;
  }
```

with:

```css
/* Form improvements on mobile */
@media (max-width: 640px) {
  /* Stack form grids by default; add `grid-no-stack` to opt a grid out. */
  .grid-cols-2:not(.grid-no-stack),
  .grid-cols-3:not(.grid-no-stack),
  .grid-cols-4:not(.grid-no-stack) {
    grid-template-columns: 1fr !important;
  }
```

(Leave the `input, select, textarea { font-size: 16px }` rule that follows inside the same media query unchanged.)

- [ ] **Step 2: Verify the opt-out selector is in place**

Run: `grep -n "grid-no-stack" src/admin/index.css`
Expected: 3 matches (one per `grid-cols-*` selector).

- [ ] **Step 3: Spot-check (manual)**

Run: `pnpm dev`, view an admin form on a narrow viewport.
Expected: grids still collapse to one column (unchanged behavior); adding `grid-no-stack` to a grid would keep it multi-column. Stop dev when confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/admin/index.css
git commit -m "refactor(admin): make mobile grid-stacking opt-out via grid-no-stack"
```

---

## Final Verification

- [ ] **Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, including the new `useStore.test.ts` (2 tests). No prior tests regress.

- [ ] **Run module boundary checks**

Run: `pnpm check:boundaries`
Expected: passes (no new cross-boundary imports introduced).

- [ ] **Confirm no contract files were touched**

Run: `git diff --name-only main...HEAD`
Expected: only the files listed in the File Structure table (plus `package.json`/`pnpm-lock.yaml` and the test). No files under `docs/` contracts, `db/`, or `src/server` API handlers.

---

## Self-Review (completed during planning)

- **Spec coverage:** A→Task 1, B→Task 2, C→Task 3, D(6.1/6.2/6.3/6.4)→Tasks 4/5/6, E(5.1/5.2/5.3)→Tasks 7/8/9, F(8.1/7.1)→Tasks 10/11. All in-scope findings have a task. 7.1 approach updated to opt-out (was opt-in) per the 53-file discovery. 5.3 simplified (TableBlock already wraps; only the global rule changes).
- **Placeholder scan:** none — every code step shows exact before/after.
- **Type/key consistency:** the persist key `freecipies-ui` is identical in `useStore.ts` (Task 4), the inline script (Task 5), and the test (Task 4). The `.skip-link` class + `#admin-main` id match between AdminLayout (Task 7) and the CSS (Task 7).
