import type { BlockAdapter } from '../BlockAdapter';
import type { ParagraphBlock } from '../../../../../modules/articles/types/content-blocks.types';
import { parseInlineMarkdown, extractText } from '../../utils/inlineContent';
import type { AppBlock } from '../../types/editor.types';

export const ParagraphAdapter: BlockAdapter<ParagraphBlock> = {
    type: 'paragraph',

    toEditor(block) {
        return {
            type: 'paragraph',
            content: parseInlineMarkdown(block.text || ''),
        };
    },

    fromEditor(block: AppBlock): ParagraphBlock | null {
        const text = extractText(block.content as any);
        if (!text.trim()) return null;
        return { type: 'paragraph', text };
    },
};
