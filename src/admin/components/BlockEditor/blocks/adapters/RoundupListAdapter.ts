import type { BlockAdapter } from '../BlockAdapter';
import type { MainRoundupBlock } from '@modules/articles/types/content-blocks.types';
import { parseJsonObject, parseJsonArray } from '../../utils/json';

export const RoundupListAdapter: BlockAdapter<MainRoundupBlock> = {
    type: 'main_roundup',

    toEditor(_block, context) {
        const roundup = parseJsonObject<Record<string, unknown>>(context?.roundup_json, {});
        const items = parseJsonArray(roundup.items);
        const groupTitle = typeof roundup.group_title === 'string' ? roundup.group_title : '';
        const groupDescription = typeof roundup.group_description === 'string' ? roundup.group_description : '';
        return {
            type: 'roundupList',
            props: {
                title: groupTitle,
                description: groupDescription,
                showStats: roundup.show_stats !== false,
                itemsJson: JSON.stringify(items),
            },
        };
    },

    fromEditor(): MainRoundupBlock {
        return {
            type: 'main_roundup',
        };
    },
};
