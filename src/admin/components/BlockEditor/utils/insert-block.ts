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
    recipeEmbed: () => ({ type: 'recipeEmbed' }),
};

export const insertBlockFromInserter = (
    editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema> | any, 
    blockType: string
): boolean => {
    if (!editor || !blockType) return false;
    const buildSpec = blockTypeMap[blockType];
    const spec = buildSpec ? buildSpec() : { type: 'paragraph' };
    const selection = (editor as any).getTextCursorPosition();
    const current = selection?.block;
    
    try {
        const inserted = (editor as any).insertBlocks([spec], current, 'after');
        if (inserted?.[0]?.id) {
            (editor as any).setTextCursorPosition(inserted[0].id, 'start');
        }
        (editor as any).focus();
        return true;
    } catch {
        const inserted = (editor as any).insertBlocks([{ type: 'paragraph' }], current, 'after');
        if (inserted?.[0]?.id) {
            (editor as any).setTextCursorPosition(inserted[0].id, 'start');
        }
        (editor as any).focus();
        return false;
    }
};
