/**
 * Unified Image Types
 * ====================
 * Single source of truth for all image-related types in the project.
 * 
 * USAGE:
 * - Frontend/Consumer code: Use ImageVariant, ImageSlot, ImagesJson
 * - Media storage code: Use StorageVariant, MediaVariantsJson
 * 
 * NAMING CONVENTION:
 * - TypeScript: camelCase (mediaId, sizeBytes)
 * - Database JSON: snake_case (media_id, size_bytes)
 * - Transform at API boundary layer
 */

// ============================================
// PUBLIC TYPES (Consumer-facing)
// ============================================

/**
 * Single responsive image variant
 * Used for srcset generation and display
 */
export interface ImageVariant {
    /** Public CDN URL */
    url: string;

    /** Width in pixels */
    width: number;

    /** Height in pixels (for CLS prevention) */
    height: number;

    /** File size in bytes (optional, for admin display) */
    sizeBytes?: number;
}

/**
 * Collection of responsive variants
 * Standard breakpoints: xs(360), sm(720), md(1200), lg(2048)
 */
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

/**
 * Focal point for CSS object-position
 */
export interface FocalPoint {
    /** X position as percentage (0-100) */
    x: number;

    /** Y position as percentage (0-100) */
    y: number;
}

/**
 * Single image slot with metadata
 * Used in images_json for cover, thumbnail, avatar, etc.
 */
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

    // Legacy fields for backwards compatibility (deprecated, use variants instead)
    /** @deprecated Use variants.lg.url instead */
    url?: string;
    /** @deprecated Use variants.lg.width instead */
    width?: number;
    /** @deprecated Use variants.lg.height instead */
    height?: number;
}

/**
 * Images JSON container for articles
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
 * Images JSON container for authors
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
 * Images JSON container for categories
 */
export interface CategoryImagesJson {
    /** Menu icons / category cards */
    thumbnail?: ImageSlot;

    /** Hero background image */
    cover?: ImageSlot;
}

/**
 * Union type for all images_json containers
 */
export type ImagesJson = ArticleImagesJson | AuthorImagesJson | CategoryImagesJson;

/**
 * Valid slot names for extraction
 */
export type ImageSlotName = 'cover' | 'thumbnail' | 'avatar' | 'banner' | 'pinterest';

// ============================================
// STORAGE TYPES (Media module internal)
// ============================================

/**
 * Storage variant with R2 key (internal use only)
 * Never expose r2_key to frontend consumers
 */
export interface StorageVariant extends ImageVariant {
    /** R2 bucket key for file operations */
    r2_key: string;
}

/**
 * Storage variants collection
 */
export interface StorageVariants {
    xs?: StorageVariant;
    sm?: StorageVariant;
    md?: StorageVariant;
    lg?: StorageVariant;
    original?: StorageVariant;
}

/**
 * Media table variants_json structure
 * This is what gets stored in media.variants_json column
 */
export interface MediaVariantsJson {
    /** All responsive variants with R2 keys */
    variants: StorageVariants;

    /** Base64 LQIP placeholder */
    placeholder?: string;
}

// ============================================
// CONTENT BLOCK TYPES
// ============================================

/**
 * Image block in content_json
 * Per schema.sql content_json specification
 */
export interface ContentImageBlock {
    type: 'image';
    media_id: number | null;
    alt: string;
    caption?: string;
    size: 'full' | 'medium' | 'small';
    variants: ImageVariants;
}

// ============================================
// UTILITY FUNCTIONS
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

/**
 * Strip storage keys from variants (for API responses)
 */
export function stripStorageKeys(storageVariants: StorageVariants): ImageVariants {
    const result: ImageVariants = {};

    for (const [key, variant] of Object.entries(storageVariants)) {
        if (variant) {
            const { r2_key, ...publicVariant } = variant;
            result[key as keyof ImageVariants] = publicVariant;
        }
    }

    return result;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_FOCAL_POINT: FocalPoint = { x: 50, y: 50 };

export const DEFAULT_IMAGES_JSON: ArticleImagesJson = {};
