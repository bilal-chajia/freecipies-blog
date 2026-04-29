import { useEffect, useRef, useState } from 'react';
import { flattenBlocks, groupConsecutiveBlocks, getBlockLabel, getBlockIcon } from '../utils/blockHelpers';
import { CUSTOM_BLOCK_TYPES } from '../utils/constants';
import { blocksToContentJson } from '../utils/conversion';

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
}) {
    const onChangeRef = useRef(onChange);
    const lastSerializedRef = useRef('');
    const lastEmittedValueRef = useRef('');
    const lastRoundupRef = useRef('');

    const [structureItems, setStructureItems] = useState([]);
    const structureItemsRef = useRef(structureItems);

    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { structureItemsRef.current = structureItems; }, [structureItems]);

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
                level: item.block.props?.level,
                label: getBlockLabel(item.block, item.itemCount),
                icon: getBlockIcon(item.block),
            }));
            setStructureItems(nextItems);

            if (editor.domElement) {
                const blockIds = new Set(flatBlocks.map(({ block }) => block.id));
                const customIds = new Set(
                    flatBlocks
                        .filter(({ block }) => CUSTOM_BLOCK_TYPES.has(block.type))
                        .map(({ block }) => block.id)
                );

                editor.domElement.querySelectorAll('[data-id][data-block-root]').forEach((node) => {
                    node.removeAttribute('data-block-root');
                });
                editor.domElement.querySelectorAll('[data-id][data-custom-block]').forEach((node) => {
                    node.removeAttribute('data-custom-block');
                });

                const escapeSelector = (value) => {
                    try { return CSS.escape(value); }
                    catch { return value.replace(/["\\]/g, '\\$&'); }
                };

                const nodesById = new Map();
                editor.domElement.querySelectorAll('[data-id]').forEach((node) => {
                    const id = node.getAttribute('data-id');
                    if (!id || !blockIds.has(id)) return;
                    if (!nodesById.has(id)) nodesById.set(id, []);
                    nodesById.get(id).push(node);
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
                const activeBlock = flatBlocks.find(({ block }) => block.id === activeBlockId)?.block || null;
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
        const unsubscribe = editor.onEditorContentChange(() => {
            handleChange();

            if (contentType === 'roundup' && onRoundupChange) {
                const currentBlocks = editor.document;
                const flat = flattenBlocks(currentBlocks);
                const itemBlocks = flat
                    .filter(({ block }) => block.type === 'roundupList')
                    .map(({ block }) => block);

                const roundupItems = itemBlocks
                    .flatMap((b) => Array.isArray(b.props?.items) ? b.props.items : [])
                    .map((item, idx) => ({
                        position: idx + 1,
                        article_id: item.article_id ?? item.articleId ?? null,
                        external_url: item.external_url ?? item.externalUrl ?? '',
                        title: item.title ?? '',
                        subtitle: item.subtitle ?? '',
                        note: item.note ?? '',
                        cover: item.cover ?? null,
                    }));

                const nextRoundup = JSON.stringify({
                    listType: 'ItemList',
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
