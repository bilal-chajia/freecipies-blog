import { useEffect, useRef, useState } from 'react';
import { flattenBlocks } from '../utils/blockHelpers';
import type { AppEditor } from '../schema';
import { useBlockEditorStore } from '../store/blockEditorStore';
import {
    buildStructureItems,
    runBlockValidation,
    emitSerializedContent,
    type StructureItem,
} from './editorStateManager.helpers';

interface EditorStateManagerProps {
    editor: AppEditor | null;
    onChange?: (serialized: string) => void;
    onStructureUpdate?: (info: { items: StructureItem[]; activeBlockId: string | null }) => void;
    onSelectedBlockChange?: (block: Record<string, unknown> | null) => void;
    contentType?: string;
    activeBlockId: string | null;
    /**
     * Shared with useBlockEditorHydration so the hydration echo-guard can
     * recognize the editor's own emitted value and skip re-hydrating it.
     */
    lastEmittedValueRef: React.MutableRefObject<string>;
}

/**
 * Hook that manages editor content change detection,
 * structure synchronization, and content serialization.
 */
export function useEditorStateManager({
    editor,
    onChange,
    onStructureUpdate,
    onSelectedBlockChange,
    contentType,
    activeBlockId,
    lastEmittedValueRef,
}: EditorStateManagerProps) {
    const onChangeRef = useRef(onChange);
    const onStructureUpdateRef = useRef(onStructureUpdate);
    const onSelectedBlockChangeRef = useRef(onSelectedBlockChange);
    const activeBlockIdRef = useRef(activeBlockId);

    const updateStructure = useBlockEditorStore((state) => state.updateStructure);

    const [structureItems, setStructureItems] = useState<StructureItem[]>([]);
    const structureItemsRef = useRef(structureItems);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onStructureUpdateRef.current = onStructureUpdate; }, [onStructureUpdate]);
    useEffect(() => { onSelectedBlockChangeRef.current = onSelectedBlockChange; }, [onSelectedBlockChange]);
    useEffect(() => { activeBlockIdRef.current = activeBlockId; }, [activeBlockId]);
    useEffect(() => { structureItemsRef.current = structureItems; }, [structureItems]);

    // Clean up debounce timeout on unmount or editor change
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [editor]);

    useEffect(() => {
        if (!editor) return;

        const handleChange = () => {
            const blocks = editor.document;
            const flatBlocks = flattenBlocks(blocks);

            // 1. Structure sync (sidebar outline + store).
            const nextItems = buildStructureItems(flatBlocks);
            setStructureItems(nextItems);
            updateStructure(nextItems);

            // 2. Real-time per-block validation (registry-driven).
            runBlockValidation(flatBlocks);

            // data-block-root is emitted declaratively via BlockNote domAttributes
            // (see index.tsx) and data-custom-block is replaced by the CSS
            // :has(.wp-block--custom) selector, so no imperative DOM sync here (PR6).

            const currentActiveBlockId = activeBlockIdRef.current;
            if (onSelectedBlockChangeRef.current && currentActiveBlockId) {
                const activeBlock = flatBlocks.find(({ block }) => block.id === currentActiveBlockId)?.block || null;
                onSelectedBlockChangeRef.current(activeBlock);
            }

            // 3. Debounce the heavy serialization to avoid typing lag.
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            debounceTimeoutRef.current = setTimeout(() => {
                emitSerializedContent({
                    blocks,
                    onChange: onChangeRef.current,
                    lastEmittedValueRef,
                });
            }, 800);
        };

        handleChange();
        const unsubscribe = editor.onEditorContentChange?.(() => {
            handleChange();
        }) as (() => void) | undefined;

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, contentType]);

    useEffect(() => {
        onStructureUpdateRef.current?.({
            items: structureItems,
            activeBlockId,
        });
    }, [structureItems, activeBlockId]);

    return {
        structureItems,
        structureItemsRef,
        lastEmittedValueRef,
    };
}
