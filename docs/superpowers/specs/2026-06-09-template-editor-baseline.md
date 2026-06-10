# Template Editor — Functional Baseline (2026-06-09)

Captured before the phases 0-2 refactor. This is the **non-regression checklist**:
every ✅ here must remain ✅ after each phase. Findings combine a user-driven
browser tour with code verification (file refs given).

## Method

- Worktree `freecipies-templates`, branch `feat/template-editor`, dev at
  `http://localhost:4321/admin/templates`.
- ✅ works · 🐛 works but buggy · ❌ broken · ➖ not present.

## Templates list

- ✅ List loads with thumbnails
- ✅ Create new template
- ✅ Duplicate template
- ✅ Delete template
- ✅ Open existing template

## Canvas

- ✅ Add all 5 element types (text, image_slot, shape, logo, overlay)
- ✅ Drag, resize, rotate
- ✅ Multi-select + drag
- ✅ Smart guides / snapping
- ✅ Zoom, grid toggle
- ✅ Lock/unlock
- ✅ Layer reorder (list drag, bring to front / send to back)
- ✅ Delete / duplicate element

## Text

- ✅ Edit content, font family, size, weight, color, align
- ✅ Text effects panel applies
- ✅ Binding `{{article.title}}` renders
- 📝 **Follow-up (out of scope):** text element needs significant enrichment to
  reach Canva-level text editing. Feature work, not a regression.

## Image slot

- 🔴 **Image upload to slots is INTENTIONALLY DISABLED.** Uploading via toolbar /
  side panel / context toolbar / element panel shows toast "Template image
  replacement needs the dedicated template asset flow first." (4 call sites:
  TopToolbar, SidePanel, ContextToolbar, ElementPanel). Comment in
  `SidePanel.tsx:147-149` explains assets must not go through the editorial media
  flow; a dedicated template-asset upload route was never built. **Pre-existing,
  intentional — not caused by the refactor.** Follow-up: build the dedicated
  template asset upload route (separate feature, out of scope here).
- ✅ Fit modes, offset/scale work for slots that already have an image
  (seeded `image_url` or `{{article.image}}` binding)
- 🐛 **CONFIRMED BUG — image lost on reload.** Save writes `image_url` (snake) to
  DB; on reload `toEditorTemplateElements` rewrites it to `imageUrl` (camel),
  but `useImageLoader` reads `el.image_url`
  ([useImageLoader.ts:204](../../../src/admin/features/templates/hooks/useImageLoader.ts#L204))
  → `undefined` → image does not load. **The phases 0-2 refactor (canonical
  snake_case, Tasks 4-6) fixes this automatically.** Post-refactor expected: ✅
  image survives save → reload.

## Persistence & history

- ✅ Save works; unsaved indicator clears
- ✅ Reload restores elements (except the image_slot bug above)
- 🐛 **Undo/redo history cleared on first save (create).**
  `loadTemplateToStore` resets `history: { past: [], future: [] }`
  ([useEditorStore.ts:294](../../../src/admin/features/templates/store/useEditorStore.ts#L294)),
  invoked when a NEW template is saved
  ([TemplateEditor.tsx:329](../../../src/admin/features/templates/components/editor/TemplateEditor.tsx#L329)).
  Subsequent updates call only `markSaved()` and preserve history. Current
  behavior — **preserved as-is** by the iso-functional refactor. Follow-up
  candidate, not fixed here.
- ✅ Keyboard shortcuts (arrows nudge, Delete)

## Export

- ✅ PNG/JPEG export produces correct image
- 📝 **Follow-up (out of scope):** export quality is not high enough. Likely
  `pixelRatio` / format tuning in `useCanvasExport`. Enhancement, not a
  regression.

## Navigation / SPA

- ✅ Verified SPA — no `window.location` / full page reload anywhere in the
  templates feature; all navigation via React Router `navigate()` inside a
  single `BrowserRouter`
  ([AdminApp.tsx:59](../../../src/admin/app/AdminApp.tsx#L59)).
- 📝 **Follow-up (out of scope):** the editor mounts in `fullScreenAdminRoutes`,
  OUTSIDE `AdminLayout` ([AdminApp.tsx:66](../../../src/admin/app/AdminApp.tsx#L66)).
  Moving between dashboard and editor unmounts/remounts the whole layout and the
  lazy chunk shows a `PageLoader` flash — feels like a reload but is a chunk
  swap, not a network page load. Unifying the route trees / preloading the chunk
  would change visible behavior → out of scope for the iso-functional refactor.

## Known pre-existing server issue (not templates module)

- 🐛 Custom font listing endpoint throws `process.cwd is not a function` in local
  workerd dev ([upload-font.ts:96](../../../src/pages/api/upload-font.ts#L96)).
  Pre-existing, server-side, outside the template editor scope. Follow-up.

## Summary of bugs the refactor WILL fix

1. Image slot lost on reload (snake/camel mismatch) — fixed by canonicalization.

## Bugs/limitations explicitly left as follow-ups (NOT this refactor)

- Undo/redo history reset on create-save.
- Text element Canva-level enrichment.
- **Dedicated template asset upload route** (image-slot upload is gated until this exists).
- Export quality.
- SPA route-tree unification / chunk preloading.
- `upload-font` `process.cwd` server error.
