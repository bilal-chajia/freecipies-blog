import { useEffect, useRef, useState } from 'react';
import type { Block } from '@blocknote/core';
import { flattenBlocks, groupConsecutiveBlocks, getBlockLabel, getBlockIcon } from '../utils/blockHelpers';
import { blocksToContentJson } from '../utils/conversion';
import { buildRoundupJson } from '../blocks/roundup-serialization';
import type { AppEditor } from '../schema';
import { useBlockEditorStore } from '../store/blockEditorStore';

type AnyBlock = Block<any, any, any>;

interface BlockItem {
    block: Record<string, unknown>;
    depth: number;
    parentId: string | null;
    itemCount?: number;
}

interface StructureItem {
    id: string;
    type: string;
    depth: number;
    parentId: string | null;
    level?: number;
    label: string;
    icon: any;
}

interface EditorStateManagerProps {
    editor: AppEditor | null;
    onChange?: (serialized: string) => void;
    onStructureUpdate?: (info: { items: StructureItem[]; activeBlockId: string | null }) => void;
    onSelectedBlockChange?: (block: Record<string, unknown> | null) => void;
    contentType?: string;
    onRoundupChange?: (roundupJson: string) => void;
    activeBlockId: string | null;
    /**
     * Shared with useBlockEditorHydration so the hydration echo-guard can
     * recognize the editor's own emitted value and skip re-hydrating it.
     */
    lastEmittedValueRef: React.MutableRefObject<string>;
    lastSerializedRef: React.MutableRefObject<string>;
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
    onRoundupChange,
    activeBlockId,
    lastEmittedValueRef,
    lastSerializedRef,
}: EditorStateManagerProps) {
    const onChangeRef = useRef(onChange);
    const onStructureUpdateRef = useRef(onStructureUpdate);
    const onSelectedBlockChangeRef = useRef(onSelectedBlockChange);
    const onRoundupChangeRef = useRef(onRoundupChange);
    const activeBlockIdRef = useRef(activeBlockId);
    const lastRoundupRef = useRef('');

    const updateStructure = useBlockEditorStore((state) => state.updateStructure);

    const [structureItems, setStructureItems] = useState<StructureItem[]>([]);
    const structureItemsRef = useRef(structureItems);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onStructureUpdateRef.current = onStructureUpdate; }, [onStructureUpdate]);
    useEffect(() => { onSelectedBlockChangeRef.current = onSelectedBlockChange; }, [onSelectedBlockChange]);
    useEffect(() => { onRoundupChangeRef.current = onRoundupChange; }, [onRoundupChange]);
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
            const groupedBlocks = groupConsecutiveBlocks(flatBlocks);
            const nextItems = groupedBlocks.map((item) => ({
                id: item.block.id,
                type: item.block.type,
                depth: item.depth,
                parentId: item.parentId,
                level: (item.block.props as Record<string, unknown> | undefined)?.level as number | undefined,
                label: getBlockLabel(item.block, item.itemCount),
                icon: getBlockIcon(item.block),
            }));
            setStructureItems(nextItems);
            updateStructure(nextItems);

            // --- Real-time Block-level Validation Loop ---
            const storeSetBlockError = useBlockEditorStore.getState().setBlockError;
            const storeClearBlockError = useBlockEditorStore.getState().clearBlockError;

            flatBlocks.forEach(({ block }) => {
                const errors: string[] = [];
                if (block.type === 'video') {
                    const props = block.props as Record<string, unknown>;
                    if (props.url && (!props.provider || !props.videoId)) {
                        errors.push("Invalid video URL. YouTube or Vimeo required.");
                    }
                }
                if (block.type === 'customImage') {
                    const props = block.props as Record<string, unknown>;
                    if (!props.url && !props.mediaId) {
                        errors.push("An image must be uploaded or selected.");
                    }
                }
                if (errors.length > 0) {
                    storeSetBlockError(block.id, errors);
                } else {
                    storeClearBlockError(block.id);
                }
            });

            // data-block-root is emitted declaratively via BlockNote domAttributes
            // (see index.tsx) and data-custom-block is replaced by the CSS
            // :has(.wp-block--custom) selector, so no imperative DOM sync here (PR6).

            const currentActiveBlockId = activeBlockIdRef.current;
            if (onSelectedBlockChangeRef.current && currentActiveBlockId) {
                const activeBlock = flatBlocks.find(({ block }) => block.id === currentActiveBlockId)?.block || null;
                onSelectedBlockChangeRef.current(activeBlock);
            }

            // Debounce the heavy serialization and roundup updates to prevent typing lag
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            debounceTimeoutRef.current = setTimeout(() => {
                if (onChangeRef.current) {
                    const contentJson = blocksToContentJson(blocks);
                    const serialized = JSON.stringify(contentJson, null, 2);
                    if (serialized !== lastEmittedValueRef.current) {
                        lastEmittedValueRef.current = serialized;
                        lastSerializedRef.current = serialized;
                        onChangeRef.current(serialized);
                    }
                }

                 if (contentType === 'roundup' && onRoundupChangeRef.current) {
                    const nextRoundup = buildRoundupJson(flatBlocks.map(({ block }) => block));

                    if (nextRoundup !== lastRoundupRef.current) {
                        lastRoundupRef.current = nextRoundup;
                        onRoundupChangeRef.current(nextRoundup);
                    }
                }
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
        lastSerializedRef,
        lastRoundupRef,
    };
}
