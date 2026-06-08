---
version: alpha
name: Freecipies Blog
description: Food blog SaaS platform with a warm, editorial aesthetic for the public site and a clean, professional admin dashboard.
colors:
  # === Public Site (Warm Food Blog) ===
  # -- Brand --
  brand-primary: "#e74c3c"
  brand-primary-hover: "#c0392b"
  brand-primary-light: "#fdf2f2"
  brand-secondary: "#ff6b35"
  brand-secondary-hover: "#e55a2b"
  brand-accent: "#f7931e"
  brand-accent-hover: "#e8850f"
  # -- Surfaces (Light) --
  bg: "#fffdf9"
  bg-alt: "#fff7ed"
  bg-elevated: "#ffffff"
  bg-inset: "#f7efe5"
  bg-hover: "#fff1e5"
  bg-active: "#ffe4cc"
  bg-overlay: "rgba(26, 16, 10, 0.52)"
  bg-glass: "rgba(255, 255, 255, 0.7)"
  # -- Text (Light) --
  text: "#221713"
  text-secondary: "#5c4a42"
  text-tertiary: "#806a5f"
  text-inverse: "#ffffff"
  # -- Borders (Light) --
  border: "#eadfd4"
  border-strong: "#d8c7b7"
  border-subtle: "#f4ebe2"
  # -- Surfaces (Dark) --
  dark-bg: "#0f0f0f"
  dark-bg-alt: "#1a1a1a"
  dark-bg-elevated: "#1e1e1e"
  dark-bg-inset: "#0a0a0a"
  dark-text: "#f7f2ec"
  dark-text-secondary: "#c8bdb3"
  dark-text-tertiary: "#9d8f84"
  dark-border: "#333333"
  # -- Accents --
  accent-sage: "#6b8f71"
  accent-sage-light: "#e8f5e9"
  accent-sage-text: "#1b4332"
  # === Admin Dashboard (Neutral CMS) ===
  # -- Brand --
  admin-brand-primary: "#2563eb"
  admin-brand-primary-hover: "#1d4ed8"
  admin-brand-primary-light: "#eff6ff"
  admin-brand-secondary: "#0f172a"
  admin-brand-secondary-hover: "#020617"
  admin-brand-accent: "#14b8a6"
  admin-brand-accent-hover: "#0f9488"
  # -- Surfaces (Light) --
  admin-bg: "#f8fafc"
  admin-bg-alt: "#f1f5f9"
  admin-bg-elevated: "#ffffff"
  admin-bg-inset: "#e2e8f0"
  # -- Text (Light) --
  admin-text: "#0f172a"
  admin-text-secondary: "#334155"
  admin-text-tertiary: "#64748b"
  # -- Borders (Light) --
  admin-border: "#e2e8f0"
  admin-border-strong: "#cbd5e1"
  # -- Surfaces (Dark) --
  admin-dark-bg: "#020617"
  admin-dark-bg-alt: "#0f172a"
  admin-dark-bg-elevated: "#111827"
  # Neutral Scale
  neutral-950: "#0a0a0a"
  neutral-900: "#1a1a1a"
  neutral-800: "#2a2a2a"
  neutral-700: "#404040"
  neutral-600: "#555555"
  neutral-500: "#777777"
  neutral-400: "#999999"
  neutral-300: "#b0b0b0"
  neutral-200: "#d0d0d0"
  neutral-100: "#e8e8e8"
  neutral-50: "#f5f5f5"
  neutral-25: "#fafafa"
  # -- States --
  success: "#10b981"
  success-bg: "#ecfdf5"
  success-text: "#065f46"
  warning: "#f59e0b"
  warning-bg: "#fffbeb"
  warning-text: "#92400e"
  error: "#ef4444"
  error-bg: "#fef2f2"
  error-text: "#991b1b"
  info: "#3b82f6"
  info-bg: "#eff6ff"
  info-text: "#1e40af"
typography:
  h1:
    fontFamily: "Playfair Display"
    fontSize: "clamp(1.75rem, 1.5rem + 1.5vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Playfair Display"
    fontSize: "clamp(1.375rem, 1.15rem + 1.1vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.375
  h3:
    fontFamily: "Playfair Display"
    fontSize: "clamp(1.125rem, 1rem + 0.6vw, 1.5rem)"
    fontWeight: 600
    lineHeight: 1.375
  h4:
    fontFamily: "Playfair Display"
    fontSize: "clamp(1rem, 0.95rem + 0.3vw, 1.25rem)"
    fontWeight: 600
    lineHeight: 1.375
  body-md:
    fontFamily: "Source Sans 3"
    fontSize: "clamp(14px, 0.875rem + 0.2vw, 16px)"
    lineHeight: 1.5
    fontWeight: 400
  label-caps:
    fontFamily: "Source Sans 3"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.5px"
  admin-h1:
    fontFamily: Inter
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  space-0: 0
  space-px: 1px
  space-1: 0.25rem
  space-2: 0.5rem
  space-3: 0.75rem
  space-4: 1rem
  space-5: 1.25rem
  space-6: 1.5rem
  space-7: 1.75rem
  space-8: 2rem
  space-9: 2.25rem
  space-10: 2.5rem
  space-12: 3rem
  space-14: 3.5rem
  space-16: 4rem
  space-20: 5rem
  space-24: 6rem
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-primary-hover}"
    textColor: "{colors.text-inverse}"
  button-secondary:
    backgroundColor: "{colors.brand-secondary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
  card-compact:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  card-featured:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
  badge-default:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  badge-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  badge-secondary:
    backgroundColor: "{colors.brand-secondary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  badge-diet:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  badge-eco:
    backgroundColor: "{colors.accent-sage-light}"
    textColor: "{colors.accent-sage-text}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  badge-time:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info-text}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  badge-difficulty:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-text}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.75rem"
  admin-button-primary:
    backgroundColor: "{colors.admin-brand-primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  admin-card:
    backgroundColor: "{colors.admin-bg-elevated}"
    textColor: "{colors.admin-text}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

## Overview

Warm editorial meets functional minimalism. Freecipies Blog marries an engaging, food-focused public site aesthetic with a highly efficient, neutral admin dashboard. The design ensures readability, accessibility, and high performance.

Every design decision prioritizes WCAG 2.1 AA compliance, robust contrast ratios, and distinct semantic states, ensuring content remains king without sacrificing accessibility.

## Colors

The system splits into two distinct themes to separate the public identity from internal tooling.

- **Brand Primary (#e74c3c):** Warm coral — the emotional core used for primary CTAs and brand moments.
- **Brand Secondary (#ff6b35):** Spicy orange — supports gradients and secondary highlights.
- **Accent Sage (#6b8f71):** Organic green — specifically reserved for "eco", "healthy", and "bio" semantic coding, breaking the warm-only palette.
- **Public Surfaces:** Built on warm off-whites (`#fffdf9`) with deep coffee brown text (`#221713`) to drastically reduce eye strain compared to pure white/black.
- **Admin Theme:** Professional blues (`#2563eb`) against strict neutral slates. Dark mode admin surfaces utilize deep slates (`#020617`) engineered for extended use.
- **System States:** Error (`#ef4444`) is strictly segregated from brand coral (`#e74c3c`) to maintain clear semantic warnings.

## Typography

Typography establishes the editorial gravitas of the platform.

- **Playfair Display:** Used for all `h1` through `h4` headings. An elegant serif with tight line-heights, ensuring recipes and articles feel like a contemporary magazine. Sizes fluidly via `clamp()`.
- **Source Sans 3:** The workhorse for body copy and general UI. Highly legible sans-serif for long-form reading and navigation.
- **Inter:** The structural choice for the Admin UI (`admin-h1`, tables, etc.), optimized for dense data and dashboards.

*Note: Critical Playfair Display weights (600/700) must be preloaded in the head to prevent Flash of Unstyled Text (FOUT).*

## Layout

- **Container:** Maximum width of 1200px, centered.
- **Spacing:** Utilizes a standard `space-*` scale based on `rem` values. Component padding typically ranges from `space-4` (1rem) for compact elements to `space-6` (1.5rem) for main content blocks.
- **Grids:** The public site leans on an asymmetric layout (e.g., `1fr 360px` for article and sidebar) on desktop, collapsing to a single column on mobile screens.

## Elevation & Depth

Shadows define surface hierarchy and interaction states.

- **Color-bleed Shadows:** Shadows never use pure black. The public site uses warm shadow tints (`rgba(66, 38, 18, x)`), while the admin uses slate tints.
- **Admin Dark Mode Optimization:** Shadows on dark admin surfaces (`dark-bg-elevated`) use a `slate-900` RGB base (`2 6 23`) with carefully calibrated opacity (0.30 to 0.45) to convey true depth against dark backgrounds.
- **Glass Effects:** Overlays and sticky headers use `backdrop-filter: blur(16px)` colored dynamically via `color-mix(in srgb, var(--bg) 88%, transparent)`.

## Shapes

Shapes scale from crisp to fully rounded based on component semantics.

- **Scale:** `xs` (4px) to `full` (9999px).
- **Cards:** Standard cards use an `xl` (24px) radius to feel welcoming, while compact and admin cards use a tighter `lg` (16px) radius.
- **Buttons & Inputs:** Interactive elements standardize around `md` (12px) to balance approachability and precision.

## Components

Components are declarative mappings of tokens to UI patterns. Beyond basic buttons and cards, Freecipies Blog features specialized editorial components:

- **Button Primary:** Coral background with white text. The hover variant (`button-primary-hover`) includes an inset shadow (`inset 0 0 0 1px rgba(0, 0, 0, 0.15)`) to artificially boost perceived contrast to a safe 4.7:1 (WCAG AA).
- **Cards:** Built with `bg-elevated`, rounded corners, and a subtle border. They respond to interaction with a slight lift (`translateY(-4px)`).
- **Badges:** Specialized variants handle semantic states. The `eco` badge specifically leverages the sage green palette to indicate organic/healthy properties distinct from the standard success state.
- **Recipe Card:** The flagship component of the public site. It uses a premium, full-width layout with floating action buttons, a visual stats grid, and icon-based navigation.
- **Cook Mode (Overlay):** A distraction-free, full-screen immersive UI designed for use in the kitchen. It utilizes a darkened, high-contrast overlay to keep focus on the current step and prevents the screen from sleeping.
- **Nutrition Facts:** Employs a modern, health-app inspired grid layout with circular progress rings and macro-nutrient progress bars, moving away from the outdated FDA text-heavy label.

## Do's and Don'ts

- **Do** use exact token references (e.g., `{colors.brand-primary}`) instead of hard-coded hex values.
- **Do** centralize all SVG iconography through the unified `<Icon />` component rather than inlining SVGs directly in markup. This keeps the DOM light and scalable.
- **Do** use the `eco` badge variant for organic/sustainable content to keep `success` reserved for system validations.
- **Do** honor user preferences via `@media (prefers-reduced-motion)` and `@media (prefers-contrast: high)`.
- **Don't** use pure black (`#000000`). The darkest permitted color is `#0a0a0a` (public) or `#020617` (admin).
- **Don't** inline complex UI logic or data formatting (like time or ingredient scaling) inside rendering components. Delegate to centralized utilities (e.g., `src/shared/utils/recipe-formatting.ts`).
- **Don't** nest component variants in the YAML configuration. Variants like `button-primary-hover` should be standalone root-level keys within the `components` block.