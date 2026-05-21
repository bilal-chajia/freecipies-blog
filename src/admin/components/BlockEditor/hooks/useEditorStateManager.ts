import { useEffect, useRef, useState } from 'react';
import { flattenBlocks, groupConsecutiveBlocks, getBlockLabel, getBlockIcon } from '../utils/blockHelpers';
import { CUSTOM_BLOCK_TYPES } from '../utils/constants';
import { blocksToContentJson } from '../utils/conversion';

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
    icon: string;
}

interface EditorStateManagerProps {
    editor: Record<string, unknown> | null;
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
    const lastSerializedRef = useRef('');
    const lastEmittedValueRef = useRef('');
    const lastRoundupRef = useRef('');

    const [structureItems, setStructureItems] = useState<StructureItem[]>([]);
    const structureItemsRef = useRef(structureItems);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { structureItemsRef.current = structureItems; }, [structureItems]);

    useEffect(() => {
        if (!editor) return;

        const handleChange = () => {
            const blocks = (editor as Record<string, unknown[]>).document;
            const flatBlocks = flattenBlocks(blocks);
            const groupedBlocks = groupConsecutiveBlocks(flatBlocks);
            const nextItems = groupedBlocks.map((item) => ({
                id: (item.block as Record<string, string>).id,
                type: (item.block as Record<string, string>).type,
                depth: item.depth,
                parentId: item.parentId,
                level: (item.block as Record<string, Record<string, unknown>>).props?.level as number | undefined,
                label: getBlockLabel(item.block, item.itemCount),
                icon: getBlockIcon(item.block),
            }));
            setStructureItems(nextItems);

            if ((editor as Record<string, HTMLElement | null>).domElement) {
                const blockIds = new Set(flatBlocks.map(({ block }) => (block as Record<string, string>).id));
                const customIds = new Set(
                    flatBlocks
                        .filter(({ block }) => CUSTOM_BLOCK_TYPES.has((block as Record<string, string>).type))
                        .map(({ block }) => (block as Record<string, string>).id)
                );

                (editor as Record<string, HTMLElement>).domElement.querySelectorAll('[data-id][data-block-root]').forEach((node) => {
                    node.removeAttribute('data-block-root');
                });
                (editor as Record<string, HTMLElement>).domElement.querySelectorAll('[data-id][data-custom-block]').forEach((node) => {
                    node.removeAttribute('data-custom-block');
                });

                const escapeSelector = (value: string) => {
                    try { return CSS.escape(value); }
                    catch { return value.replace(/["\\]/g, '\\$&'); }
                };

                const nodesById = new Map<string, Element[]>();
                (editor as Record<string, HTMLElement>).domElement.querySelectorAll('[data-id]').forEach((node) => {
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

            if (onSelectedBlockChange && activeBlockId) {
                const activeBlock = flatBlocks.find(({ block }) => (block as Record<string, string>).id === activeBlockId)?.block || null;
                onSelectedBlockChange(activeBlock);
            }

            if (onChangeRef.current) {
                const contentJson = blocksToContentJson(blocks);
                const serialized = JSON.stringify(contentJson, null, 2);
                if (serialized !== lastEmittedValueRef.current) {
                    lastEmittedValueRef.current = serialized;
                    lastSerializedRef.current = serialized;
                    onChangeRef.current(serialized);
                }
            }
        };

        handleChange();
        const unsubscribe = (editor as Record<string, (cb: () => void) => (() => void) | void>).onEditorContentChange?.(() => {
            handleChange();

            if (contentType === 'roundup' && onRoundupChange) {
                const currentBlocks = (editor as Record<string, unknown[]>).document;
                const flat = flattenBlocks(currentBlocks);
                const itemBlocks = flat
                    .filter(({ block }) => (block as Record<string, string>).type === 'roundupList')
                    .map(({ block }) => block);

                const roundupItems = itemBlocks
                    .flatMap((b) => Array.isArray((b as Record<string, Record<string, unknown>>).props?.items) ? (b as Record<string, Record<string, unknown>>).props.items as unknown[] : [])
                    .map((item: unknown, idx: number) => {
                        const it = item as Record<string, unknown>;
                        return {
                            position: idx + 1,
                            source_type: it.source_type ?? it.sourceType ?? (it.external_url || it.externalUrl ? 'external_recipe' : 'internal_recipe'),
                            article_id: it.article_id ?? null,
                            slug: it.slug ?? '',
                            external_url: it.external_url ?? it.externalUrl ?? '',
                            title: it.title ?? '',
                            subtitle: it.subtitle ?? '',
                            description: it.description ?? '',
                            note: it.note ?? '',
                            image: it.image ?? null,
                            recipe: it.recipe ?? null,
                            rating: it.rating ?? null,
                            author: it.author ?? null,
                            category: it.category ?? null,
                            tags: it.tags ?? [],
                        };
                    });

                const nextRoundup = JSON.stringify({
                    list_type: 'ItemList',
                    items: roundupItems
                }, null, 2);

                if (nextRoundup !== lastRoundupRef.current) {
                    lastRoundupRef.current = nextRoundup;
                    onRoundupChange(nextRoundup);
                }
            }
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor]);

    useEffect(() => {
        onStructureUpdate?.({
            items: structureItems,
            activeBlockId,
        });
    }, [structureItems, activeBlockId, onStructureUpdate]);

    return {
        structureItems,
        structureItemsRef,
        lastEmittedValueRef,
        lastSerializedRef,
        lastRoundupRef,
    };
}
