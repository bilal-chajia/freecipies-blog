const blockTypeMap = {
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

export const insertBlockFromInserter = (editor, blockType) => {
    if (!editor || !blockType) return false;
    const buildSpec = blockTypeMap[blockType];
    const spec = buildSpec ? buildSpec() : { type: 'paragraph' };
    const current = editor.getTextCursorPosition().block;
    try {
        const inserted = editor.insertBlocks([spec], current, 'after');
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
        return true;
    } catch {
        const inserted = editor.insertBlocks([{ type: 'paragraph' }], current, 'after');
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
        return false;
    }
};
