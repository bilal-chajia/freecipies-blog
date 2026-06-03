import type { BlockNoteEditor, BlockSchema, InlineContentSchema, StyleSchema } from '@blocknote/core';

interface BlockSpec {
    type: string;
    props?: Record<string, any>;
    content?: any;
    children?: any[];
}

const blockTypeMap: Record<string, () => BlockSpec> = {
    paragraph: () => ({ type: 'paragraph' }),
    heading: () => ({ type: 'heading', props: { level: 2 } }),
    list: () => ({ type: 'bulletListItem' }),
    quote: () => ({ type: 'blockquote' }),
    code: () => ({ type: 'codeBlock' }),
    customImage: () => ({ type: 'customImage' }),
    video: () => ({ type: 'video' }),
    beforeAfter: () => ({ type: 'beforeAfter' }),
    alert: () => ({ type: 'alert', props: { type: 'tip' } }),
    faqSection: () => ({ type: 'faqSection' }),
    simpleTable: () => ({ type: 'simpleTable' }),
    relatedContent: () => ({ type: 'relatedContent' }),
    divider: () => ({ type: 'divider' }),
    mainRecipe: () => ({ type: 'mainRecipe' }),
    roundupList: () => ({ type: 'roundupList' }),
};

// Blocks backed by a single article-level document (only one makes sense per
// article). Inserting again focuses the existing block instead of creating a
// duplicate window onto the same data.
// - roundupList -> roundup_json
// - faqSection  -> faqs_json (content_json stores only the main_faq marker)
const SINGLETON_BLOCK_TYPES = new Set(['roundupList', 'faqSection']);

const findBlockByType = (blocks: any[] | undefined, type: string): any | null => {
    if (!Array.isArray(blocks)) return null;
    for (const block of blocks) {
        if (!block) continue;
        if (block.type === type) return block;
        const nested = findBlockByType(block.children, type);
        if (nested) return nested;
    }
    return null;
};

/**
 * Safe Block Insertion Utility
 * 
 * Ensures custom blocks are always inserted at the root level
 * (not nested inside lists, quotes, etc.)
 */
export const safeInsertBlock = (
    editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema> | any, 
    type: string,
    props: Record<string, any> = {}
): void => {
    if (!editor) return;

    if (SINGLETON_BLOCK_TYPES.has(type)) {
        const existing = findBlockByType(editor.document, type);
        if (existing?.id) {
            try {
                editor.setTextCursorPosition(existing.id, 'start');
            } catch {
                // Ignore selection errors if block cannot accept text cursor.
            }
            editor.focus();
            return;
        }
    }

    const currentPos = editor.getTextCursorPosition();
    if (!currentPos) return;

    let targetId = currentPos.block.id;
    let placement = 'after' as const;

    // Find root parent if nested, to ensure custom blocks are at root level
    // This is a requirement for our food blog blocks
    let current = currentPos.block;
    while (current.parentId) {
        const parent = editor.getBlock(current.parentId);
        if (!parent) break;
        current = parent;
        targetId = current.id;
    }

    // Use specific specs if available, otherwise just use type
    const buildSpec = blockTypeMap[type];
    const spec = buildSpec ? buildSpec() : { type, props };
    
    // Merge props if they were provided
    if (Object.keys(props).length > 0) {
        spec.props = { ...(spec.props || {}), ...props };
    }

    try {
        // Detect if we should replace the current block
        // Replaces if:
        // 1. Block is truly empty
        // 2. Block contains the slash trigger or search query
        const isCurrentBlockEmpty = 
            currentPos.block.type === 'paragraph' && 
            (!currentPos.block.content || currentPos.block.content.length === 0);
            
        const isSlashTrigger = 
            currentPos.block.type === 'paragraph' && 
            currentPos.block.content?.some((c: any) => c.type === 'text' && c.text.includes('/'));

        // If we are replacing, we use replaceBlocks, otherwise insert after
        if ((isCurrentBlockEmpty || isSlashTrigger) && currentPos.block.id === targetId) {
            editor.replaceBlocks([targetId], [spec]);
        } else {
            const inserted = editor.insertBlocks([spec], targetId, placement);
            if (inserted?.[0]?.id) {
                editor.setTextCursorPosition(inserted[0].id, 'start');
            }
        }
    } catch (error) {
        console.error(`Failed to insert block of type ${type}:`, error);
        // Fallback to simple paragraph
        editor.insertBlocks([{ type: 'paragraph' }], targetId, placement);
    }
    
    editor.focus();
};

/**
 * Legacy wrapper for backward compatibility if needed by old inserters
 */
export const insertBlockFromInserter = (editor: any, blockType: string): boolean => {
    safeInsertBlock(editor, blockType);
    return true;
};
