# AI Model Discovery Modal — Design

> **Date:** 2026-06-14
> **Status:** Draft (awaiting review)
> **Scope:** Admin AI settings — `ModelManager` "Add Model" UX.

## Problem

The AI model-management redesign (`2026-06-04-ai-model-management-redesign`) shipped a working
discovery backend (`GET /api/admin/ai/models/:provider/discover` → `{ supported, models: ReconciledModel[] }`)
but the admin UI never consumed it. In `src/admin/components/ModelManager.tsx`, `handleDiscover`
calls `aiAPI.discoverModels(provider)`, then **discards the response** — it only toasts
"Latest models fetched" and reloads. As a result:

- "Fetch latest" appears to do nothing (no models are surfaced or added).
- The only way to add a model is the manual form (type id/name/context/max by hand).
- The "discovery checklist" the prior plan's Phase 7 claimed to deliver does not exist.

This was found during manual E2E testing (the prior plan was marked COMPLETED without manual E2E).

## Goal

Make discovered models selectable and addable from a redesigned **two-tab "Add Model" modal**,
with search and multi-select, while keeping a manual fallback for providers without a usable
`/models` endpoint (e.g. qwen, zhipu). Fix the misleading "Fetch latest" entry point.

Non-goals: changing the discovery backend, generation/authoring flow, or other AI settings.

## Decisions (confirmed with product owner)

1. **Modal structure:** two tabs — **Discover** (default) and **Manual**.
2. **Already-added models in Discover:** shown **checked + greyed, read-only**. The Discover tab is
   **add-only**; enable/disable/delete continue to happen in the existing model list. (Unchecking to
   remove is explicitly out of scope.)
3. **Header "Fetch latest" button:** **removed** — discovery now lives inside the modal; the
   redundant, misleading button goes away. Bulk Import is untouched.

## Architecture

Frontend-only change. The backend discovery endpoint, settings store, and Zod schemas are unchanged.

### Components

- `src/admin/components/ModelManager.tsx` — replace the single-form Add dialog with a tabbed dialog
  (`@/ui/tabs` if present, else a lightweight two-button switch); remove the header "Fetch latest"
  button and its `handleDiscover`/`isDiscovering` state.
- `src/admin/components/ModelManager/DiscoverModelsTab.tsx` (new) — the Discover tab: fetch on open,
  search box, multi-select checklist, "Add selected" action. Extracted to keep `ModelManager.tsx`
  focused. Pure filtering logic lives in a tiny helper for unit testing (see Testing).
- The Manual tab reuses the existing form + `aiAPI.addModel` (`source: 'manual'`) unchanged.

### Data flow (Discover tab)

```
open modal (Discover tab)
  → aiAPI.discoverModels(provider)            // GET .../discover
  → response.data.data = { supported, models: ReconciledModel[] }
  → render: search filter + checkboxes
       • model.selected === true  → checked + greyed "Already added" (read-only)
       • model.status 'unavailable' | 'deprecated' → badge
  → user ticks N new models → "Add selected"
  → persist (see below) → onUpdate() (reloads settings) → close
```

`ReconciledModel` (from `src/modules/ai/discovery/reconcile.ts`) =
`DiscoveredModel & { selected: boolean; status: ModelStatus }`, i.e.
`{ id, name?, context_window?, max_tokens?, modality, supports_thinking?, deprecated?, selected, status }`.

### Persistence of selected discovered models

Selected discovered models must be saved with their full metadata and `source: 'discovered'`
(not `'manual'`). Two candidate wirings — to be finalized in the plan after verifying the existing
endpoints/schemas:

- **Preferred:** one `aiAPI.updateSettings` (PUT `/admin/ai/settings`) call that deep-merges the
  newly selected models into `providers[provider].models` (or `custom_providers[...]`). Single
  request; carries all fields. Requires confirming `UpdateSettingsSchema` accepts the model array
  with these fields (it currently uses `z.array(z.any())` for `models`, so it should).
- **Fallback:** N× `aiAPI.addModel(provider, model)`. Requires confirming `AddModelSchema` /
  `models/[provider].ts` preserve `supports_thinking`, `modality`, and set `source: 'discovered'`
  (today the add route may hardcode `source: 'manual'`). If it does, prefer the PUT path above.

The plan step will read those two files first and pick the path that preserves metadata + source
without a backend change; only if neither does will a minimal backend tweak be added.

### Unsupported / empty discovery

- `supported === false` (qwen, zhipu) **or** empty `models` → the Discover tab shows an inline
  message ("Discovery unavailable for this provider — use the Manual tab or Bulk Import") and no
  checklist. The Manual tab remains fully usable.
- Fetch error → inline error state + a "Retry" affordance; the Manual tab still works.

### Loading & refresh

- Spinner while the discover fetch is in flight.
- A "Refresh" control inside the Discover tab re-runs discovery (replaces the removed header button).

## Error handling

- Discover fetch failure: caught, inline error in the tab (not a blocking toast), Manual tab usable.
- "Add selected" failure: toast error, modal stays open so the selection isn't lost.
- No API key / provider disabled: the discover endpoint already returns a 400 ("No API key
  configured…"); surface that message inline.

## Testing

- **Unit (pure):** a `filterDiscoverModels(models, query)` helper (case-insensitive match on id +
  name) and a `splitSelectable(models)` helper (already-added vs addable) — small, pure, tested in
  `src/admin/components/ModelManager/__tests__/`.
- **Manual E2E (owner-driven):** OpenAI → open Add Model → Discover auto-fetches → search → tick a
  couple → Add selected → save→reload → models persist (enabled, `source: 'discovered'`). qwen/zhipu
  → Discover shows the unavailable message → Manual tab works. Confirm the header "Fetch latest"
  button is gone.

## File structure

- **Modify:** `src/admin/components/ModelManager.tsx`
- **Create:** `src/admin/components/ModelManager/DiscoverModelsTab.tsx`
- **Create:** `src/admin/components/ModelManager/discover-filter.ts` (pure helpers)
- **Create:** `src/admin/components/ModelManager/__tests__/discover-filter.test.ts`
- **Verify-then-maybe-modify:** `src/pages/api/admin/ai/models/[provider].ts` /
  `src/shared/validation/schemas/ai.ts` (only if needed to preserve `source: 'discovered'` +
  metadata; preference is no backend change).
