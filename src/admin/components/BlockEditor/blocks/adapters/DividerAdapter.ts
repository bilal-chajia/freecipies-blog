import type { BlockAdapter } from '../BlockAdapter';
import type { DividerBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const DividerAdapter: BlockAdapter<DividerBlock> = {
    type: 'divider',

    toEditor() {
        return {
            type: 'divider',
            props: {
                style: 'solid',
            },
        };
    },

    fromEditor(block: AppBlock): DividerBlock | null {
        return { type: 'divider' };
    },
};
