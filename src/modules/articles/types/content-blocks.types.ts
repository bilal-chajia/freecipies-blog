/**
 * Content Block Types
 * =====================
 * TypeScript types for content_json blocks
 * Discriminated union for all 20+ block types
 */

import type { ImageSlot, ImageVariants } from './images.types';

// ============================================
// TEXT BLOCKS
// ============================================

export interface ParagraphBlock {
    type: 'paragraph';
    /** Markdown-enabled text content */
    text: string;
}

export interface HeadingBlock {
    type: 'heading';
    /** Heading level (H1 reserved for headline) */
    level: 2 | 3 | 4;
    /** Heading text */
    text: string;
    /** Auto-generated anchor ID */
    id?: string;
}

export interface BlockquoteBlock {
    type: 'blockquote';
    /** Quote text (Markdown enabled) */
    text: string;
    /** Attribution / source */
    cite?: string;
}

export interface ListBlock {
    type: 'list';
    /** List style */
    style: 'ordered' | 'unordered' | 'checklist';
    /** List items (Markdown enabled) */
    items: string[];
}

// ============================================
// MEDIA BLOCKS
// ============================================

export interface ImageBlock {
    type: 'image';
    /** Reference to media table */
    media_id: number;
    /** Alt text */
    alt: string;
    /** Optional caption */
    caption?: string;
    /** Display size */
    size: 'full' | 'medium' | 'small';
    /** Responsive variants */
    variants?: ImageVariants;
}

export interface GalleryImage {
    media_id: number;
    alt: string;
    variants?: ImageVariants;
}

export interface GalleryBlock {
    type: 'gallery';
    /** Gallery layout style */
    layout: 'grid' | 'carousel' | 'masonry';
    /** Images in gallery */
    images: GalleryImage[];
}

export interface VideoBlock {
    type: 'video';
    /** Video platform */
    provider: 'youtube' | 'vimeo' | 'self';
    /** Video ID */
    videoId: string;
    /** Poster/thumbnail image */
    poster?: ImageSlot;
    /** Display aspect ratio */
    aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
}

// ============================================
// CALLOUT BLOCKS
// ============================================

export interface TipBoxBlock {
    type: 'tip_box';
    /** Visual style/severity */
    variant: 'tip' | 'warning' | 'info' | 'note';
    /** Optional heading */
    title?: string;
    /** Content (Markdown enabled) */
    text: string;
}

export interface CTAButtonBlock {
    type: 'cta_button';
    /** Button text */
    text: string;
    /** Link URL */
    url: string;
    /** Button style */
    style: 'primary' | 'secondary' | 'outline';
}

// ============================================
// EMBED BLOCKS
// ============================================

export interface EmbedBlock {
    type: 'embed';
    /** Social platform */
    provider: 'instagram' | 'pinterest' | 'tiktok' | 'twitter';
    /** Original URL */
    url: string;
    /** Pre-rendered HTML (for SSR) */
    html?: string;
}

export interface RecipeCardBlock {
    type: 'recipe_card';
    /** Internal article/recipe ID */
    article_id: number;
    /** Cached headline */
    headline: string;
    /** Cached cover image */
    cover?: ImageSlot;
}

export interface ProductCardBlock {
    type: 'product_card';
    /** Product name */
    name: string;
    /** Affiliate/product URL */
    url: string;
    /** Price display */
    price?: string;
    /** Product image */
    image?: ImageSlot;
    /** Is affiliate link */
    affiliate?: boolean;
}

// ============================================
// LAYOUT BLOCKS
// ============================================

export interface DividerBlock {
    type: 'divider';
}

export interface SpacerBlock {
    type: 'spacer';
    /** Spacing size */
    size: 'sm' | 'md' | 'lg' | 'xl';
}

export interface AdSlotBlock {
    type: 'ad_slot';
    /** Ad placement type */
    variant: 'in-content' | 'newsletter' | 'sidebar';
}

export interface TableBlock {
    type: 'table';
    /** Column headers */
    headers: string[];
    /** Table rows */
    rows: string[][];
}

// ============================================
// FOOD BLOG BLOCKS
// ============================================

export interface BeforeAfterImage {
    media_id: number;
    alt: string;
    label?: string;
    variants?: ImageVariants;
}

export interface BeforeAfterBlock {
    type: 'before_after';
    /** Comparison layout */
    layout: 'slider' | 'side_by_side';
    /** Before image */
    before: BeforeAfterImage;
    /** After image */
    after: BeforeAfterImage;
}

export interface IngredientSpotlightBlock {
    type: 'ingredient_spotlight';
    /** Ingredient name */
    name: string;
    /** Description text */
    description: string;
    /** Ingredient image */
    image?: ImageSlot;
    /** Usage tips */
    tips?: string;
    /** Substitutes list */
    substitutes?: string[];
    /** Internal link to ingredient page */
    link?: string;
}

export interface FAQItem {
    /** Question */
    q: string;
    /** Answer (Markdown enabled) */
    a: string;
}

export interface FAQSectionBlock {
    type: 'faq_section';
    /** Optional section title */
    title?: string;
    /** FAQ items */
    items: FAQItem[];
}

export interface RelatedArticleCard {
    id: number;
    slug: string;
    headline: string;
    thumbnail?: ImageSlot;
    total_time?: number;
    difficulty?: string;
    reading_time?: number;
    item_count?: number;
}

export interface RelatedContentBlock {
    type: 'related_content';
    /** Section heading */
    title?: string;
    /** Display layout */
    layout: 'grid' | 'carousel' | 'list';
    /** Related recipes */
    recipes?: RelatedArticleCard[];
    /** Related articles */
    articles?: RelatedArticleCard[];
    /** Related roundups */
    roundups?: RelatedArticleCard[];
}

// ============================================
// DISCRIMINATED UNION
// ============================================

export type ContentBlock =
    // Text
    | ParagraphBlock
    | HeadingBlock
    | BlockquoteBlock
    | ListBlock
    // Media
    | ImageBlock
    | GalleryBlock
    | VideoBlock
    // Callouts
    | TipBoxBlock
    | CTAButtonBlock
    // Embeds
    | EmbedBlock
    | RecipeCardBlock
    | ProductCardBlock
    // Layout
    | DividerBlock
    | SpacerBlock
    | AdSlotBlock
    | TableBlock
    // Food Blog
    | BeforeAfterBlock
    | IngredientSpotlightBlock
    | FAQSectionBlock
    | RelatedContentBlock;

// ============================================
// Type Guards
// ============================================

export function isHeadingBlock(block: ContentBlock): block is HeadingBlock {
    return block.type === 'heading';
}

export function isFAQSectionBlock(block: ContentBlock): block is FAQSectionBlock {
    return block.type === 'faq_section';
}

export function isImageBlock(block: ContentBlock): block is ImageBlock {
    return block.type === 'image';
}

export function isGalleryBlock(block: ContentBlock): block is GalleryBlock {
    return block.type === 'gallery';
}

// ============================================
// Utilities
// ============================================

/**
 * Extract all headings from content for TOC generation
 */
export function extractHeadings(content: ContentBlock[]): HeadingBlock[] {
    return content.filter(isHeadingBlock);
}

/**
 * Extract all FAQ items from content for JSON-LD
 */
export function extractFAQs(content: ContentBlock[]): FAQItem[] {
    return content
        .filter(isFAQSectionBlock)
        .flatMap(block => block.items);
}

/**
 * Slugify text for anchor IDs
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Generate TOC from content blocks
 */
export interface TocItem {
    id: string;
    text: string;
    level: 2 | 3 | 4;
}

export function generateTOC(content: ContentBlock[]): TocItem[] {
    return extractHeadings(content).map(heading => ({
        id: heading.id || slugify(heading.text),
        text: heading.text,
        level: heading.level,
    }));
}
