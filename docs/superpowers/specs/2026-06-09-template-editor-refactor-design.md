# Template Editor Refactor — Design

**Date:** 2026-06-09
**Branch:** `feat/template-editor` (worktree `../freecipies-templates`)
**Status:** Approved design, pending implementation plan

## Context

The Pinterest template editor (~11,100 lines across `src/admin/features/templates/` and `src/modules/templates/`) works, but was built by successive AI-agent patches. The structure does not follow project best practices: god files (941/901/742/639/638 lines), confirmed dead code, boundary violations (React/Zustand inside `src/modules`), two entangled UI generations (`canvas/` legacy vs `canvas/modern/`), no JSON contract, and element JSON stored in camelCase in violation of `docs/NAMING_CONTRACT.md` (snake_case mandated for all data shapes).

The editor matters: it is used both to set up reusable templates (with `{{article.title}}`-style bindings) and for frequent manual per-pin editing.

## Goals

1. Professional, contract-compliant architecture for the template editor.
2. `docs/TEMPLATE_JSON_CONTRACT.md` created as the source of truth for template/element data shapes.
3. Element JSON canonicalized to snake_case end-to-end, zero dual-handling (same approach as the media snake_case pilot).
4. Performance improvements where profiling justifies them (opportunistic, not the driver).

## Non-goals / Constraints

- **Strictly iso-functional:** zero visible UI/UX change. Same screens, same features, same behavior.
- **PinCreator (`src/admin/features/pins/`) is out of scope.** It is known to be unstable; stabilizing it is a separate follow-up project. Its imports of legacy template components must keep compiling at every phase.
- The two UI generations (`canvas/` and `canvas/modern/`) are **not merged** — only their cross-imports are untangled.
- The SaaS is **not in production**: the stored JSON format may be changed without backward compatibility. Local D1 templates are migrated by script or recreated (decided at implementation time).
- No changes to files shared with the parallel category session (`src/modules/index.ts`, `db/schema.sql` only if strictly necessary, `src/admin/app/routes.tsx` untouched).

## Known defects to fix (from exploration)

- **Dead code:** `src/modules/templates/store/useEditorStore.ts` (393 lines) and `src/modules/templates/components/canvas/hooks/useCustomFontLoader.js` — zero importers, not exported by the module barrel. Likely resurrected by the bad Codex merge.
- **Boundary violation:** React/Zustand code under `src/modules/templates` (must be domain-only).
- **Cross-generation entanglement:** `TemplateEditor.tsx` imports `FONTS` from legacy `ElementPanel.tsx`; `modern/SidePanel.tsx` imports legacy components.
- **Deep relative imports:** e.g. `../../../../../modules/templates/utils` instead of `@modules/templates`.
- **camelCase element JSON:** `fontFamily`, `fontSize`, `offsetX`, `imageOffset`, `clipRadius`, … stored in `pin_templates.elements_json`.

## Target architecture

```
src/admin/features/templates/
├── components/
│   ├── editor/          TemplateEditor (thin orchestrator), TemplatesList
│   ├── canvas/          TemplateCanvas + elements/ (Konva renderers)
│   │   └── modern/      EditorLayout, TopToolbar, SidePanel… (split into focused parts)
│   ├── panels/          sub-components extracted from god panels
│   └── pins/            TemplateSelector (unchanged)
├── constants/           fonts.ts, editor-defaults.ts (extracted from components)
├── hooks/               unchanged, strict typing
└── store/               useEditorStore split into typed slices:
    ├── elements.slice   element CRUD, z-order
    ├── selection.slice  selection, multi-selection
    ├── history.slice    undo/redo
    └── template.slice   meta (name, slug, dimensions, dirty state)
```

Principles: one file = one role; no file > ~300 lines at the end; `src/modules/templates` 100% domain-only (types, schema, service, serialization utils — zero React); public store API unchanged (same exported hooks/selectors).

## Phases

| Phase | Content | Risk |
|---|---|---|
| **0. Baseline audit** | Guided functional tour (user drives, agent documents): inventory of working / buggy / dead features → baseline doc. This is the non-regression checklist for all later phases. | None (read-only) |
| **1. Cleanup** | Delete confirmed dead code; extract `FONTS` + constants out of `ElementPanel`; fix boundary violations; replace deep relative imports with aliases. | Very low |
| **2. Contract + snake_case canonicalization** | Write `docs/TEMPLATE_JSON_CONTRACT.md` (based on audited behavior, normalized to snake_case). Then migrate the element data shape end-to-end: `elements.types.ts`, serialization, store, components, local D1 data. Zero dual-handling. | Medium — covered by serialization tests + contract |
| **3. Store slices** | Split the 638-line Zustand store into typed slices on top of canonical types. Public API unchanged. | Low — existing store tests |
| **4. God-component split** | `ElementPanel` (941), `TopToolbar` (901), `SidePanel` (742), `TemplateCanvas` (639) → focused sub-components. Mechanical extraction only (move JSX/handlers without changing logic), one god file at a time, verification between each. | Medium — heaviest manual testing |
| **5. Measured perf pass** | React DevTools profiling on a loaded template (~20 elements); targeted memo/Zustand selectors only where the profile justifies it. | Low |

Contract is written in Phase 2 (not Phase 0) because it must describe behavior confirmed by the audit, after Phase 1 removed dead-code noise.

## Verification protocol

At every step: `pnpm test` and `pnpm check:boundaries` green, then **stop for manual user verification in the browser** (open editor, drag/resize/rotate, undo/redo, save → reload). Commit only after user GO. Small atomic commits, one topic per commit. The Phase 0 baseline doc is the regression checklist.

## Risks & mitigations

- **Subtle Konva behavior breakage** (transform, snapping) when splitting `TemplateCanvas` → mechanical extraction only + systematic manual verification.
- **Serialization format drift** → Phase 2 lands the contract first; `elementSerialization` tests updated in the same commit as the format change; renderers and store consume canonical shape only.
- **Parallel category session conflicts** → no shared files touched; worktree isolation already in place.

## Follow-ups (explicitly out of scope)

- PinCreator stabilization (separate spec/plan on top of the cleaned-up base).
- UI generation merge (`canvas/` vs `modern/`), if ever desired.
