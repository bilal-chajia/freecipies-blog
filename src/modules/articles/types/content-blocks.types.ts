/**
 * Compatibility export for the canonical content_json contract.
 *
 * New code should import from `@modules/content-blocks`. This file remains so
 * older admin adapters and article services can move gradually without changing
 * every import in the same refactor.
 */
export type {
  AdSlotBlock,
  BeforeAfterBlock,
  BeforeAfterImage,
  BlockId,
  BlockquoteBlock,
  ContentBlock,
  ContentBlockType,
  DividerBlock,
  EmbedBlock,
  FAQItem,
  FAQSectionBlock,
  HeadingBlock,
  ImageBlock,
  IngredientSpotlightBlock,
  ListBlock,
  MainRecipeBlock,
  NormalizedContentBlock,
  ParagraphBlock,
  ProductCardBlock,
  RelatedArticleCard,
  RelatedContentBlock,
  RoundupItemPlaceholderBlock,
  SpacerBlock,
  TableBlock,
  TipBoxBlock,
  VideoBlock,
} from '@modules/content-blocks';

export {
  CONTENT_BLOCK_TYPES,
  extractFAQsFromContentDocument,
  extractTocFromContentDocument,
  normalizeContentDocument,
  serializeContentDocument,
  slugifyHeading as slugify,
} from '@modules/content-blocks';

import { slugifyHeading } from '@modules/content-blocks';

export { extractFAQsFromContentDocument as extractFAQs } from '@modules/content-blocks';

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3 | 4 | 5 | 6;
}

export function isHeadingBlock(block: import('@modules/content-blocks').ContentBlock): block is import('@modules/content-blocks').HeadingBlock {
  return block.type === 'heading';
}

export function isFAQSectionBlock(block: import('@modules/content-blocks').ContentBlock): block is import('@modules/content-blocks').FAQSectionBlock {
  return block.type === 'faq_section';
}

export function isImageBlock(block: import('@modules/content-blocks').ContentBlock): block is import('@modules/content-blocks').ImageBlock {
  return block.type === 'image';
}

export function extractHeadings(content: import('@modules/content-blocks').ContentBlock[]): import('@modules/content-blocks').HeadingBlock[] {
  return content.filter(isHeadingBlock);
}

export function generateTOC(content: import('@modules/content-blocks').ContentBlock[]): TocItem[] {
  return content
    .filter(isHeadingBlock)
    .map((heading) => ({
      id: heading.id || slugifyHeading(heading.text),
      text: heading.text,
      level: heading.level,
    }));
}
