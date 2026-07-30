# Navbar Live Search Modal Design

**Date:** 2026-07-30

**Status:** Approved in conversation; awaiting written-spec review

**Parent design:** `docs/superpowers/specs/2026-07-29-homepage-p3a-search-faq-aeo-design.md`

## Objective

Upgrade the existing navbar recipe search modal into a full-viewport live-search surface.
Results update while the user types, remain inside the modal, and adapt to the available
desktop, tablet, or mobile space without a fixed visible-result limit.

## Confirmed Decisions

- Search covers published recipes only.
- Reuse `GET /api/recipes` with its existing `search` query and response contract.
- The search modal covers the entire viewport while open.
- Results are not capped at an arbitrary count such as six. The result area consumes the
  available viewport height and scrolls independently when necessary.
- Recipe cards are clickable and route to the corresponding recipe page.
- The existing `/recipes?search=<term>` page remains the complete server-rendered search
  destination, exposed through a "View all results" action for a non-empty query.

## Interface

### Modal layout

- The dialog uses `position: fixed; inset: 0` with the site background, above the sticky
  header and page content.
- A compact top bar holds the dialog title, close icon button, and search input.
- The input receives focus when the dialog opens and remains visible while results scroll.
- The results region fills all remaining vertical space and owns vertical scrolling.
- Desktop cards use a responsive grid. Tablet and mobile reduce columns automatically; no
  fixed per-breakpoint result count is introduced.

### Search states

- Empty query: show a short neutral prompt, with no request.
- Active query: wait briefly after input before requesting results; the latest query wins.
- Loading: expose an accessible loading status without removing prior stable layout.
- Results: render returned recipe cards with image, category, headline, and recipe URL.
- No results: show a clear empty state with the submitted term.
- Request failure: show a recoverable error state and retain the input.

## Data Flow

1. Opening the navbar search modal focuses its input.
2. Input changes are debounced to avoid a request per keystroke.
3. A request is made to `/api/recipes?search=<encoded-query>&limit=100`.
4. An `AbortController` cancels an in-flight request when a newer query begins.
5. Only the response matching the current query updates the result list.
6. A result card uses the public recipe URL and navigates normally when activated.
7. The full-results action uses `/recipes?search=<encoded-query>`.

The API already filters to published recipe articles and provides thumbnails, categories, and
pagination metadata. No database migration, contract change, or new endpoint is required.

## Accessibility

- Keep `role="dialog"`, `aria-modal="true"`, and the existing close control.
- Associate the dialog with its heading using `aria-labelledby`.
- Announce loading, result counts, no-result, and error states through a polite live region.
- Escape and backdrop dismissal remain supported.
- Search result cards retain normal link semantics and visible keyboard focus.

## Scope Boundaries

Included: navbar modal markup, styles, client-side search state, rendering, and focused tests.

Excluded: a new search API, search analytics, searching non-recipe content, admin settings,
database changes, and changes to the existing full recipes search page.

## Test Strategy

- Unit test query normalization and stale-response protection in an extracted pure helper.
- Test the modal markup keeps its viewport dialog and result-status accessibility contract.
- Browser test desktop and mobile: open modal, type a query, see cards without navigation,
  verify scrolling and no horizontal overflow, then follow a result.
- Run focused tests, `pnpm typecheck`, and `pnpm check:boundaries`.

## Acceptance Criteria

- Opening Search replaces the viewport with the search dialog.
- Typing updates recipe results within the dialog without submitting or navigating.
- The dialog displays as many cards as fit in the viewport and scrolls for the rest.
- Desktop, tablet, and mobile layouts remain usable without horizontal overflow.
- Empty, loading, results, no-results, and error states are understandable and accessible.
- Existing `/recipes?search=<term>` behavior remains unchanged.
