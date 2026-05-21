import type { BlockAdapter } from '../BlockAdapter';
import type { MainFaqBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray, parseJsonObject } from '../../utils/json';

type StoredFaqItem = {
  question?: unknown;
  answer?: unknown;
  q?: unknown;
  a?: unknown;
};

function normalizeFaqItems(value: unknown) {
  return parseJsonArray<StoredFaqItem>(value).map((item) => ({
    q: typeof item.q === 'string' ? item.q : typeof item.question === 'string' ? item.question : '',
    a: typeof item.a === 'string' ? item.a : typeof item.answer === 'string' ? item.answer : '',
  }));
}

export const FAQAdapter: BlockAdapter<MainFaqBlock> = {
  type: 'main_faq',

  toEditor(_block, context) {
    const faqs = parseJsonObject<Record<string, unknown>>(context?.faqsJson, {});
    const title = typeof faqs.heading === 'string' && faqs.heading.trim()
      ? faqs.heading
      : 'Frequently Asked Questions';
    const items = normalizeFaqItems(faqs.items);

    return {
      type: 'faqSection',
      props: {
        title,
        itemsJson: JSON.stringify(items),
      },
    };
  },

  fromEditor(_block: AppBlock): MainFaqBlock {
    return {
      ...(typeof _block.id === 'string' ? { id: _block.id } : {}),
      type: 'main_faq',
    };
  },
};
