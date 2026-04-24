import type { BlockAdapter } from '../BlockAdapter';
import type { FAQSectionBlock, FAQItem } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray } from '../../utils/json';

export const FAQAdapter: BlockAdapter<FAQSectionBlock> = {
    type: 'faq_section',

    toEditor(block) {
        return {
            type: 'faqSection',
            props: {
                title: block.title || '',
                items: Array.isArray(block.items) ? block.items : [],
            },
        };
    },

    fromEditor(block: AppBlock): FAQSectionBlock | null {
        const props = block.props as Record<string, unknown>;
        const rawItems = props.items;
        const items: FAQItem[] = Array.isArray(rawItems)
            ? (rawItems as FAQItem[])
            : parseJsonArray<FAQItem>(rawItems);

        if (!Array.isArray(items) || items.length === 0) return null;

        return {
            type: 'faq_section',
            title: props.title ? String(props.title) : undefined,
            items: items.filter((item) => item && typeof item.q === 'string' && item.q.trim()),
        };
    },
};
