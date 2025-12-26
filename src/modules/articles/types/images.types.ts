/**
 * Images Types - Complete Structure
 * ===================================
 * TypeScript types for images_json field
 * Matches schema.sql documentation
 */

// ============================================
// Image Variants
// ============================================

export interface ImageVariant {
    /** Public CDN URL */
    url: string;

    /** Width in pixels */
    width: number;

    /** Height in pixels (for CLS prevention) */
    height: number;

    /** File size in bytes (optional) */
    sizeBytes?: number;
}

export interface ImageVariants {
    /** 360px - Budget phones, 1x screens */
    xs?: ImageVariant;

    /** 720px - Phones 2x retina, small tablets */
    sm?: ImageVariant;

    /** 1200px - Tablets, laptops, standard desktop */
    md?: ImageVariant;

    /** 2048px - 4K displays, MacBook Retina */
    lg?: ImageVariant;

    /** Original size - Only if source > 2048px */
    original?: ImageVariant;
}

// ============================================
// Focal Point
// ============================================

export interface FocalPoint {
    /** X position as percentage (0-100) */
    x: number;

    /** Y position as percentage (0-100) */
    y: number;
}

// ============================================
// Image Slot
// ============================================

export interface ImageSlot {
    /** Reference to source Media ID */
    media_id?: number;

    /** SEO / Accessibility text */
    alt?: string;

    /** Visible caption below image */
    caption?: string;

    /** Legal / copyright info */
    credit?: string;

    /** Blurhash/LQIP string (<1KB) */
    placeholder?: string;

    /** Focal point for CSS object-position */
    focal_point?: FocalPoint;

    /** Layout hint (e.g., "16:9", "4:3", "1:1") */
    aspectRatio?: string;

    /** Responsive image variants */
    variants?: ImageVariants;
}

// ============================================
// Images JSON Containers
// ============================================

/**
 * Images JSON for Articles
 */
export interface ArticleImagesJson {
    /** Hero/featured image */
    cover?: ImageSlot;

    /** Card thumbnail (if different from cover) */
    thumbnail?: ImageSlot;

    /** Pinterest-optimized image */
    pinterest?: ImageSlot;

    /** Gallery for step photos etc */
    gallery?: ImageSlot[];
}

/**
 * Images JSON for Authors
 */
export interface AuthorImagesJson {
    /** Profile photo / headshot */
    avatar?: ImageSlot;

    /** Profile page hero background */
    cover?: ImageSlot;

    /** Banner image for author pages */
    banner?: ImageSlot;
}

/**
 * Images JSON for Categories
 */
export interface CategoryImagesJson {
    /** Menu icons / category cards */
    thumbnail?: ImageSlot;

    /** Hero background image */
    cover?: ImageSlot;
}

// ============================================
// Extraction Utilities
// ============================================

/**
 * Extract best available variant URL
 * Prefers lg > md > sm > original > xs
 */
export function getBestVariantUrl(slot: ImageSlot | undefined): string | null {
    if (!slot?.variants) return null;

    const variant =
        slot.variants.lg ||
        slot.variants.md ||
        slot.variants.sm ||
        slot.variants.original ||
        slot.variants.xs;

    return variant?.url || null;
}

/**
 * Get responsive srcset string for <img> element
 */
export function getSrcSet(slot: ImageSlot | undefined): string {
    if (!slot?.variants) return '';

    const entries: string[] = [];
    const v = slot.variants;

    if (v.xs) entries.push(`${v.xs.url} ${v.xs.width}w`);
    if (v.sm) entries.push(`${v.sm.url} ${v.sm.width}w`);
    if (v.md) entries.push(`${v.md.url} ${v.md.width}w`);
    if (v.lg) entries.push(`${v.lg.url} ${v.lg.width}w`);

    return entries.join(', ');
}

/**
 * Get CSS object-position from focal point
 */
export function getFocalPointCss(slot: ImageSlot | undefined): string {
    if (!slot?.focal_point) return '50% 50%';
    return `${slot.focal_point.x}% ${slot.focal_point.y}%`;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_FOCAL_POINT: FocalPoint = { x: 50, y: 50 };

export const DEFAULT_IMAGES_JSON: ArticleImagesJson = {};
