# Homepage P3A Search, FAQ, and AEO Design

**Date:** 2026-07-29

**Status:** Approved in conversation; awaiting written-spec review

**Parent design:** `docs/superpowers/specs/2026-06-15-homepage-config-and-redesign-design.md`

## 1. Objective

Complete the first P3 slice without reopening the P2 homepage redesign. P3A makes the
existing navbar recipe search functional, adds an editable homepage FAQ using the same
visual treatment as article FAQs, and completes homepage `ItemList` and `FAQPage` JSON-LD.

This slice is intentionally smaller than the parent design's original P3 phase. The
remaining new homepage sections are deferred to later P3 slices.

## 2. Confirmed Decisions

- The canonical recipe search URL is `/recipes?search=<term>`.
- Search remains in the navbar search modal. P3A does not add a second search field to the
  hero.
- The existing `hero.show_search` setting remains compatible with stored payloads, but
  P3A does not implement its public hero control.
- Homepage FAQ content is entered manually in the homepage admin.
- The homepage FAQ uses the same public style and interaction pattern as article FAQs.
- When enabled and non-empty, the FAQ is always rendered after every other homepage
  section, regardless of its position in a stored legacy payload.
- `FAQPage` JSON-LD is emitted only for the FAQ content actually rendered on the homepage.
- Homepage `ItemList` JSON-LD contains the visible Hero recipes followed by visible
  Featured recipes, with duplicates removed and positions recalculated.
- P3A requires no database migration and no new API endpoint.

## 3. Scope

### 3.1 P3A1 - Navbar Recipe Search

- Change the navbar search form to submit `GET /recipes` with an input named `search`.
- Read and trim `search` in `src/pages/recipes/index.astro`.
- Pass the term to the existing article service search option.
- Preserve `search` while changing category, tag, or page.
- Display a useful results context for an active search without creating a separate search
  landing page.
- Treat an empty or whitespace-only search as the normal `/recipes` listing.
- Change homepage `WebSite`/`SearchAction` JSON-LD to use
  `/recipes?search={search_term_string}`.

### 3.2 P3A2 - Homepage FAQ

- Ensure a disabled FAQ section exists when homepage settings are created from defaults or
  hydrated from an older payload that has no FAQ section.
- Replace the placeholder FAQ textarea with a structured item editor:
  - question input;
  - answer textarea;
  - add action;
  - delete action;
  - pointer and keyboard reordering.
- Keep FAQ question and answer fields as the existing snake_case-compatible serialized
  shape: `{ question, answer }`.
- Keep FAQ activation and content editing in the homepage admin.
- Make FAQ position fixed-last in the admin ordering experience and in the public renderer.
- Filter incomplete items from public output. Saving remains subject to the existing Zod
  schema, so enabled content must contain non-empty questions and answers.
- Reuse the article FAQ public component or extract a shared presentation primitive when
  required to guarantee the same appearance and behavior without copying its CSS.
- Render no FAQ markup when the section is disabled or contains no complete items.

### 3.3 P3A3 - Homepage AEO

- Extend the homepage JSON-LD builder with an `ItemList` node built from the recipes that
  are actually present in the resolved Hero and Featured view models.
- Preserve visual order: Hero recipes first, then Featured recipes.
- Deduplicate recipes by stable article identity, with route as a defensive fallback.
- Emit absolute recipe URLs, names, and one-based positions.
- Omit the `ItemList` node when there are no eligible recipes.
- Extend the JSON-LD builder with a `FAQPage` node from the complete FAQ items that are
  actually rendered.
- Omit the `FAQPage` node when the FAQ is disabled or empty.
- Serialize JSON-LD so user-entered FAQ text cannot terminate the script element.

## 4. Architecture and Data Flow

### 4.1 Search

1. The user opens the existing navbar search modal.
2. The form submits `search` to `/recipes` using a normal GET request.
3. The recipes page normalizes the term once and passes it to `getArticles`.
4. Server-rendered results, filter links, and pagination retain the normalized search term.
5. The homepage `SearchAction` advertises the same URL template.

No client-side search API or new `/search` route is introduced.

### 4.2 FAQ

1. The admin edits `HomepageFaqSection.items` through structured controls.
2. The existing homepage settings PUT endpoint validates and stores the ordered settings
   payload.
3. The homepage resolver creates a lightweight FAQ view model from complete items.
4. The dispatcher separates FAQ from the ordinary ordered section stream.
5. Ordinary sections render in their configured order; FAQ renders once at the end.
6. The same filtered FAQ items feed both visible markup and `FAQPage` JSON-LD.

The public fixed-last guarantee is defensive: even a legacy or manually altered payload
cannot place FAQ between editorial sections.

### 4.3 ItemList

1. Homepage data resolution returns the exact Hero and Featured articles used for rendering.
2. The homepage entry point derives the AEO recipe sequence from those resolved view models.
3. A pure JSON-LD builder deduplicates and maps that sequence to Schema.org `ListItem`
   entries.
4. The resulting node is emitted alongside the existing `WebSite` and `Organization` nodes.

This avoids a second data query and prevents JSON-LD from describing recipes that are not
visible on the page.

## 5. Public Interface

### 5.1 Navbar Search

- Keep the existing navbar search button and modal.
- Keep a clear search label, visible focus state, and native form submission.
- Do not add any search UI to the hero.
- On the recipes page, show the active term near the listing heading and provide a clear way
  back to the unfiltered listing.

### 5.2 Homepage FAQ

- Match the article FAQ component's typography, spacing, borders, toggle treatment, and
  open/closed states.
- Use a single constrained column rather than a card grid.
- Use semantic, keyboard-operable disclosure controls.
- Keep the section visually separate from the preceding content while remaining part of the
  homepage flow.
- Do not render placeholder copy or empty containers.

## 6. Admin Interface

- Keep FAQ in the homepage navigation with its enabled switch and section title field.
- Present FAQ items as a compact divided list, not nested cards.
- Use icon buttons with tooltips or accessible labels for reorder and delete actions.
- Support pointer and keyboard sorting using the homepage's existing `dnd-kit` patterns.
- Disable or visually exclude FAQ from ordinary section-position dragging because its public
  position is fixed-last.
- Preserve unsaved FAQ edits through the existing page-level form state and save/revert flow.

## 7. Compatibility and Failure Behavior

- Older homepage payloads without FAQ receive the disabled FAQ default without losing their
  existing section order or content.
- The stored `hero.show_search` property remains accepted and round-tripped.
- A failed search query uses the recipes page's existing error handling and does not expose
  internal errors.
- Missing or unpublished recipe references cannot produce `ItemList` entries because AEO is
  derived from resolved visible articles.
- Invalid FAQ entries do not render or enter JSON-LD.
- P3A does not change newsletter behavior, analytics, database schema, or cache contracts.

## 8. Swarm Execution

Implementation uses disjoint ownership to reduce merge conflicts:

1. **Search agent**
   - Navbar form, recipes query/filter/pagination behavior, and focused tests.
2. **FAQ admin agent**
   - FAQ default hydration, structured editor, fixed-last admin ordering, and focused tests.
3. **Public/AEO agent**
   - FAQ view model and public rendering, fixed-last dispatch, `FAQPage`, `ItemList`, and
     focused tests.
4. **Primary agent**
   - Integrates patches, resolves contract interactions, reviews accessibility and security,
     runs the full verification suite, and performs browser checks after explicit permission.

Agents must not edit the user's unrelated working-tree changes in
`NutritionFacts.astro` or `TocHeader.astro`.

## 9. Test Strategy

### Unit and component-focused tests

- Homepage settings schema accepts complete FAQ items and rejects incomplete saved items.
- Older settings payloads receive one disabled FAQ section.
- FAQ item add, edit, delete, and reorder transformations preserve item data.
- Search normalization trims whitespace and preserves the term in generated URLs.
- `buildHomeJsonLd` keeps `WebSite` and `Organization` behavior unchanged.
- `ItemList` ordering, deduplication, absolute URLs, and omission when empty.
- `FAQPage` output and omission for disabled or empty FAQ.
- FAQ renderer emits nothing for no complete items.
- Homepage dispatch always places FAQ last.

### Repository verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm check:boundaries`

`pnpm build` remains excluded unless the user explicitly approves it.

### Browser verification

After explicit browser permission:

- navbar search returns filtered recipe results;
- search survives category/tag changes and pagination;
- FAQ admin save/reload round-trip works;
- FAQ remains last even after homepage section reordering;
- homepage FAQ matches article FAQ at desktop and mobile widths;
- only one FAQ section is present;
- JSON-LD contains the expected `SearchAction`, `ItemList`, and conditional `FAQPage` nodes;
- no new console errors or layout overlap.

## 10. Acceptance Criteria

- The navbar is the only homepage recipe-search entry point added or changed by P3A.
- `/recipes?search=<term>` filters published recipes server-side.
- Search filters and pagination preserve the active term.
- Homepage FAQ can be fully managed without editing JSON or free-form serialization.
- Enabled complete FAQ content renders once, after every other homepage section, using the
  article FAQ style.
- Visible FAQ content and `FAQPage` JSON-LD are identical in substance.
- Homepage `ItemList` describes visible Hero and Featured recipes in deterministic order with
  no duplicates.
- Existing P2 homepage behavior remains intact.
- Focused tests and the repository verification commands pass.

## 11. Out of Scope

- Hero search UI.
- A dedicated `/search` page.
- `seasonal_spotlight`.
- `quick_filters`.
- `social_proof`.
- `lead_magnet`.
- `social_feed`.
- Search analytics or autocomplete.
- Newsletter backend work.
