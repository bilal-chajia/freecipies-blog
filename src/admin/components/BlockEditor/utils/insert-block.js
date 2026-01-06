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
        editor.insertBlocks([spec], current, 'after');
        editor.focus();
        return true;
    } catch {
        editor.insertBlocks([{ type: 'paragraph' }], current, 'after');
        editor.focus();
        return false;
    }
};
