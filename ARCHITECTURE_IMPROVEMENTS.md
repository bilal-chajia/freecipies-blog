# Freecipies Blog Platform - Architecture Roadmap

## Current State Assessment
The platform has successfully transitioned to a **Hybrid Astro/React** architecture with **Cloudflare D1** storage. Core infrastructure (Auth, Logging, Error Handling, R2 Uploads) is implemented and production-ready.

## Strategic Roadmap

### Phase 1: Stability & Quality (Immediate Focus)

#### 1. End-To-End Testing
**Status**: 🔴 Missing
**Impact**: High risk of regression during deployments.
*   **Action**: Implement **Playwright** for critical path testing.
    *   *Tests*: Admin Login, Recipe Creation Flow, Image Editor functionality.
    *   *CI Integration*: Run on functionality branches.

#### 2. Specialized Database Search
**Status**: 🟡 Basic SQL `LIKE` queries
**Impact**: Poor search relevancy for users.
*   **Action**: Implement full-text search.
    *   *Option A*: Cloudflare D1 Full-Text Search (if available/stable).
    *   *Option B*: **Orama** (client-side fuzzy search) for the Admin Panel.
    *   *Option C*: External service (Algolia/MeiliSearch) for public site.

#### 3. Database Backups & Point-in-Time Recovery
**Status**: 🔴 Reliance on Cloudflare Beta features
**Impact**: Data loss risk.
*   **Action**: Automate D1 backups.
    *   Create a Scheduled Worker (Cron Trigger) to dump D1 tables to an R2 bucket nightly.

---

### Phase 2: User Experience & Performance

#### 4. Server-Side Image Optimization Pipeline
**Status**: 🟡 Client-side only (Canvas/WebP)
**Impact**: Good for Admin, but dependent on client device power.
*   **Action**: Implement **Cloudflare Workers Image Resizing**.
    *   Allow dynamic resizing URL params (e.g., `/cdn-cgi/image/width=800/...`) for defining responsive `srcset` automatically.

#### 5. Advanced Analytics Dashboard
**Status**: 🟡 Basic "View Count"
**Impact**: Limited insight into content performance.
*   **Action**: Expand `api/stats` endpoints.
    *   Track: Time on page, Scroll depth, "Pin It" clicks.
    *   Visualize: Create charts in Admin Dashboard using `recharts`.

#### 6. Internationalization (i18n)
**Status**: ⚪ Not Started
**Impact**: market limitation.
*   **Action**: Prepare D1 schema for multilingual content.
    *   Add `locale` column to `articles`.
    *   Implement Astro i18n routing (`/es/recetas/...`).

---

### Phase 3: Developer Experience

#### 7. Strict Schemas Sharing (Monorepo-style)
**Status**: 🟡 Partial
**Impact**: Duplication between frontend input validation and backend DB validation.
*   **Action**: Unify Zod schemas.
    *   Create `src/shared/schemas.ts`.
    *   Import same schemas in React Hook Form (Admin) and API Route validation (Backend).

#### 8. Storybook / Component Documentation
**Status**: ⚪ Not Started
**Impact**: Slower UI development.
*   **Action**: Set up Storybook for the React Admin components (`ImageEditor`, `PinCreator`) to develop them in isolation.

---

## Technical Debt to Address

| Priority | Item | Description |
| :--- | :--- | :--- |
| High | **Unit Tests** | Add Vitest for `src/lib/` utilities (especially parsers). |
| Medium | **Bundle Analysis** | Analyze Admin bundle size; consider lazy loading heavy libs like `fabric.js` or `react-easy-crop`. |
| Low | **Sitemap Automation** | Ensure sitemap.xml auto-updates via Cron or Hook on article publish. |
