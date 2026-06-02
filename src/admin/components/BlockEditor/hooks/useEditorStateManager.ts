import { useEffect, useRef, useState } from 'react';
import type { Block } from '@blocknote/core';
import { flattenBlocks, groupConsecutiveBlocks, getBlockLabel, getBlockIcon } from '../utils/blockHelpers';
import { CUSTOM_BLOCK_TYPES } from '../utils/constants';
import { blocksToContentJson } from '../utils/conversion';
import { buildRoundupJson } from '../blocks/roundup-serialization';
import { getEditorDomElement } from '../utils/editorView';
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
}: EditorStateManagerProps) {
    const onChangeRef = useRef(onChange);
    const onStructureUpdateRef = useRef(onStructureUpdate);
    const onSelectedBlockChangeRef = useRef(onSelectedBlockChange);
    const onRoundupChangeRef = useRef(onRoundupChange);
    const activeBlockIdRef = useRef(activeBlockId);
    const lastSerializedRef = useRef('');
    const lastEmittedValueRef = useRef('');
    const lastRoundupRef = useRef('');
    const lastBlockStructureRef = useRef('');

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

            const blockStructure = flatBlocks.map(({ block }) => `${block.id}:${block.type}`).join('|');
            const shouldSyncBlockAttributes = blockStructure !== lastBlockStructureRef.current;
            lastBlockStructureRef.current = blockStructure;

            const editorDom = shouldSyncBlockAttributes ? getEditorDomElement(editor) : null;
            if (editorDom) {
                const blockIds = new Set(flatBlocks.map(({ block }) => block.id));
                const customIds = new Set(
                    flatBlocks
                        .filter(({ block }) => CUSTOM_BLOCK_TYPES.has(block.type))
                        .map(({ block }) => block.id)
                );

                editorDom.querySelectorAll('[data-id][data-block-root]').forEach((node) => {
                    node.removeAttribute('data-block-root');
                });
                editorDom.querySelectorAll('[data-id][data-custom-block]').forEach((node) => {
                    node.removeAttribute('data-custom-block');
                });

                const escapeSelector = (value: string) => {
                    try { return CSS.escape(value); }
                    catch { return value.replace(/["\\]/g, '\\$&'); }
                };

                const nodesById = new Map<string, Element[]>();
                editorDom.querySelectorAll('[data-id]').forEach((node) => {
                    const id = node.getAttribute('data-id');
                    if (!id || !blockIds.has(id)) return;
                    if (!nodesById.has(id)) nodesById.set(id, []);
                    nodesById.get(id)!.push(node);
                });

                nodesById.forEach((nodes, id) => {
                    const selector = `[data-id="${escapeSelector(id)}"]`;
                    const rootNode = nodes.find((node) => !node.parentElement?.closest(selector)) || nodes[0];
                    if (!rootNode) return;
                    rootNode.setAttribute('data-block-root', 'true');
                    if (customIds.has(id)) {
                        rootNode.setAttribute('data-custom-block', 'true');
                    }
                });
            }

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
