# Template Editor Refactor — Phases 0-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a functional baseline, remove dead code and boundary violations, then make the template editor's in-memory data shape identical to the stored snake_case JSON, governed by a new `docs/TEMPLATE_JSON_CONTRACT.md`.

**Architecture:** The stored format in `pin_templates.elements_json` is ALREADY snake_case (the serializer converts on write). We canonicalize by making the editor's in-memory types snake_case too, deleting the camelCase↔snake_case conversion layer entirely (zero dual-handling — same approach as the media pilot). Module types in `src/modules/templates/types` become the single source of truth; the admin store re-exports them so component imports stay stable.

**Tech Stack:** Astro 6 + React 19, Zustand, Konva, Drizzle/D1, Vitest. `pnpm` only.

**Spec:** `docs/superpowers/specs/2026-06-09-template-editor-refactor-design.md`

---

## Execution context

- **Worktree:** `C:/Users/Poste/Desktop/SaaS Astro/freecipies-templates`, branch `feat/template-editor`. ALL commands run there.
- **Verification protocol (every task):** `pnpm test` green + `pnpm check:boundaries` green + **STOP for manual user verification in the browser** before each commit that touches runtime behavior. The user drives save → reload checks.
- **Latent bug fixed by this plan (do not re-introduce):** stored `image_url` is hydrated to `imageUrl` by the camelCase converter while the store type declares `image_url` — the value silently vanishes on template reload. Canonicalization removes the conversion, fixing it. Phase 0 must record current behavior of image slots after reload as the "before" evidence.
- **No D1 data migration needed:** stored JSON is already snake_case with `image_slot` type names. Task 5 verifies this on local D1 before relying on it.
- Phases 3-5 (store slices, god-component split, perf pass) get their own plan after this one lands.

---

### Task 0: Baseline audit (Phase 0)

**Files:**
- Create: `docs/superpowers/specs/2026-06-09-template-editor-baseline.md`

- [ ] **Step 0.1: Start the dev server**

Run in the worktree: `pnpm dev`
Open `http://localhost:4321/admin/templates` (templates list) and the editor at `/admin/templates/<slug>` or via "new template".

- [ ] **Step 0.2: Guided functional tour — user drives, agent records**

Walk through this checklist with the user. For each item record: ✅ works / 🐛 buggy (describe) / ❌ broken / ➖ not present.

```markdown
## Editor baseline checklist
### Templates list
- [ ] List loads, thumbnails shown
- [ ] Create new template
- [ ] Duplicate template
- [ ] Delete template
- [ ] Open existing template
### Canvas basics
- [ ] Add text element / image slot / shape / logo / overlay
- [ ] Drag, resize, rotate an element
- [ ] Multi-select (shift-click), drag multi-selection
- [ ] Smart guides / snapping appear during drag
- [ ] Zoom in/out, grid toggle
- [ ] Lock/unlock element; locked element resists drag
- [ ] Layer reorder (list drag, bring to front / send to back)
- [ ] Delete element, duplicate element
### Text
- [ ] Edit text content, font family, size, weight, color, align
- [ ] Custom font upload + applies on canvas
- [ ] Text effects panel (shadow, outline, …) applies
- [ ] Binding {{article.title}} renders placeholder
### Image slot
- [ ] Set image (upload / URL), fit modes, offset/scale
- [ ] **Reload test:** set image_url, save, reload page → is the image still there? (expected 🐛 lost — latent bug)
### Persistence & history
- [ ] Undo / redo (buttons + Ctrl+Z / Ctrl+Y)
- [ ] Save; "unsaved changes" indicator clears
- [ ] Reload page → all elements identical (position, style, content)
- [ ] Keyboard shortcuts (arrows nudge, Delete)
### Export
- [ ] PNG/JPEG export produces correct image
```

- [ ] **Step 0.3: Write the baseline doc**

Save the filled checklist + bug notes to `docs/superpowers/specs/2026-06-09-template-editor-baseline.md`. This is the non-regression checklist for all later phases.

- [ ] **Step 0.4: Commit**

```bash
git add docs/superpowers/specs/2026-06-09-template-editor-baseline.md
git commit -m "docs(templates): functional baseline audit of template editor"
```

---

### Task 1: Delete dead code (Phase 1a)

**Files:**
- Delete: `src/modules/templates/store/useEditorStore.ts` (393 lines, zero importers)
- Delete: `src/modules/templates/components/` (entire dir — only contains orphan `canvas/hooks/useCustomFontLoader.js`)
- Delete: `src/admin/features/templates/store/store.types.ts` (zero importers; the store defines its own types inline)

- [ ] **Step 1.1: Prove the files are dead**

```bash
grep -rn "modules/templates/store\|modules/templates/components" src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "^src/modules/templates"
grep -rn "store.types\|store/store.types" src --include="*.ts" --include="*.tsx"
```
Expected: both commands print nothing (exit 1). If anything prints, STOP and re-evaluate — do not delete.

- [ ] **Step 1.2: Delete**

```bash
git rm src/modules/templates/store/useEditorStore.ts
git rm -r src/modules/templates/components
git rm src/admin/features/templates/store/store.types.ts
```

- [ ] **Step 1.3: Verify**

Run: `pnpm test` → all tests pass. Run: `pnpm check:boundaries` → green.

- [ ] **Step 1.4: Commit**

```bash
git commit -m "chore(templates): remove dead module store, orphan js hook, unused store.types"
```

---

### Task 2: Untangle cross-generation imports + alias deep relatives (Phase 1b)

**Files:**
- Modify: `src/admin/features/templates/components/editor/TemplateEditor.tsx:8,15`
- Modify: `src/admin/features/pins/components/PinCreator.tsx:38`
- Modify: `src/admin/features/templates/components/index.ts:8`
- Modify: `src/admin/features/templates/components/canvas/ElementPanel.tsx:940`
- Modify: `src/admin/features/templates/store/useEditorStore.ts:16`

Context: `FONTS` and `COLOR_PRESETS` already live in `canvas/utils/editorConstants.ts`; `ElementPanel.tsx` merely re-exports them, forcing consumers to import a 941-line legacy component for a constant.

- [ ] **Step 2.1: Find every importer of ElementPanel re-exports**

```bash
grep -rn "from.*ElementPanel" src --include="*.tsx" --include="*.ts"
```
Expected importers: `PinCreator.tsx`, `TemplateEditor.tsx`, `components/index.ts` (plus ElementPanel itself). If more appear, apply the same rewrite to them.

- [ ] **Step 2.2: Point importers at editorConstants**

In `TemplateEditor.tsx` line 8:
```typescript
// before
import { FONTS } from '../canvas/ElementPanel';
// after
import { FONTS } from '../canvas/utils/editorConstants';
```

In `PinCreator.tsx` line 38:
```typescript
// before
import { FONTS } from '@admin/features/templates/components/canvas/ElementPanel';
// after
import { FONTS } from '@admin/features/templates/components/canvas/utils/editorConstants';
```

In `components/index.ts` line 8:
```typescript
// before
export { default as ElementPanel, AddElementPanel, FONTS } from './canvas/ElementPanel';
// after
export { default as ElementPanel, AddElementPanel } from './canvas/ElementPanel';
export { FONTS, COLOR_PRESETS } from './canvas/utils/editorConstants';
```

In `ElementPanel.tsx` line 940, stop re-exporting constants:
```typescript
// before
export { ElementPanel, AddElementPanel, FONTS, COLOR_PRESETS };
// after
export { ElementPanel, AddElementPanel };
```
(If other files imported `COLOR_PRESETS` from ElementPanel in Step 2.1, rewrite them to editorConstants too.)

- [ ] **Step 2.3: Replace deep relative imports with aliases**

In `TemplateEditor.tsx` line 15:
```typescript
// before
import { stringifyStoredTemplateElements } from '../../../../../modules/templates/utils';
// after
import { stringifyStoredTemplateElements } from '@modules/templates/utils';
```

In `store/useEditorStore.ts` line 16:
```typescript
// before
import { toEditorTemplateElements } from '../../../../modules/templates/utils';
// after
import { toEditorTemplateElements } from '@modules/templates/utils';
```

Then sweep for any remaining deep relatives into modules:
```bash
grep -rn "\.\./\.\./\.\./\.\./.*modules/templates" src/admin --include="*.tsx" --include="*.ts"
```
Expected: nothing.

- [ ] **Step 2.4: Verify + manual check**

Run: `pnpm test` and `pnpm check:boundaries` → green.
**STOP — user verification:** open the editor, confirm font dropdown lists fonts, open PinCreator screen, confirm it renders.

- [ ] **Step 2.5: Commit**

```bash
git commit -am "refactor(templates): import FONTS/COLOR_PRESETS from editorConstants, alias deep relative imports"
```

---

### Task 3: Write TEMPLATE_JSON_CONTRACT.md (Phase 2a)

**Files:**
- Create: `docs/TEMPLATE_JSON_CONTRACT.md`

- [ ] **Step 3.1: Write the contract**

Create `docs/TEMPLATE_JSON_CONTRACT.md` with this content (informed by the Task 0 baseline — adjust property lists ONLY if the audit proved a property is dead; otherwise keep as-is):

```markdown
# TEMPLATE JSON CONTRACT

Source of truth for the `pin_templates` table and the element JSON stored in
`pin_templates.elements_json`. All data shapes are snake_case end-to-end
(DB JSON, API payloads, TypeScript) per NAMING_CONTRACT.md. There is NO
camelCase↔snake_case conversion layer: the in-memory editor shape IS the
stored shape.

## Table: pin_templates

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| slug | TEXT UNIQUE | kebab-case |
| name | TEXT | |
| description | TEXT NULL | |
| category | TEXT NULL | |
| background_color | TEXT | hex, default `#ffffff` |
| width | INTEGER | canvas px, default 1000 |
| height | INTEGER | canvas px, default 1500 |
| thumbnail_url | TEXT NULL | public URL, never an r2_key |
| elements_json | TEXT | JSON array of elements (below) |
| is_active | INTEGER 0/1 | |
| created_at / updated_at | TEXT | ISO 8601 |

## elements_json

A JSON array of element objects. Order = z-order (first = back).

### Base (all elements)

| Key | Type | Req | Notes |
|---|---|---|---|
| id | string | ✓ | `<type>-<uuid>` |
| type | `"text" \| "image_slot" \| "shape" \| "logo" \| "overlay"` | ✓ | discriminator |
| x, y | number | ✓ | px, canvas space |
| width, height | number | ✓ | px |
| rotation | number | ✓ | degrees |
| locked | boolean | ✓ | |
| visible | boolean | | default true |
| opacity | number | | 0-1 |
| name | string | | layer display name |

### type: "text"

content?, binding?, font_family?, font_size?, font_weight? (number or string),
font_style?, color?, text_align? ("left"|"center"|"right"|"justify"),
vertical_align? ("top"|"middle"|"bottom"), line_height?, letter_spacing?,
text_transform? ("none"|"uppercase"|"lowercase"|"capitalize"),
text_decoration?, auto_fit? (boolean), wrap?, ellipsis? (boolean),
stroke?, stroke_width?,
shadow? { enabled, color, blur, offset_x, offset_y },
effect? { type ("none"|"shadow"|"lift"|"hollow"|"outline"|"echo"|"glitch"|"neon"|"splice"),
          color?, offset?, direction?, blur?, transparency?, thickness? },
background? { color?, opacity?, padding?, border_radius? }

### type: "image_slot"

image_url?, src?, binding?, fit? ("cover"|"contain"|"fill"), clip_radius?,
image_offset? { x, y }, image_scale?, placeholder?, border_radius?, source_type?

### type: "shape"

shape_type? ("rect"|"circle"|"ellipse"), fill?, stroke?, stroke_width?, border_radius?

### type: "logo"

src?, fit? ("cover"|"contain"|"fill")

### type: "overlay"

fill? (rgba string)

## Bindings & placeholders

`binding` holds a placeholder resolved at pin-generation time:
`{{article.title}}`, `{{article.image}}`, `{{author.name}}`,
`{{author.avatar}}`, `{{category.label}}`.

## Rules

1. snake_case only — no camelCase key may ever be written to elements_json.
2. Unknown keys are preserved on read, never silently dropped.
3. `image_url` / `src` / `thumbnail_url` are public URLs; `r2_key` never
   appears in template JSON.
4. Canonical TypeScript types live in `src/modules/templates/types/elements.types.ts`
   and mirror this contract 1:1.
```

- [ ] **Step 3.2: Commit**

```bash
git add docs/TEMPLATE_JSON_CONTRACT.md
git commit -m "docs(templates): add TEMPLATE_JSON_CONTRACT as source of truth for element JSON"
```

---

### Task 4: Canonical snake_case types + identity serializer (Phase 2b)

**Files:**
- Rewrite: `src/modules/templates/types/elements.types.ts`
- Modify: `src/modules/templates/types/templates.types.ts:8,122`
- Rewrite: `src/modules/templates/utils/elementSerialization.ts`
- Rewrite test: `src/modules/templates/utils/__tests__/elementSerialization.test.ts`

- [ ] **Step 4.1: Rewrite the serialization test (TDD — new canonical expectations)**

Replace the whole test file with:

```typescript
import { describe, expect, it } from 'vitest';
import {
  parseStoredTemplateElements,
  stringifyStoredTemplateElements,
} from '../elementSerialization';

describe('template element serialization (canonical snake_case)', () => {
  it('round-trips elements identically — no key conversion', () => {
    const elements = [
      {
        id: 'image_slot-1',
        type: 'image_slot',
        image_url: '/api/images/template-assets/example.webp',
        source_type: 'upload',
        border_radius: 8,
        image_offset: { x: 10, y: 20 },
        x: 0, y: 0, width: 300, height: 400, rotation: 0, locked: false,
      },
      {
        id: 'text-1',
        type: 'text',
        font_family: 'Inter',
        font_size: 64,
        text_align: 'center',
        shadow: { enabled: true, offset_x: 1, offset_y: 2, blur: 4, color: '#000000' },
        x: 0, y: 0, width: 200, height: 50, rotation: 0, locked: false,
      },
    ];
    expect(parseStoredTemplateElements(stringifyStoredTemplateElements(elements))).toEqual(elements);
  });

  it('parses stored snake_case JSON as-is', () => {
    const stored = JSON.stringify([
      { id: 'image_slot-1', type: 'image_slot', image_url: '/x.webp', source_type: 'upload', border_radius: 8 },
    ]);
    expect(parseStoredTemplateElements(stored)).toEqual([
      { id: 'image_slot-1', type: 'image_slot', image_url: '/x.webp', source_type: 'upload', border_radius: 8 },
    ]);
  });

  it('returns [] for null, empty, or invalid JSON', () => {
    expect(parseStoredTemplateElements(null)).toEqual([]);
    expect(parseStoredTemplateElements('')).toEqual([]);
    expect(parseStoredTemplateElements('{not json')).toEqual([]);
    expect(parseStoredTemplateElements('{"not":"array"}')).toEqual([]);
  });

  it('accepts an already-parsed array', () => {
    expect(parseStoredTemplateElements([{ id: 'a', type: 'text' }])).toEqual([{ id: 'a', type: 'text' }]);
  });
});
```

- [ ] **Step 4.2: Run the test — must fail**

Run: `pnpm test -- elementSerialization`
Expected: FAIL — `parseStoredTemplateElements` is not exported.

- [ ] **Step 4.3: Rewrite elements.types.ts (canonical, merged from store + module shapes)**

Replace the whole file with:

```typescript
/**
 * Template Module - Element Types
 * ================================
 * Canonical element types. Mirror docs/TEMPLATE_JSON_CONTRACT.md 1:1.
 * snake_case end-to-end: the in-memory editor shape IS the stored JSON shape.
 */

export type ElementType = 'text' | 'image_slot' | 'shape' | 'logo' | 'overlay';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  visible?: boolean;
  opacity?: number;
  name?: string;
}

export interface TextShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offset_x: number;
  offset_y: number;
}

export interface TextEffect {
  type: 'none' | 'shadow' | 'lift' | 'hollow' | 'outline' | 'echo' | 'glitch' | 'neon' | 'splice';
  color?: string;
  offset?: number;
  direction?: number;
  blur?: number;
  transparency?: number;
  thickness?: number;
}

export interface TextBackground {
  color?: string;
  opacity?: number;
  padding?: number;
  border_radius?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content?: string;
  binding?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: string | number;
  font_style?: string;
  color?: string;
  text_align?: 'left' | 'center' | 'right' | 'justify';
  vertical_align?: 'top' | 'middle' | 'bottom';
  line_height?: number;
  letter_spacing?: number;
  text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  text_decoration?: string;
  shadow?: TextShadow;
  effect?: TextEffect;
  background?: TextBackground;
  auto_fit?: boolean;
  wrap?: string;
  ellipsis?: boolean;
  stroke?: string;
  stroke_width?: number;
}

export interface ImageSlotElement extends BaseElement {
  type: 'image_slot';
  image_url?: string;
  src?: string;
  binding?: string;
  fit?: 'cover' | 'contain' | 'fill';
  clip_radius?: number;
  image_offset?: { x: number; y: number };
  image_scale?: number;
  placeholder?: string;
  border_radius?: number;
  source_type?: string;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape_type?: 'rect' | 'circle' | 'ellipse';
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  border_radius?: number;
}

export interface LogoElement extends BaseElement {
  type: 'logo';
  src?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface OverlayElement extends BaseElement {
  type: 'overlay';
  fill?: string;
}

export type TemplateElement =
  | TextElement
  | ImageSlotElement
  | ShapeElement
  | LogoElement
  | OverlayElement;

export function isTextElement(el: TemplateElement): el is TextElement {
  return el.type === 'text';
}

export function isImageSlotElement(el: TemplateElement): el is ImageSlotElement {
  return el.type === 'image_slot';
}

export function isShapeElement(el: TemplateElement): el is ShapeElement {
  return el.type === 'shape';
}

export function isLogoElement(el: TemplateElement): el is LogoElement {
  return el.type === 'logo';
}

export function isOverlayElement(el: TemplateElement): el is OverlayElement {
  return el.type === 'overlay';
}
```

Note: the old module file had an `ImageElement` (`type: 'image'`) and `isImageElement` — `'image'` does not exist in stored data (the editor never produced it); it is replaced by `ImageSlotElement`. Step 4.6 greps for stale references.

- [ ] **Step 4.4: Rewrite elementSerialization.ts (identity + validation only)**

Replace the whole file with:

```typescript
/**
 * Element serialization — canonical snake_case, no key conversion.
 * The stored JSON shape IS the in-memory shape (TEMPLATE_JSON_CONTRACT.md).
 */
import type { TemplateElement } from '../types/elements.types';

export function stringifyStoredTemplateElements(elements: TemplateElement[]): string {
  return JSON.stringify(elements);
}

export function parseStoredTemplateElements(
  elements_json: string | TemplateElement[] | unknown[] | null | undefined
): TemplateElement[] {
  if (Array.isArray(elements_json)) {
    return elements_json as TemplateElement[];
  }
  if (typeof elements_json === 'string' && elements_json.trim()) {
    try {
      const parsed: unknown = JSON.parse(elements_json);
      return Array.isArray(parsed) ? (parsed as TemplateElement[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
```

(`toStoredTemplateElements` / `toEditorTemplateElements` are deleted. Importers are fixed in Steps 4.5 and Task 5.)

- [ ] **Step 4.5: Fix templates.types.ts**

Line 8:
```typescript
// before
import { toEditorTemplateElements } from '../utils/elementSerialization';
// after
import { parseStoredTemplateElements } from '../utils/elementSerialization';
```
Line 122 in `hydrateTemplate`:
```typescript
// before
    elements: toEditorTemplateElements<TemplateElement>(row.elements_json),
// after
    elements: parseStoredTemplateElements(row.elements_json),
```

- [ ] **Step 4.6: Sweep for stale references**

```bash
grep -rn "toEditorTemplateElements\|toStoredTemplateElements\|isImageElement\|'image'" src/modules/templates src/admin/features/templates --include="*.ts" --include="*.tsx"
```
Fix every hit: serializer call sites → `parseStoredTemplateElements` / `stringifyStoredTemplateElements`; `isImageElement` → `isImageSlotElement`. (The admin store call site is handled in Task 5 — if Task 5 runs immediately after, leaving it red until then is fine, but tests must pass before commit.)

- [ ] **Step 4.7: Run tests**

Run: `pnpm test -- elementSerialization`
Expected: PASS (4 tests).

- [ ] **Step 4.8: Commit (together with Task 5 if the store import breaks compile — see Task 5 note)**

```bash
git add -A
git commit -m "feat(templates): canonical snake_case element types + identity serializer (contract)"
```

---

### Task 5: Migrate the admin store to canonical types (Phase 2c)

**Files:**
- Modify: `src/admin/features/templates/store/useEditorStore.ts`
- Modify test: `src/admin/features/templates/store/__tests__/useEditorStore.test.ts`

Note: if `pnpm test` cannot pass at the end of Task 4 because the store still imports the deleted `toEditorTemplateElements`, fold Task 4's commit into this task's commit — one atomic "canonicalization core" commit. Never commit with red tests.

- [ ] **Step 5.1: Verify local D1 data is already canonical**

```bash
pnpm exec wrangler d1 execute DB --local --command "SELECT slug, substr(elements_json, 1, 200) FROM pin_templates LIMIT 5"
```
Expected: keys in snake_case (`font_family`, `image_url`, type `image_slot`). If ANY camelCase key or `imageSlot` type appears, STOP and write a one-off migration script modeled on `src/modules/categories/__tests__/migrate-category-config.test.ts` patterns before proceeding.

- [ ] **Step 5.2: Replace the store's inline types with module imports**

In `useEditorStore.ts`, delete the inline definitions of `ElementType`, `TextShadow`, `TextEffect`, `TextBackground`, `BaseElement`, `TextElement`, `ImageSlotElement`, `ShapeElement`, `LogoElement`, `OverlayElement`, `EditorElement` (lines 27-132) and replace with:

```typescript
import {
  type ElementType,
  type TemplateElement,
  type TextShadow,
  type TextEffect,
  type TextBackground,
  type TextElement,
  type ImageSlotElement,
  type ShapeElement,
  type LogoElement,
  type OverlayElement,
} from '@modules/templates/types';

/** Editor alias for the canonical element union (kept for existing importers). */
export type EditorElement = TemplateElement;
export type {
  ElementType,
  TextShadow,
  TextEffect,
  TextBackground,
  TextElement,
  ImageSlotElement,
  ShapeElement,
  LogoElement,
  OverlayElement,
};
```
This keeps every existing `import type { EditorElement, ElementType } from '@admin/features/templates/store/useEditorStore'` working unchanged.

- [ ] **Step 5.3: Replace the serializer call**

Line 16 import:
```typescript
// before
import { toEditorTemplateElements } from '@modules/templates/utils';
// after
import { parseStoredTemplateElements } from '@modules/templates/utils';
```
In `loadTemplateToStore`:
```typescript
// before
      const parsedElements = toEditorTemplateElements<EditorElement>(elements_json);
// after
      const parsedElements = parseStoredTemplateElements(elements_json);
```

- [ ] **Step 5.4: Fix `addElement` height check**

`addElement` uses `type === 'text' ? 50 : 200` — unchanged, but `generateId(type)` now produces ids like `image_slot-<uuid>` instead of `imageSlot-<uuid>`. This is fine (ids are opaque), but verify no code parses element ids to recover the type:
```bash
grep -rn "split('-')\|startsWith('imageSlot\|startsWith(\"imageSlot" src/admin --include="*.tsx" --include="*.ts"
```
Expected: nothing. If hits exist, fix them to read `el.type` instead.

- [ ] **Step 5.5: Update the store test**

In `store/__tests__/useEditorStore.test.ts`, replace every `'imageSlot'` with `'image_slot'` and every camelCase element prop with its snake_case equivalent per the Task 6 rename map. Run:
```bash
pnpm test -- useEditorStore
```
Expected: PASS.

- [ ] **Step 5.6: Full test run + boundaries**

Run: `pnpm test` and `pnpm check:boundaries` → green. (React components still use camelCase props — that's type errors at `astro check` level, not vitest failures; they are fixed in Task 6 immediately after. Do NOT pause for browser verification between Tasks 5 and 6: the app is functionally broken mid-migration.)

- [ ] **Step 5.7: Commit**

```bash
git add -A
git commit -m "feat(templates): admin store consumes canonical snake_case element types"
```

---

### Task 6: Rename element props in admin components (Phase 2d)

**Files (every file that touches element data props):**
- Modify: `src/admin/features/templates/components/canvas/TemplateCanvas.tsx`
- Modify: `src/admin/features/templates/components/canvas/elements/ElementRenderer.tsx`
- Modify: `src/admin/features/templates/components/canvas/elements/TextElement.tsx`
- Modify: `src/admin/features/templates/components/canvas/elements/ImageSlotElement.tsx`
- Modify: `src/admin/features/templates/components/canvas/elements/ShapeElement.tsx`
- Modify: `src/admin/features/templates/components/canvas/elements/LogoElement.tsx`
- Modify: `src/admin/features/templates/components/canvas/elements/OverlayElement.tsx`
- Modify: `src/admin/features/templates/components/canvas/ElementPanel.tsx`
- Modify: `src/admin/features/templates/components/canvas/CanvasToolbar.tsx`
- Modify: `src/admin/features/templates/components/canvas/FloatingToolbar.tsx`
- Modify: `src/admin/features/templates/components/canvas/DraggableLayersList.tsx`
- Modify: `src/admin/features/templates/components/canvas/modern/TopToolbar.tsx`
- Modify: `src/admin/features/templates/components/canvas/modern/SidePanel.tsx`
- Modify: `src/admin/features/templates/components/canvas/modern/ContextToolbar.tsx`
- Modify: `src/admin/features/templates/components/canvas/modern/TextEffectsPanel.tsx`
- Modify: `src/admin/features/templates/components/canvas/modern/FontsPanel.tsx`
- Modify: `src/admin/features/templates/components/editor/TemplateEditor.tsx`
- Modify: `src/admin/features/templates/hooks/useElementTransform.ts`
- Modify: `src/admin/features/templates/hooks/useImageLoader.ts`
- Modify: `src/admin/features/templates/hooks/useCanvasExport.ts`
- Modify: `src/admin/features/pins/components/PinCreator.tsx`
- Modify: `src/admin/features/pinterest/pages/BoardsList.tsx`
(definitive list = output of the greps in Step 6.1)

**Rename map (element DATA props only):**

| before | after |
|---|---|
| `'imageSlot'` (type literal) | `'image_slot'` |
| `fontFamily` | `font_family` |
| `fontSize` | `font_size` |
| `fontWeight` | `font_weight` |
| `fontStyle` | `font_style` |
| `textAlign` | `text_align` |
| `verticalAlign` | `vertical_align` |
| `lineHeight` | `line_height` |
| `letterSpacing` | `letter_spacing` |
| `textTransform` | `text_transform` |
| `textDecoration` | `text_decoration` |
| `autoFit` | `auto_fit` |
| `clipRadius` | `clip_radius` |
| `imageOffset` | `image_offset` |
| `imageScale` | `image_scale` |
| `borderRadius` | `border_radius` |
| `shapeType` | `shape_type` |
| `sourceType` | `source_type` |
| `strokeWidth` | `stroke_width` |
| `cornerRadius` | `corner_radius` (shape uses `border_radius`; rename only if the prop reads element data) |
| `offsetX` / `offsetY` (TextShadow) | `offset_x` / `offset_y` |

- [ ] **Step 6.1: ⚠️ CRITICAL — do NOT blind sed. CSS collision warning**

`borderRadius`, `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, `textTransform`, `textDecoration` are ALSO valid React CSS style props (`style={{ borderRadius: 8 }}`) and Konva node attrs (`fontFamily` on `Konva.Text`). Rename ONLY accesses on element data objects (`el.fontSize`, `element.borderRadius`, `updates: { fontFamily: v }` passed to `updateElement`). KEEP camelCase when the identifier is:
1. a React `style={{ … }}` object key,
2. a Konva component prop (`<Text fontFamily={…}>`) or `node.fontSize(…)` call — Konva's API is camelCase; the VALUE comes from the snake_case element (`fontFamily={el.font_family}`),
3. a DOM/CSS API call.

Work file by file:
```bash
grep -rn "fontFamily\|fontSize\|fontWeight\|fontStyle\|textAlign\|verticalAlign\|lineHeight\|letterSpacing\|textTransform\|textDecoration\|autoFit\|clipRadius\|imageOffset\|imageScale\|borderRadius\|shapeType\|sourceType\|strokeWidth\|cornerRadius\|offsetX\|offsetY\|imageSlot" src/admin --include="*.tsx" --include="*.ts" -l
```
For each file, open it, classify every hit (element data vs CSS/Konva), rename only element-data accesses.

- [ ] **Step 6.2: After each file, run the test suite**

Run: `pnpm test` → must stay green after every file.

- [ ] **Step 6.3: Type-level sweep**

Run Astro/TS checking to catch missed renames:
```bash
pnpm exec astro check 2>&1 | grep -i "templates\|pins" | head -40
```
Expected: no NEW errors in templates/pins files versus the count before Task 4 (capture the before-count at the start of Task 4 with the same command). Fix any new ones.

- [ ] **Step 6.4: Residual grep — element-data camelCase must be gone**

```bash
grep -rn "\.fontSize\b\|\.fontFamily\b\|\.borderRadius\b\|\.imageOffset\b\|\.sourceType\b\|\.shapeType\b\|\.clipRadius\b\|'imageSlot'" src/admin/features/templates src/admin/features/pins --include="*.tsx" --include="*.ts" | grep -v "style=\|Konva\|node\."
```
Review every remaining hit — each must be a justified Konva/CSS usage.

- [ ] **Step 6.5: STOP — full user verification against the baseline**

User runs the COMPLETE Task 0 baseline checklist in the browser. Every ✅ from the baseline must still be ✅. The image slot reload bug (`image_url` lost) must now be FIXED — image survives save → reload.

- [ ] **Step 6.6: Commit**

```bash
git add -A
git commit -m "feat(templates): admin UI consumes canonical snake_case element props end-to-end"
```

---

### Task 7: Contract conformance test + closing sweep (Phase 2e)

**Files:**
- Create: `src/modules/templates/utils/__tests__/element-contract.test.ts`

- [ ] **Step 7.1: Write a contract-conformance test**

```typescript
import { describe, expect, it } from 'vitest';
import { stringifyStoredTemplateElements } from '../elementSerialization';
import type { TemplateElement } from '../../types/elements.types';

const CAMEL_CASE_KEY = /"[a-z]+[A-Z][a-zA-Z]*"\s*:/;

describe('TEMPLATE_JSON_CONTRACT conformance', () => {
  it('serialized elements contain zero camelCase keys', () => {
    const elements: TemplateElement[] = [
      {
        id: 'text-1', type: 'text', x: 0, y: 0, width: 200, height: 50,
        rotation: 0, locked: false,
        content: 'Hello', font_family: 'Inter', font_size: 64,
        text_align: 'center', line_height: 1.2, letter_spacing: 0.5,
        shadow: { enabled: true, color: '#000', blur: 4, offset_x: 1, offset_y: 2 },
        background: { color: '#fff', opacity: 0.8, padding: 8, border_radius: 4 },
      },
      {
        id: 'image_slot-1', type: 'image_slot', x: 0, y: 0, width: 300,
        height: 400, rotation: 0, locked: false,
        image_url: '/x.webp', source_type: 'upload', border_radius: 8,
        image_offset: { x: 1, y: 2 }, image_scale: 1.5, clip_radius: 4,
      },
      {
        id: 'shape-1', type: 'shape', x: 0, y: 0, width: 100, height: 100,
        rotation: 0, locked: false, shape_type: 'rect', fill: '#f00',
        stroke: '#000', stroke_width: 2, border_radius: 6,
      },
    ];
    const json = stringifyStoredTemplateElements(elements);
    expect(json).not.toMatch(CAMEL_CASE_KEY);
    expect(json).toContain('"image_slot"');
  });
});
```

- [ ] **Step 7.2: Run it**

Run: `pnpm test -- element-contract`
Expected: PASS.

- [ ] **Step 7.3: Full suite + boundaries, final**

Run: `pnpm test` (all green) and `pnpm check:boundaries` (green).

- [ ] **Step 7.4: Commit**

```bash
git add src/modules/templates/utils/__tests__/element-contract.test.ts
git commit -m "test(templates): contract-conformance test for canonical element JSON"
```

- [ ] **Step 7.5: Update the spec status + queue phases 3-5**

Edit `docs/superpowers/specs/2026-06-09-template-editor-refactor-design.md` header: `**Status:** Phases 0-2 complete — phases 3-5 (store slices, component split, perf) pending their own plan.` Commit:
```bash
git commit -am "docs(spec): mark template editor phases 0-2 complete"
```

---

## Deferred (explicitly NOT in this plan)

- **Phases 3-5** (store slices, god-component split, measured perf pass) — separate plan after this lands.
- **`ArticleData` keys** (`categoryLabel`, `authorName`, …) in `templates.types.ts` — placeholder substitution input, not stored JSON; snake_case alignment rides with phase 3.
- **PinCreator stabilization** — separate project; this plan only keeps it compiling (Tasks 2 and 6 touch its imports/props mechanically).
