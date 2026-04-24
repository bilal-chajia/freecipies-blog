import type { BlockAdapter } from '../BlockAdapter';
import type { FAQSectionBlock, FAQItem } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const FAQAdapter: BlockAdapter<FAQSectionBlock> = {
  type: 'faq_section',

  toEditor(block) {
    return {
      type: 'faqSection',
      props: {
        title: block.title || '',
        itemsJson: JSON.stringify(Array.isArray(block.items) ? block.items : []),
      },
    };
  },

  fromEditor(block: AppBlock): FAQSectionBlock | null {
    const props = block.props as Record<string, unknown>;
    const rawItemsJson = props.itemsJson;
    let items: FAQItem[];

    try {
      const parsed = JSON.parse(typeof rawItemsJson === 'string' ? rawItemsJson : '[]');
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      items = [];
    }

    // Backward compat: also check legacy 'items' prop (pre-Phase 3.2 blocks)
    if (items.length === 0 && props.items) {
      const rawItems = props.items;
      items = Array.isArray(rawItems)
        ? (rawItems as FAQItem[])
        : [];
    }

    if (items.length === 0) return null;

    return {
      type: 'faq_section',
      title: props.title ? String(props.title) : undefined,
      items: items.filter((item) => item && typeof item.q === 'string' && item.q.trim()),
    };
  },
};
