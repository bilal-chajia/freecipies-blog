import type { BlockAdapter } from '../BlockAdapter';
import type { TipBoxBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { normalizeTipVariant } from '../../utils/blockHelpers';
import { extractText, parseInlineMarkdown } from '../../utils/inlineContent';

export const AlertAdapter: BlockAdapter<TipBoxBlock> = {
    type: 'tip_box',

    toEditor(block) {
        return {
            type: 'alert',
            props: {
                type: normalizeTipVariant(block.variant),
                title: block.title || '',
                textAlignment: 'left',
                textColor: 'default',
            },
            content: parseInlineMarkdown(block.text || ''),
        };
    },

    fromEditor(block: AppBlock): TipBoxBlock | null {
        const text = extractText(block.content as any);
        if (!text.trim()) return null;
        const props = block.props as Record<string, unknown>;
        return {
            type: 'tip_box',
            variant: normalizeTipVariant(props.type as string),
            title: props.title ? String(props.title) : undefined,
            text,
        };
    },
};
