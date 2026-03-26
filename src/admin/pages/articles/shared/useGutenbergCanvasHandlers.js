import { useCallback, useState } from 'react';

const DEFAULT_SINGLETON_BLOCK_TYPES = ['roundupList'];

// Custom blocks that don't support setTextCursorPosition
const CUSTOM_BLOCK_TYPES = new Set([
    'title', 'headline', 'customImage', 'alert', 'divider',
    'faqSection', 'beforeAfter', 'simpleTable', 'video',
    'recipeEmbed', 'relatedContent', 'featuredImage', 'mainRecipe', 'roundupList',
]);

export function useGutenbergCanvasHandlers(editorInstance, options = {}) {
    const { smoothScrollOnSelect = false, singletonBlockTypes = DEFAULT_SINGLETON_BLOCK_TYPES } = options;
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [structureItems, setStructureItems] = useState([]);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const [forceSelectBlockId, setForceSelectBlockId] = useState(null);

    const handleStructureUpdate = useCallback(({ items, activeBlockId: nextActiveId }) => {
        setStructureItems(items || []);
        setActiveBlockId(nextActiveId || null);
    }, []);

    const handleSelectStructureBlock = useCallback((blockId) => {
        if (!blockId || !editorInstance) return;

        const block = editorInstance.getBlock(blockId) || null;
        const isCustom = block && CUSTOM_BLOCK_TYPES.has(block.type);

        if (isCustom) {
            // Custom blocks don't support setTextCursorPosition — it would
            // land the cursor on a nearby text block (like a heading).
            // Use forceSelectBlockId to tell BlockEditor to select it directly.
            setForceSelectBlockId(blockId);
            setSelectedBlock(block);
        } else {
            // Text blocks: use cursor-based selection which triggers onSelectionChange
            editorInstance.focus();
            editorInstance.setTextCursorPosition(blockId, 'start');
            setSelectedBlock(block);
        }

        // Scroll to the block
        setTimeout(() => {
            const el = document.querySelector(`[data-id="${blockId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }, [editorInstance]);

    const handleReorderBlock = useCallback((draggedId, targetId, position) => {
        if (!editorInstance || !draggedId || !targetId) return;
        const dragged = structureItems.find((item) => item.id === draggedId);
        const target = structureItems.find((item) => item.id === targetId);
        if (!dragged || !target) return;
        if (dragged.parentId !== target.parentId) return;

        const siblings = structureItems
            .filter((item) => item.parentId === dragged.parentId)
            .map((item) => item.id);
        const fromIndex = siblings.indexOf(draggedId);
        const targetIndex = siblings.indexOf(targetId);
        if (fromIndex < 0 || targetIndex < 0) return;
        let desiredIndex = targetIndex + (position === 'after' ? 1 : 0);
        if (fromIndex < targetIndex) desiredIndex -= 1;
        desiredIndex = Math.max(0, Math.min(siblings.length - 1, desiredIndex));
        let steps = desiredIndex - fromIndex;
        editorInstance.setTextCursorPosition(draggedId, 'start');
        while (steps < 0) {
            editorInstance.moveBlocksUp();
            steps += 1;
        }
        while (steps > 0) {
            editorInstance.moveBlocksDown();
            steps -= 1;
        }
        editorInstance.focus();
    }, [editorInstance, structureItems]);

    const handleBlockAction = useCallback((action, blockId) => {
        if (!editorInstance || !blockId) return;
        switch (action) {
            case 'delete':
                editorInstance.removeBlocks([blockId]);
                break;
            case 'duplicate': {
                const block = editorInstance.getBlock(blockId);
                if (!block) return;
                if (singletonBlockTypes.includes(block.type)) {
                    editorInstance.setTextCursorPosition(blockId, 'start');
                    editorInstance.focus();
                    return;
                }
                const { type, props, content, children } = block;
                editorInstance.insertBlocks([{ type, props, content, children }], blockId, 'after');
                break;
            }
            case 'add-before':
                editorInstance.insertBlocks([{ type: 'paragraph' }], blockId, 'before');
                break;
            case 'add-after':
                editorInstance.insertBlocks([{ type: 'paragraph' }], blockId, 'after');
                break;
            default:
                break;
        }
        editorInstance.focus();
    }, [editorInstance, singletonBlockTypes]);

    const handleConvertBlock = useCallback((blockId, next) => {
        if (!editorInstance || !blockId || !next) return;
        const block = editorInstance.getBlock(blockId);
        if (!block) return;
        if (next.type === 'heading') {
            editorInstance.updateBlock(block, {
                type: 'heading',
                props: { level: next.level || 2 },
                content: block.content,
            });
        } else if (next.type === 'paragraph') {
            editorInstance.updateBlock(block, {
                type: 'paragraph',
                content: block.content,
            });
        }
        editorInstance.focus();
    }, [editorInstance]);

    return {
        selectedBlock,
        setSelectedBlock,
        structureItems,
        activeBlockId,
        forceSelectBlockId,
        handleStructureUpdate,
        handleSelectStructureBlock,
        handleReorderBlock,
        handleBlockAction,
        handleConvertBlock,
    };
}
