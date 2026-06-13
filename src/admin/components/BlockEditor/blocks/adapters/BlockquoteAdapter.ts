import type { BlockAdapter } from '../BlockAdapter';
import type { BlockquoteBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { extractText, parseInlineMarkdown } from '../../utils/inlineContent';

export const BlockquoteAdapter: BlockAdapter<BlockquoteBlock> = {
    type: 'blockquote',

    toEditor(block) {
        return {
            type: 'blockquote',
            props: {
                textAlignment: 'left',
                textColor: 'default',
            },
            content: parseInlineMarkdown(block.text || ''),
        };
    },

    fromEditor(block: AppBlock): BlockquoteBlock | null {
        const text = extractText(block.content as any);
        if (!text.trim()) return null;
        return {
            type: 'blockquote',
            text,
        };
    },
};
