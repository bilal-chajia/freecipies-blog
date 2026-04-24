import type { BlockAdapter } from '../BlockAdapter';
import type { HeadingBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const HeadingAdapter: BlockAdapter<HeadingBlock> = {
    type: 'heading',

    toEditor(block) {
        return {
            type: 'heading',
            props: {
                level: block.level,
                textAlignment: 'left',
                textColor: 'default',
            },
            content: block.text || '',
        };
    },

    fromEditor(block: AppBlock): HeadingBlock | null {
        const text = typeof block.content === 'string'
            ? block.content
            : Array.isArray(block.content)
                ? block.content.map((c: any) => c?.text || '').join('')
                : '';
        const level = (block.props as any)?.level || 2;
        if (!text.trim()) return null;
        return {
            type: 'heading',
            level: Math.max(2, Math.min(6, level)) as 2 | 3 | 4 | 5 | 6,
            text,
        };
    },
};
