import type { BlockAdapter } from '../BlockAdapter';
import type { MainFaqBlock } from '@modules/articles/types/content-blocks.types';

export const FAQAdapter: BlockAdapter<MainFaqBlock> = {
  type: 'main_faq',

  toEditor() {
    return {
      type: 'faqSection',
      props: {},
    };
  },

  fromEditor(): MainFaqBlock {
    return {
      type: 'main_faq',
    };
  },
};
