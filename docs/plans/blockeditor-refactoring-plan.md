# BlockEditor Refactoring Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Restructure the BlockEditor module to eliminate the God Component, replace monolithic bidirectional conversion with per-block adapters, consolidate React Contexts into editor state, and establish a single source of truth across DB/Editor/Frontend layers.

**Architecture:**
- **Per-block adapter pattern**: each block exports its BlockNote spec + `toEditor()` + `fromEditor()` + frontend render component
- **Zod-validated canonical type**: `ContentBlock` discriminated union is the ONLY type crossing layers
- **Hook-extracted editor**: `BlockEditor/index.jsx` becomes a thin composition shell
- **Native object props**: eliminate all `*Json` string props in BlockNote blocks

**Tech Stack:** Astro 6, React 19, BlockNote (latest), Drizzle ORM, Zod, Tailwind 4

---

## Phase 0: Prerequisite — BlockNote Schema Typing

### Task 0.1: Install Zod and type the BlockNote schema

**Objective:** Add runtime validation and eliminate `any` from the editor boundary.

**Files:**
- Modify: `src/admin/components/BlockEditor/schema.ts`
- Create: `src/admin/components/BlockEditor/types/editor.types.ts`

**Step 1: Create typed editor types**

```typescript
// src/admin/components/BlockEditor/types/editor.types.ts
import type { BlockNoteSchema, BlockNoteEditor } from '@blocknote/core';
import type { schema } from '../schema';

export type AppSchema = typeof schema;
export type AppEditor = BlockNoteEditor<AppSchema>;
export type AppBlock = AppEditor['document'][number];
```

**Step 2: Update schema.ts to export strongly typed schema**

```typescript
// src/admin/components/BlockEditor/schema.ts
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import {
    Alert, VideoBlock, ImageBlock, FAQSectionBlock,
    DividerBlock, MainRecipeBlock, RoundupListBlock,
    RelatedContentBlock, TableBlock, BeforeAfterBlock,
} from './blocks';

export const schema = BlockNoteSchema.create({
    blockSpecs: (() => {
        const { table, ...rest } = defaultBlockSpecs;
        return {
            ...rest,
            alert: Alert(),
            video: VideoBlock(),
            customImage: ImageBlock(),
            faqSection: FAQSectionBlock(),
            divider: DividerBlock(),
            mainRecipe: MainRecipeBlock(),
            roundupList: RoundupListBlock(),
            relatedContent: RelatedContentBlock(),
            simpleTable: TableBlock(),
            beforeAfter: BeforeAfterBlock(),
        };
    })(),
});

export type AppSchema = typeof schema;
```

**Step 3: Verify no type errors**

Run: `pnpm tsc --noEmit --project tsconfig.json`
Expected: No new errors introduced.

---

## Phase 1: Per-Block Adapter Pattern (The Foundation)

### Task 1.1: Create the BlockAdapter interface

**Objective:** Define the contract every custom block must implement.

**Files:**
- Create: `src/admin/components/BlockEditor/blocks/BlockAdapter.ts`

```typescript
// src/admin/components/BlockEditor/blocks/BlockAdapter.ts
import type { ContentBlock } from '../../../../modules/articles/types/content-blocks.types';
import type { AppBlock } from '../types/editor.types';

export interface BlockAdapter<T extends ContentBlock = ContentBlock> {
    /** BlockNote type string */
    type: string;

    /** Convert canonical DB block to BlockNote block */
    toEditor(block: T): Partial<AppBlock>;

    /** Convert BlockNote block back to canonical DB block */
    fromEditor(block: AppBlock): T | null;

    /** Validate that editor block props are valid */
    validate?(props: Record<string, unknown>): boolean;
}

/** Registry of all adapters */
export const blockAdapters = new Map<string, BlockAdapter>();

export function registerBlockAdapter(adapter: BlockAdapter) {
    blockAdapters.set(adapter.type, adapter);
}

export function getBlockAdapter(type: string): BlockAdapter | undefined {
    return blockAdapters.get(type);
}
```

**Step 2: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/BlockAdapter.ts
git commit -m "feat(blockeditor): add BlockAdapter interface and registry"
```

---

### Task 1.2: Create Paragraph adapter + test

**Objective:** Implement the simplest adapter to validate the pattern.

**Files:**
- Create: `src/admin/components/BlockEditor/blocks/adapters/ParagraphAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/__tests__/ParagraphAdapter.test.ts`

**Step 1: Write failing test**

```typescript
// src/admin/components/BlockEditor/blocks/adapters/__tests__/ParagraphAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { ParagraphAdapter } from '../ParagraphAdapter';
import type { ParagraphBlock } from '../../../../../modules/articles/types/content-blocks.types';

describe('ParagraphAdapter', () => {
    const adapter = ParagraphAdapter;

    it('converts DB paragraph to editor block', () => {
        const dbBlock: ParagraphBlock = { type: 'paragraph', text: 'Hello **world**' };
        const editorBlock = adapter.toEditor(dbBlock);
        expect(editorBlock.type).toBe('paragraph');
        expect(editorBlock.content).toBeDefined();
    });

    it('converts editor paragraph back to DB block', () => {
        const editorBlock = {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world', styles: { bold: true } }],
        } as any;
        const dbBlock = adapter.fromEditor(editorBlock);
        expect(dbBlock?.type).toBe('paragraph');
        expect(dbBlock?.text).toContain('**');
    });
});
```

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/adapters/__tests__/ParagraphAdapter.test.ts`
Expected: FAIL — "ParagraphAdapter not defined"

**Step 2: Implement adapter**

```typescript
// src/admin/components/BlockEditor/blocks/adapters/ParagraphAdapter.ts
import type { BlockAdapter } from '../BlockAdapter';
import type { ParagraphBlock } from '../../../../../modules/articles/types/content-blocks.types';
import { parseInlineMarkdown, extractText } from '../../utils/inlineContent';
import type { AppBlock } from '../../types/editor.types';

export const ParagraphAdapter: BlockAdapter<ParagraphBlock> = {
    type: 'paragraph',

    toEditor(block) {
        return {
            type: 'paragraph',
            content: parseInlineMarkdown(block.text || ''),
        };
    },

    fromEditor(block: AppBlock): ParagraphBlock | null {
        const text = extractText(block.content as any);
        if (!text.trim()) return null;
        return { type: 'paragraph', text };
    },
};
```

**Step 3: Run test to verify pass**

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/adapters/__tests__/ParagraphAdapter.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/adapters/
git commit -m "feat(blockeditor): add ParagraphAdapter with round-trip tests"
```

---

### Task 1.3: Migrate all blocks to adapters (batch)

**Objective:** Create adapters for every block type currently in `conversion.ts`.

**Files:**
- Create: `src/admin/components/BlockEditor/blocks/adapters/HeadingAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/ImageAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/VideoAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/AlertAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/FAQAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/RoundupListAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/RelatedContentAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/TableAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/BeforeAfterAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/DividerAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/ListAdapter.ts`
- Create: `src/admin/components/BlockEditor/blocks/adapters/index.ts`

**Pattern for each adapter (example: ImageAdapter):**

```typescript
// src/admin/components/BlockEditor/blocks/adapters/ImageAdapter.ts
import type { BlockAdapter } from '../BlockAdapter';
import type { ImageBlock } from '../../../../../modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { resolveVariantUrl } from '../../../../../shared/types/images';
import type { ImageVariants } from '../../../../../shared/types/images';

export const ImageAdapter: BlockAdapter<ImageBlock> = {
    type: 'customImage',

    toEditor(block) {
        const variants = block.variants || {};
        const bestUrl =
            resolveVariantUrl(variants.lg) ||
            resolveVariantUrl(variants.md) ||
            resolveVariantUrl(variants.sm) ||
            resolveVariantUrl(variants.xs) ||
            resolveVariantUrl(variants.original) ||
            '';
        const bestVariant = variants.lg || variants.md || variants.sm || variants.xs || variants.original || {};

        return {
            type: 'customImage',
            props: {
                url: bestUrl,
                alt: block.alt || '',
                caption: block.caption || '',
                credit: block.credit || '',
                width: bestVariant.width || 512,
                height: bestVariant.height || 0,
                mediaId: block.media_id?.toString() || '',
                // NATIVE OBJECT — no JSON string!
                variants: block.variants || {},
            },
        };
    },

    fromEditor(block: AppBlock): ImageBlock | null {
        const props = block.props as any;
        if (!props?.url) return null;

        return {
            type: 'image',
            media_id: props.mediaId ? parseInt(props.mediaId, 10) : 0,
            alt: props.alt || '',
            caption: props.caption || '',
            credit: props.credit || '',
            // NATIVE OBJECT — directly from props
            variants: props.variants || { lg: { url: props.url } },
        };
    },
};
```

**Critical: FAQ Adapter stores native array**

```typescript
// FAQAdapter.ts — props.items is Array<FAQItem>, NOT string!
toEditor(block) {
    return {
        type: 'faqSection',
        props: {
            title: block.title || 'Frequently Asked Questions',
            items: block.items || [], // ← NATIVE ARRAY
        },
    };
},

fromEditor(block) {
    const props = block.props as any;
    return {
        type: 'faq_section',
        title: props.title || 'Frequently Asked Questions',
        items: Array.isArray(props.items) ? props.items : [], // ← NATIVE ARRAY
    };
}
```

**Step 2: Register all adapters in barrel file**

```typescript
// src/admin/components/BlockEditor/blocks/adapters/index.ts
import { registerBlockAdapter } from '../BlockAdapter';
import { ParagraphAdapter } from './ParagraphAdapter';
import { HeadingAdapter } from './HeadingAdapter';
import { ImageAdapter } from './ImageAdapter';
import { VideoAdapter } from './VideoAdapter';
import { AlertAdapter } from './AlertAdapter';
import { ListAdapter } from './ListAdapter';
import { BlockquoteAdapter } from './BlockquoteAdapter';
import { FAQAdapter } from './FAQAdapter';
import { RoundupListAdapter } from './RoundupListAdapter';
import { RelatedContentAdapter } from './RelatedContentAdapter';
import { TableAdapter } from './TableAdapter';
import { BeforeAfterAdapter } from './BeforeAfterAdapter';
import { DividerAdapter } from './DividerAdapter';

export function registerAllBlockAdapters() {
    registerBlockAdapter(ParagraphAdapter);
    registerBlockAdapter(HeadingAdapter);
    registerBlockAdapter(ImageAdapter);
    registerBlockAdapter(VideoAdapter);
    registerBlockAdapter(AlertAdapter);
    registerBlockAdapter(ListAdapter);
    registerBlockAdapter(BlockquoteAdapter);
    registerBlockAdapter(FAQAdapter);
    registerBlockAdapter(RoundupListAdapter);
    registerBlockAdapter(RelatedContentAdapter);
    registerBlockAdapter(TableAdapter);
    registerBlockAdapter(BeforeAfterAdapter);
    registerBlockAdapter(DividerAdapter);
}
```

**Step 3: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/adapters/
git commit -m "feat(blockeditor): add per-block adapters for all 13 block types"
```

---

### Task 1.4: Replace monolithic conversion.ts with adapter dispatch

**Objective:** Delete the 441-line god-file and replace with 20 lines of adapter dispatch.

**Files:**
- Modify: `src/admin/components/BlockEditor/utils/conversion.ts`
- Modify: `src/admin/components/BlockEditor/index.jsx` (update import)

**Step 1: Rewrite conversion.ts**

```typescript
// src/admin/components/BlockEditor/utils/conversion.ts
import type { ContentBlock } from '../../../../modules/articles/types/content-blocks.types';
import type { AppBlock } from '../types/editor.types';
import { getBlockAdapter, registerAllBlockAdapters } from '../blocks/adapters';
import type { Block } from '@blocknote/core';

type AnyBlock = Block<any, any, any>;

// Ensure adapters are registered
registerAllBlockAdapters();

export function contentJsonToBlocks(
    contentJson: string | any[] | { blocks: any[] } | undefined
): AnyBlock[] | undefined {
    if (!contentJson) return undefined;

    let parsed = contentJson;
    if (typeof contentJson === 'string') {
        try { parsed = JSON.parse(contentJson); } catch { return undefined; }
    }

    let blocks = parsed as any[];
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        blocks = (parsed as any).blocks;
    }
    if (!Array.isArray(blocks)) return undefined;

    const result: AnyBlock[] = [];
    for (const block of blocks) {
        if (!block?.type) continue;
        const adapter = getBlockAdapter(block.type === 'image' ? 'customImage' : block.type);
        if (adapter) {
            const editorBlock = adapter.toEditor(block);
            if (editorBlock) result.push(editorBlock as AnyBlock);
        } else {
            // Fallback for unhandled types
            result.push({ id: block.id || crypto.randomUUID(), type: 'paragraph', content: block.text || '' } as AnyBlock);
        }
    }

    return result.length > 0 ? result : [{ id: 'init-0', type: 'paragraph', content: '', props: {}, children: [] } as AnyBlock];
}

export function blocksToContentJson(blocks: AnyBlock[]): ContentBlock[] {
    if (!Array.isArray(blocks)) return [];

    const result: ContentBlock[] = [];
    let currentList: any = null;

    for (const block of blocks) {
        // Handle list item grouping (preserved from original)
        if (['bulletListItem', 'numberedListItem', 'checkListItem'].includes(block.type)) {
            const style = block.type === 'numberedListItem' ? 'ordered'
                : block.type === 'checkListItem' ? 'checklist' : 'unordered';
            const text = extractText(block.content as any);
            if (currentList && currentList.style === style) {
                currentList.items.push(text);
            } else {
                if (currentList) result.push(currentList);
                currentList = { type: 'list', style, items: [text] };
            }
            continue;
        }
        if (currentList) { result.push(currentList); currentList = null; }

        const adapter = getBlockAdapter(block.type);
        if (adapter) {
            const dbBlock = adapter.fromEditor(block as AppBlock);
            if (dbBlock) result.push(dbBlock);
        }
    }
    if (currentList) result.push(currentList);
    return result;
}

// Re-export for list handling
import { extractText } from './inlineContent';
```

**Step 2: Verify conversion still works**

Run: `pnpm tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/admin/components/BlockEditor/utils/conversion.ts
git commit -m "refactor(blockeditor): replace monolithic conversion with adapter dispatch"
```

---

## Phase 2: God Component Decomposition

### Task 2.1: Extract `useEditorStateManager` hook

**Objective:** Isolate selection, structure, and active block state.

**Files:**
- Create: `src/admin/components/BlockEditor/hooks/useEditorStateManager.ts`
- Modify: `src/admin/components/BlockEditor/index.jsx`

**Step 1: Create hook**

```typescript
// src/admin/components/BlockEditor/hooks/useEditorStateManager.ts
import { useState, useRef, useCallback, useTransition, useDeferredValue } from 'react';
import type { AppEditor } from '../types/editor.types';

export interface StructureItem {
    id: string;
    type: string;
    depth: number;
    parentId: string | null;
    level?: number;
    label: string;
    icon?: string;
}

export function useEditorStateManager(editor: AppEditor | null) {
    const [structureItems, setStructureItems] = useState<StructureItem[]>([]);
    const deferredStructureItems = useDeferredValue(structureItems);
    const structureItemsRef = useRef(structureItems);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const activeBlockIdRef = useRef(activeBlockId);
    const [, startStructureTransition] = useTransition();

    // Keep refs in sync
    const updateStructureItems = useCallback((items: StructureItem[]) => {
        structureItemsRef.current = items;
        startStructureTransition(() => setStructureItems(items));
    }, [startStructureTransition]);

    const selectBlock = useCallback((blockId: string | null) => {
        activeBlockIdRef.current = blockId;
        setActiveBlockId(blockId);
    }, []);

    return {
        structureItems: deferredStructureItems,
        structureItemsRef,
        activeBlockId,
        activeBlockIdRef,
        updateStructureItems,
        selectBlock,
    };
}
```

**Step 2: Use in index.jsx**

Replace lines 172-181 and related effects with:
```jsx
const {
    structureItems, structureItemsRef, activeBlockId, activeBlockIdRef,
    updateStructureItems, selectBlock,
} = useEditorStateManager(editor);
```

**Step 3: Commit**

```bash
git add src/admin/components/BlockEditor/hooks/useEditorStateManager.ts
git commit -m "refactor(blockeditor): extract useEditorStateManager hook"
```

---

### Task 2.2: Extract `useLinkToolbar` hook

**Objective:** Isolate link toolbar positioning and state.

**Files:**
- Create: `src/admin/components/BlockEditor/hooks/useLinkToolbar.ts`
- Modify: `src/admin/components/BlockEditor/index.jsx`

**Step 1: Create hook (lines 184-550 logic)**

```typescript
// src/admin/components/BlockEditor/hooks/useLinkToolbar.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppEditor } from '../types/editor.types';

export interface LinkToolbarState {
    open: boolean;
    top: number;
    left: number;
    text: string;
    url: string;
    selection: { from: number; to: number } | null;
    mode: 'buttons' | 'link';
}

export function useLinkToolbar(editor: AppEditor | null, wrapperRef: React.RefObject<HTMLElement>) {
    const [linkToolbar, setLinkToolbar] = useState<LinkToolbarState>({
        open: false, top: 0, left: 0, text: '', url: '', selection: null, mode: 'buttons',
    });
    const linkToolbarRef = useRef(linkToolbar);

    useEffect(() => { linkToolbarRef.current = linkToolbar; }, [linkToolbar]);

    const updateFromSelection = useCallback(() => {
        if (!editor || linkToolbarRef.current.mode === 'link') return;
        const text = editor.getSelectedText() || '';
        if (!text) {
            setLinkToolbar(prev => prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev);
            return;
        }
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        const rect = range.getBoundingClientRect();
        const wrapper = wrapperRef.current;
        if (!wrapper || !rect.width) return;
        const wrapperRect = wrapper.getBoundingClientRect();

        const url = editor.getSelectedLinkUrl() || '';
        const tiptapSelection = editor._tiptapEditor?.state?.selection;
        const selectionRange = tiptapSelection ? { from: tiptapSelection.from, to: tiptapSelection.to } : null;

        setLinkToolbar({
            open: true,
            top: rect.top - wrapperRect.top - 10,
            left: rect.left - wrapperRect.left + rect.width / 2,
            text,
            url,
            selection: selectionRange,
            mode: 'buttons',
        });
    }, [editor, wrapperRef]);

    const closeToolbar = useCallback(() => {
        setLinkToolbar({ open: false, top: 0, left: 0, text: '', url: '', selection: null, mode: 'buttons' });
    }, []);

    return { linkToolbar, linkToolbarRef, updateFromSelection, closeToolbar, setLinkToolbar };
}
```

**Step 2: Commit**

```bash
git add src/admin/components/BlockEditor/hooks/useLinkToolbar.ts
git commit -m "refactor(blockeditor): extract useLinkToolbar hook"
```

---

### Task 2.3: Extract `useInsertHandle` hook

**Objective:** Isolate the "+" button inter-block logic.

**Files:**
- Create: `src/admin/components/BlockEditor/hooks/useInsertHandle.ts`
- Modify: `src/admin/components/BlockEditor/index.jsx`

**Step 1: Create hook (lines 638-840 logic)**

```typescript
// src/admin/components/BlockEditor/hooks/useInsertHandle.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import type { AppEditor } from '../types/editor.types';

export interface InsertHandle {
    blockId: string;
    placement: 'before' | 'after';
    top: number;
    left: number;
    width: number;
}

export function useInsertHandle(editor: AppEditor | null, wrapperRef: React.RefObject<HTMLElement>, canvasRef: React.RefObject<HTMLElement>) {
    const [insertHandle, setInsertHandle] = useState<InsertHandle | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHideTimeout = useCallback(() => {
        if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    }, []);

    const scheduleHide = useCallback(() => {
        if (hideTimeoutRef.current) return;
        hideTimeoutRef.current = setTimeout(() => { setInsertHandle(null); hideTimeoutRef.current = null; }, 400);
    }, []);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper || !editor?.domElement) return;
        const root = editor.domElement;

        const handlePointerMove = (event: PointerEvent) => {
            // ... (extracted logic from lines 646-822)
            // Simplified: calculate nearest block edge and setInsertHandle
        };

        const handleLeave = () => { clearHideTimeout(); scheduleHide(); };

        wrapper.addEventListener('pointermove', handlePointerMove, { passive: true });
        wrapper.addEventListener('mouseleave', handleLeave);
        wrapper.addEventListener('pointerleave', handleLeave);
        wrapper.addEventListener('scroll', handleLeave, { passive: true });

        return () => {
            clearHideTimeout();
            wrapper.removeEventListener('pointermove', handlePointerMove);
            wrapper.removeEventListener('mouseleave', handleLeave);
            wrapper.removeEventListener('pointerleave', handleLeave);
            wrapper.removeEventListener('scroll', handleLeave);
        };
    }, [editor, wrapperRef, canvasRef, clearHideTimeout, scheduleHide]);

    return { insertHandle, setInsertHandle };
}
```

**Step 2: Commit**

```bash
git add src/admin/components/BlockEditor/hooks/useInsertHandle.ts
git commit -m "refactor(blockeditor): extract useInsertHandle hook"
```

---

### Task 2.4: Extract `useCanvasDragDrop` hook

**Objective:** Isolate DndContext canvas drag-and-drop logic.

**Files:**
- Create: `src/admin/components/BlockEditor/hooks/useCanvasDragDrop.ts`
- Modify: `src/admin/components/BlockEditor/index.jsx`

**Step 1: Create hook (lines 872-981 logic)**

```typescript
// src/admin/components/BlockEditor/hooks/useCanvasDragDrop.ts
import { useRef, useCallback } from 'react';
import type { AppEditor } from '../types/editor.types';
import { moveBlockById } from '../blocks/primitives';

export function useCanvasDragDrop(editor: AppEditor | null, structureItemsRef: React.RefObject<any[]>, selectBlock: (id: string) => void) {
    const canvasDragPointerRef = useRef({ x: 0, y: 0 });
    const canvasDragPointerListenerRef = useRef<((e: Event) => void) | null>(null);

    const updateCanvasDragPointer = useCallback((event: any) => {
        if (!event) return;
        if (typeof event.clientX === 'number') { canvasDragPointerRef.current = { x: event.clientX, y: event.clientY }; return; }
        const touches = event.touches || event.changedTouches;
        if (touches?.[0]) canvasDragPointerRef.current = { x: touches[0].clientX, y: touches[0].clientY };
    }, []);

    const startTracking = useCallback((initialEvent: any) => {
        if (canvasDragPointerListenerRef.current) return;
        updateCanvasDragPointer(initialEvent);
        const handler = (e: Event) => updateCanvasDragPointer(e);
        window.addEventListener('pointermove', handler, { capture: true });
        canvasDragPointerListenerRef.current = handler;
    }, [updateCanvasDragPointer]);

    const stopTracking = useCallback(() => {
        const handler = canvasDragPointerListenerRef.current;
        if (!handler) return;
        window.removeEventListener('pointermove', handler, { capture: true });
        canvasDragPointerListenerRef.current = null;
    }, []);

    const getBlockFromPoint = useCallback((x: number, y: number) => {
        const root = editor?.domElement;
        if (!root) return null;
        const element = document.elementFromPoint(x, y);
        if (!(element instanceof HTMLElement)) return null;
        const candidate = element.closest('[data-id]');
        if (!(candidate instanceof HTMLElement) || !root.contains(candidate)) return null;
        const id = candidate.getAttribute('data-id');
        return id ? { id, element: candidate } : null;
    }, [editor]);

    const reorderBlockRelativeToTarget = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
        if (!editor || draggedId === targetId) return;
        const items = structureItemsRef.current || [];
        const dragged = items.find((i: any) => i.id === draggedId);
        const target = items.find((i: any) => i.id === targetId);
        if (!dragged || !target || dragged.parentId !== target.parentId) return;

        const siblings = items.filter((i: any) => i.parentId === dragged.parentId).map((i: any) => i.id);
        const fromIndex = siblings.indexOf(draggedId);
        const targetIndex = siblings.indexOf(targetId);
        if (fromIndex < 0 || targetIndex < 0) return;

        let desiredIndex = targetIndex + (position === 'after' ? 1 : 0);
        if (fromIndex < targetIndex) desiredIndex -= 1;
        desiredIndex = Math.max(0, Math.min(siblings.length - 1, desiredIndex));

        const steps = desiredIndex - fromIndex;
        const direction = steps < 0 ? 'up' : 'down';
        for (let i = 0; i < Math.abs(steps); i++) moveBlockById(editor, draggedId, direction);
        selectBlock(draggedId);
        editor.focus();
    }, [editor, structureItemsRef, selectBlock]);

    return { startTracking, stopTracking, getBlockFromPoint, reorderBlockRelativeToTarget, canvasDragPointerRef };
}
```

**Step 2: Commit**

```bash
git add src/admin/components/BlockEditor/hooks/useCanvasDragDrop.ts
git commit -m "refactor(blockeditor): extract useCanvasDragDrop hook"
```

---

### Task 2.5: Slim down `index.jsx` to composition shell

**Objective:** `index.jsx` should be < 300 lines, only composing hooks and rendering JSX.

**Files:**
- Modify: `src/admin/components/BlockEditor/index.jsx`

**Target structure:**
```jsx
export default function BlockEditor({ value, onChange, /* ...props */ }) {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const lastEmittedValueRef = useRef('');

    const initialContent = useMemo(() => contentJsonToBlocks(value), []);
    const editor = useCreateBlockNote({ schema, initialContent, /* ... */ });

    const { structureItems, activeBlockId, selectBlock, updateStructureItems } = useEditorStateManager(editor);
    const { linkToolbar, updateFromSelection, closeToolbar, setLinkToolbar } = useLinkToolbar(editor, wrapperRef);
    const { insertHandle, setInsertHandle } = useInsertHandle(editor, wrapperRef, canvasRef);
    const { startTracking, stopTracking, getBlockFromPoint, reorderBlockRelativeToTarget } = useCanvasDragDrop(editor, structureItemsRef, selectBlock);

    // Single content change effect (replaces 3 separate effects)
    useEditorContentSync(editor, { onChangeRef, lastEmittedValueRef, contentType, onRoundupChange });

    // Selection effect
    useEditorSelectionSync(editor, { selectBlock, activeBlockIdRef });

    // DOM attribute effect
    useBlockDomAttributes(editor, activeBlockId);

    // Render: only JSX composition
    return (
        <RelatedContentProvider value={relatedContext}>
            <BlockSelectionProvider activeBlockId={activeBlockId} setActiveBlockId={selectBlock}>
                {/* ... simplified JSX ... */}
            </BlockSelectionProvider>
        </RelatedContentProvider>
    );
}
```

**Step 1: Implement `useEditorContentSync`, `useEditorSelectionSync`, `useBlockDomAttributes`**

Create these three hooks by extracting the remaining useEffect blocks from index.jsx.

**Step 2: Commit**

```bash
git add src/admin/components/BlockEditor/hooks/
git add src/admin/components/BlockEditor/index.jsx
git commit -m "refactor(blockeditor): slim index.jsx to composition shell (<300 lines)"
```

---

## Phase 3: Context Consolidation

### Task 3.1: Eliminate `RecipeDataContext` — store recipe in block props

**Objective:** Recipe data should live in the `mainRecipe` block props, not a React Context.

**Files:**
- Modify: `src/admin/components/BlockEditor/blocks/MainRecipeBlock.jsx`
- Modify: `src/admin/components/BlockEditor/index.jsx`
- Modify: `src/admin/components/BlockEditor/blocks/adapters/RecipeAdapter.ts` (create if not exists)

**Step 1: Update MainRecipeBlock propSchema**

```jsx
export const MainRecipeBlock = createReactBlockSpec(
    {
        type: "mainRecipe",
        propSchema: {
            // Store a reference key or minimal metadata; actual recipe kept in parent form state
            recipeKey: { default: '' },
        },
        content: "none",
    },
    {
        render: (props) => {
            const { block, editor } = props;
            // Read recipe from parent props passed via BlockEditor, NOT from context
            // BlockEditor will pass recipe down as a regular prop
            return (
                <BlockWrapper /* ... */>
                    <RecipeBuilder
                        value={block.props.recipeData} // Passed from parent
                        onChange={(newValue) => {
                            editor.updateBlock(block, {
                                props: { ...block.props, recipeData: newValue }
                            });
                        }}
                    />
                </BlockWrapper>
            );
        }
    }
);
```

**Step 2: Remove RecipeDataContext from index.jsx**

Delete:
```jsx
import { RecipeDataContext } from './blocks/MainRecipeBlock';
// ...
<RecipeDataContext.Provider value={recipeContextValue}>
```

**Step 3: Commit**

```bash
git commit -m "refactor(blockeditor): remove RecipeDataContext, store recipe in block props"
```

---

### Task 3.2: Eliminate `FAQDataContext` — store FAQ in block props

**Objective:** FAQ items and title should live in the `faqSection` block props as native arrays/objects.

**Files:**
- Modify: `src/admin/components/BlockEditor/blocks/FAQSectionBlock.jsx`
- Modify: `src/admin/components/BlockEditor/index.jsx`

**Step 1: Update FAQSectionBlock propSchema**

```jsx
propSchema: {
    title: { default: 'Frequently Asked Questions' },
    // NATIVE ARRAY — BlockNote v0.20+ supports object/array defaults
    items: { default: [] },
},
```

**Step 2: Update FAQSectionBlock render — remove context usage**

```jsx
render: (props) => {
    const { block, editor } = props;
    const items = Array.isArray(block.props.items) ? block.props.items : [];
    const title = block.props.title || 'Frequently Asked Questions';

    const updateItems = (newItems) => {
        editor.updateBlock(block, {
            type: 'faqSection',
            props: { ...block.props, items: newItems }
        });
    };

    const updateTitle = (newTitle) => {
        editor.updateBlock(block, {
            type: 'faqSection',
            props: { ...block.props, title: newTitle }
        });
    };

    // ... rest of render without context
}
```

**Step 3: Remove FAQDataContext from index.jsx**

**Step 4: Update FAQAdapter to read native array**

```typescript
// FAQAdapter.ts
fromEditor(block) {
    const props = block.props as any;
    return {
        type: 'faq_section',
        title: props.title || 'Frequently Asked Questions',
        items: Array.isArray(props.items) ? props.items : [],
    };
}
```

**Step 5: Commit**

```bash
git commit -m "refactor(blockeditor): remove FAQDataContext, store FAQ as native array in block props"
```

---

### Task 3.3: Eliminate `RoundupDataContext` — store roundup in block props

**Objective:** Roundup data should be extracted from `roundupList` block props, not a separate context + side effect.

**Files:**
- Modify: `src/admin/components/BlockEditor/index.jsx`
- Modify: `src/admin/components/BlockEditor/blocks/RoundupListBlock.jsx`

**Step 1: Remove sync engine from index.jsx (lines 291-319)**

Delete the `if (contentType === 'roundup')` sync block from the content change effect.

**Step 2: Update RoundupListBlock propSchema**

```jsx
propSchema: {
    title: { default: "" },
    description: { default: "" },
    items: { default: [] }, // NATIVE ARRAY
    showStats: { default: true },
},
```

**Step 3: Update RoundupListBlock render**

```jsx
const items = Array.isArray(block.props.items) ? block.props.items : [];
```

**Step 4: Remove RoundupDataContext from index.jsx**

**Step 5: Commit**

```bash
git commit -m "refactor(blockeditor): remove RoundupDataContext, store roundup items as native array"
```

---

## Phase 4: Database & Frontend Alignment

### Task 4.1: Merge recipe/faq/roundup JSON columns into content_json

**Objective:** Single source of truth in the database.

**Files:**
- Modify: `src/modules/articles/schema/articles.schema.ts`
- Modify: `src/modules/articles/services/articles.service.ts`
- Modify: `src/modules/articles/types/content-blocks.types.ts`

**Step 1: Mark columns deprecated in schema (soft migration)**

```typescript
// articles.schema.ts
recipeJson: text('recipe_json'), // DEPRECATED: migrate to content_json mainRecipe block
roundupJson: text('roundup_json'), // DEPRECATED: migrate to content_json roundupList block
faqsJson: text('faqs_json'),      // DEPRECATED: migrate to content_json faqSection block
```

**Step 2: Add migration helper in service**

```typescript
// articles.service.ts
export function migrateLegacyJsonFields(article: Article): Article {
    if (!article.contentJson) return article;

    const blocks = safeParseJson<any[]>(article.contentJson, []);
    let migrated = false;

    // If recipeJson exists but no mainRecipe block in contentJson, inject one
    if (article.recipeJson && !blocks.some(b => b.type === 'main_recipe')) {
        const recipe = safeParseJson<any>(article.recipeJson);
        if (recipe) {
            blocks.push({ type: 'main_recipe' });
            migrated = true;
        }
    }

    // If faqsJson exists but no faq_section block, inject one
    if (article.faqsJson && !blocks.some(b => b.type === 'faq_section')) {
        const faqs = safeParseJson<any[]>(article.faqsJson, []);
        if (faqs.length) {
            blocks.push({ type: 'faq_section', title: 'Frequently Asked Questions', items: faqs });
            migrated = true;
        }
    }

    if (migrated) {
        return { ...article, contentJson: JSON.stringify(blocks) };
    }
    return article;
}
```

**Step 3: Use migration in `getArticleBySlug` and `getArticles`**

**Step 4: Commit**

```bash
git commit -m "feat(db): add migration helper for recipe/faq/roundup into content_json"
```

---

### Task 4.2: Unify ContentRenderer.astro to use ContentBlock union

**Objective:** Frontend renderer should trust the canonical type and use a dispatcher pattern.

**Files:**
- Modify: `src/components/ContentRenderer.astro`
- Create: `src/components/content/BlockDispatcher.astro`

**Step 1: Create dispatcher component**

```astro
---
// src/components/content/BlockDispatcher.astro
import type { ContentBlock } from '@modules/articles/types/content-blocks.types';

interface Props {
    block: ContentBlock;
}

const { block } = Astro.props;
---

{block.type === 'paragraph' && <p>{block.text}</p>}
{block.type === 'heading' && <h2>{block.text}</h2>}
{block.type === 'image' && <img src={block.variants?.md?.url} alt={block.alt} />}
{/* ... etc ... */}
```

**Step 2: Simplify ContentRenderer.astro**

Replace the massive if/else chain with:
```astro
---
import BlockDispatcher from './content/BlockDispatcher.astro';
import { z } from 'zod';
import { ContentBlockArraySchema } from '@modules/articles/types/content-blocks.types';

const { content } = Astro.props;
const parsed = ContentBlockArraySchema.safeParse(
    typeof content === 'string' ? JSON.parse(content) : content
);
const blocks = parsed.success ? parsed.data : [];
---

<div class="content-blocks">
    {blocks.map(block => <BlockDispatcher block={block} />)}
</div>
```

**Step 3: Add Zod schema to content-blocks.types.ts**

```typescript
import { z } from 'zod';

export const ParagraphBlockSchema = z.object({
    type: z.literal('paragraph'),
    text: z.string(),
});

// ... schemas for each block type ...

export const ContentBlockSchema = z.discriminatedUnion('type', [
    ParagraphBlockSchema,
    HeadingBlockSchema,
    // ... all block schemas
]);

export const ContentBlockArraySchema = z.array(ContentBlockSchema);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
```

**Step 4: Commit**

```bash
git add src/components/content/BlockDispatcher.astro
git commit -m "feat(renderer): add BlockDispatcher and Zod validation for ContentBlock"
```

---

## Phase 5: Cleanup & Polish

### Task 5.1: Delete dead code

**Files to delete after migration:**
- `src/admin/components/BlockEditor/related-content-context.jsx` (if RelatedContent can use block props too)
- `src/admin/components/BlockEditor/utils/json.ts` (replaced by Zod + native objects)
- Old `conversion.ts` backup (already replaced)

**Step 1: Verify no imports reference deleted files**

Run: `pnpm tsc --noEmit`
Expected: No errors.

**Step 2: Commit**

```bash
git commit -m "chore(blockeditor): remove dead contexts and json utils"
```

---

### Task 5.2: Add round-trip tests for all adapters

**Files:**
- Create: `src/admin/components/BlockEditor/blocks/adapters/__tests__/all-adapters.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { registerAllBlockAdapters } from '../index';
import { getBlockAdapter } from '../BlockAdapter';
import type { ContentBlock } from '../../../../../modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../../types/editor.types';

describe('BlockAdapter round-trip', () => {
    beforeAll(() => registerAllBlockAdapters());

    const testCases: { name: string; dbBlock: ContentBlock }[] = [
        { name: 'paragraph', dbBlock: { type: 'paragraph', text: 'Hello' } },
        { name: 'heading', dbBlock: { type: 'heading', level: 2, text: 'Title' } },
        { name: 'image', dbBlock: { type: 'image', media_id: 1, alt: 'Test', variants: { md: { url: '/test.jpg', width: 300, height: 200 } } } },
        { name: 'faq_section', dbBlock: { type: 'faq_section', title: 'FAQ', items: [{ q: 'Q1', a: 'A1' }] } },
    ];

    for (const { name, dbBlock } of testCases) {
        it(`${name} round-trips correctly`, () => {
            const adapter = getBlockAdapter(name === 'image' ? 'customImage' : name);
            expect(adapter).toBeDefined();

            const editorBlock = adapter!.toEditor(dbBlock as any);
            const backToDb = adapter!.fromEditor(editorBlock as AppBlock);

            expect(backToDb).not.toBeNull();
            expect(backToDb!.type).toBe(dbBlock.type);
        });
    }
});
```

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/adapters/__tests__/all-adapters.test.ts`
Expected: PASS for all block types.

**Step 2: Commit**

```bash
git commit -m "test(blockeditor): add round-trip tests for all block adapters"
```

---

## Migration Checklist

- [ ] Phase 0: BlockNote schema typed
- [ ] Phase 1.1: BlockAdapter interface + registry
- [ ] Phase 1.2: Paragraph adapter + test
- [ ] Phase 1.3: All 13 block adapters created
- [ ] Phase 1.4: conversion.ts replaced with dispatch
- [ ] Phase 2.1: useEditorStateManager extracted
- [ ] Phase 2.2: useLinkToolbar extracted
- [ ] Phase 2.3: useInsertHandle extracted
- [ ] Phase 2.4: useCanvasDragDrop extracted
- [ ] Phase 2.5: index.jsx < 300 lines
- [ ] Phase 3.1: RecipeDataContext removed
- [ ] Phase 3.2: FAQDataContext removed
- [ ] Phase 3.3: RoundupDataContext removed
- [ ] Phase 4.1: DB migration helper for legacy JSON columns
- [ ] Phase 4.2: ContentRenderer uses BlockDispatcher + Zod
- [ ] Phase 5.1: Dead code deleted
- [ ] Phase 5.2: Round-trip tests for all adapters
- [ ] Final: `pnpm tsc --noEmit` passes
- [ ] Final: `pnpm build` passes (ask user before running)

---

*Plan generated from architecture analysis. Execute with subagent-driven-development for maximum safety.*
