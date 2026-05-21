import type { BlockAdapter } from '../BlockAdapter';
import type { MainRoundupBlock } from '@modules/articles/types/content-blocks.types';

export const RoundupListAdapter: BlockAdapter<MainRoundupBlock> = {
    type: 'main_roundup',

    toEditor() {
        return {
            type: 'roundupList',
            props: {
                showStats: true,
            },
        };
    },

    fromEditor(): MainRoundupBlock {
        return {
            type: 'main_roundup',
        };
    },
};
