import type { ImageSlot } from '@shared/types/images';

export type BlockId = string;

export interface BaseContentBlock {
  id?: BlockId;
  type: string;
}

export interface ParagraphBlock extends BaseContentBlock {
  type: 'paragraph';
  text: string;
}

export interface HeadingBlock extends BaseContentBlock {
  type: 'heading';
  level: 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface BlockquoteBlock extends BaseContentBlock {
  type: 'blockquote';
  text: string;
}

export interface ListBlock extends BaseContentBlock {
  type: 'list';
  style: 'ordered' | 'unordered' | 'checklist';
  items: string[];
}

export interface ImageBlock extends BaseContentBlock {
  type: 'image';
  image_ref: string;
}

export interface VideoBlock extends BaseContentBlock {
  type: 'video';
  provider: 'youtube' | 'vimeo' | 'self';
  video_id: string;
  aspect_ratio: '16:9' | '4:3' | '1:1' | '9:16';
}

export interface TipBoxBlock extends BaseContentBlock {
  type: 'tip_box';
  variant: 'tip' | 'warning' | 'info' | 'note';
  title?: string;
  text: string;
}

export interface ReservedEmbedBlock extends BaseContentBlock {
  type: 'embed';
  provider: 'instagram' | 'pinterest' | 'tiktok' | 'twitter';
  url: string;
  html?: string;
}

export interface ReservedProductCardBlock extends BaseContentBlock {
  type: 'product_card';
  name: string;
  url: string;
  price?: string;
  image?: ImageSlot;
  affiliate?: boolean;
}

export interface DividerBlock extends BaseContentBlock {
  type: 'divider';
}

export interface ReservedSpacerBlock extends BaseContentBlock {
  type: 'spacer';
  size: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ReservedAdSlotBlock extends BaseContentBlock {
  type: 'ad_slot';
  variant: 'in-content' | 'newsletter' | 'sidebar';
}

export interface TableBlock extends BaseContentBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface BeforeAfterBlock extends BaseContentBlock {
  type: 'before_after';
  layout: 'slider' | 'side_by_side';
  before_image_ref: string;
  after_image_ref: string;
  before_label?: string;
  after_label?: string;
}

export interface ReservedIngredientSpotlightBlock extends BaseContentBlock {
  type: 'ingredient_spotlight';
  name: string;
  description: string;
  image?: ImageSlot;
  tips?: string;
  substitutes?: string[];
  link?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface RelatedContentImageVariant {
  r2_key: string;
  width: number;
  height: number;
  size_bytes?: number;
}

export interface RelatedContentImageSnapshot {
  media_id: number;
  alt: string;
  variants: {
    xs: RelatedContentImageVariant;
    sm: RelatedContentImageVariant;
  };
}

export interface RelatedContentItem {
  article_id: number;
  snapshot: Record<string, unknown>;
}

export interface RelatedContentBlock extends BaseContentBlock {
  type: 'related_content';
  title?: string;
  layout: 'grid' | 'carousel' | 'list';
  limit?: number;
  items: RelatedContentItem[];
}

export interface MainRecipeBlock extends BaseContentBlock {
  type: 'main_recipe';
}

export interface MainRoundupBlock extends BaseContentBlock {
  type: 'main_roundup';
}

export interface MainFaqBlock extends BaseContentBlock {
  type: 'main_faq';
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | BlockquoteBlock
  | ListBlock
  | ImageBlock
  | VideoBlock
  | TipBoxBlock
  | DividerBlock
  | TableBlock
  | BeforeAfterBlock
  | RelatedContentBlock
  | MainRecipeBlock
  | MainRoundupBlock
  | MainFaqBlock;

export type NormalizedContentBlock = ContentBlock & { id: BlockId };

export type ReservedContentBlock =
  | ReservedEmbedBlock
  | ReservedProductCardBlock
  | ReservedSpacerBlock
  | ReservedAdSlotBlock
  | ReservedIngredientSpotlightBlock;

export type EmbedBlock = ReservedEmbedBlock;
export type ProductCardBlock = ReservedProductCardBlock;
export type SpacerBlock = ReservedSpacerBlock;
export type AdSlotBlock = ReservedAdSlotBlock;
export type IngredientSpotlightBlock = ReservedIngredientSpotlightBlock;
export type RelatedArticleCard = RelatedContentItem;

export const CONTENT_BLOCK_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'list',
  'image',
  'video',
  'tip_box',
  'divider',
  'table',
  'before_after',
  'related_content',
  'main_recipe',
  'main_roundup',
  'main_faq',
] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export const RESERVED_CONTENT_BLOCK_TYPES = [
  'embed',
  'product_card',
  'ingredient_spotlight',
  'spacer',
  'ad_slot',
] as const;

export type ReservedContentBlockType = (typeof RESERVED_CONTENT_BLOCK_TYPES)[number];
