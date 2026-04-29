import type { BlockAdapter } from '../BlockAdapter';
import type { FAQSectionBlock, FAQItem } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

function normalizeFAQItem(item: unknown): FAQItem | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const record = item as Record<string, unknown>;
  const question = typeof record.question === 'string' ? record.question : typeof record.q === 'string' ? record.q : '';
  const answer = typeof record.answer === 'string' ? record.answer : typeof record.a === 'string' ? record.a : '';
  if (!question.trim() || !answer.trim()) return null;
  return { question, answer };
}

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

    const normalizedItems = items
      .map(normalizeFAQItem)
      .filter((item): item is FAQItem => Boolean(item));

    if (normalizedItems.length === 0) return null;

    return {
      type: 'faq_section',
      title: props.title ? String(props.title) : undefined,
      items: normalizedItems,
    };
  },
};
