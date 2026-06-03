import { useCallback, useState } from 'react';

const DEFAULT_SINGLETON_BLOCK_TYPES = ['roundupList'];

// Custom blocks that don't support setTextCursorPosition
const CUSTOM_BLOCK_TYPES = new Set([
    'customImage', 'alert', 'divider',
    'faqSection', 'beforeAfter', 'simpleTable', 'video',
    'relatedContent', 'mainRecipe', 'roundupList',
]);

interface EditorBlock {
    id: string;
    type: string;
    props?: Record<string, unknown>;
    content?: unknown;
    children?: EditorBlock[];
}

interface EditorInstance {
    getBlock: (id: string) => EditorBlock | undefined;
    focus: () => void;
    setTextCursorPosition: (id: string, pos: string) => void;
    removeBlocks: (ids: string[]) => void;
    insertBlocks: (blocks: unknown[], refId: string, pos: string) => void;
    updateBlock: (block: EditorBlock, updates: Record<string, unknown>) => void;
    moveBlocksUp: () => void;
    moveBlocksDown: () => void;
}

interface StructureItem {
    id: string;
    parentId: string | null;
    [key: string]: unknown;
}

interface GutenbergOptions {
    smoothScrollOnSelect?: boolean;
    singletonBlockTypes?: string[];
}

interface ConvertTarget {
    type: string;
    level?: number;
}

export function useGutenbergCanvasHandlers(
    editorInstance: EditorInstance | null,
    options: GutenbergOptions = {}
) {
    const { singletonBlockTypes = DEFAULT_SINGLETON_BLOCK_TYPES } = options;
    const [selectedBlock, setSelectedBlock] = useState<EditorBlock | null>(null);
    const [structureItems, setStructureItems] = useState<StructureItem[]>([]);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [forceSelectBlockId, setForceSelectBlockId] = useState<string | null>(null);

    const handleStructureUpdate = useCallback(({ items, activeBlockId: nextActiveId }: { items: StructureItem[]; activeBlockId: string | null }) => {
        setStructureItems(items || []);
        setActiveBlockId(nextActiveId || null);
    }, []);

    const handleClearForceSelect = useCallback(() => {
        setForceSelectBlockId(null);
    }, []);

    const handleSelectStructureBlock = useCallback((blockId: string) => {
        if (!blockId || !editorInstance) return;

        const block = editorInstance.getBlock(blockId) || null;
        const isCustom = block && CUSTOM_BLOCK_TYPES.has(block.type);

        if (isCustom) {
            setForceSelectBlockId(blockId);
            setSelectedBlock(block);
        } else {
            editorInstance.focus();
            editorInstance.setTextCursorPosition(blockId, 'start');
            setSelectedBlock(block);
        }

        setTimeout(() => {
            const el = document.querySelector(`[data-id="${blockId}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }, [editorInstance]);

    const handleReorderBlock = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
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

    const handleBlockAction = useCallback((action: string, blockId: string) => {
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

    const handleConvertBlock = useCallback((blockId: string, next: ConvertTarget) => {
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
        handleClearForceSelect,
        handleReorderBlock,
        handleBlockAction,
        handleConvertBlock,
    };
}
