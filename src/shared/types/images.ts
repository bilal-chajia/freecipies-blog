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
// PARSING HELPERS (for API/DB responses)
// ============================================

/**
 * Parse variants JSON from API or DB response
 * Handles both string and object formats
 * @param item - Object with variants_json or variantsJson property
 * @returns Parsed MediaVariantsJson or null
 */
export function parseVariantsJson(item: { variants_json?: string; variantsJson?: string } | null | undefined): MediaVariantsJson | null {
    if (!item) return null;
    const json = item.variants_json || item.variantsJson;
    if (!json) return null;
    if (typeof json === 'object') return json as MediaVariantsJson;
    try {
        return JSON.parse(json) as MediaVariantsJson;
    } catch {
        return null;
    }
}

/**
 * Extract variants map from parsed JSON
 * Handles nested { variants: {...} } structure from DB
 * @param parsed - Parsed variants JSON or raw variants object
 * @returns ImageVariants object
 */
export function getVariantMap(parsed: MediaVariantsJson | ImageVariants | null | undefined): ImageVariants {
    if (!parsed || typeof parsed !== 'object') return {};
    // DB schema stores { variants: {...}, placeholder: "..." }
    if ('variants' in parsed && parsed.variants && typeof parsed.variants === 'object') {
        return parsed.variants as ImageVariants;
    }
    // Already a flat variants object
    return parsed as ImageVariants;
}

/**
 * Get the best available variant from variants object
 * Prefers xs > sm for thumbnails (smallest usable)
 * @param variants - ImageVariants or MediaVariantsJson
 * @returns Best variant or null
 */
export function getBestVariant(variants: ImageVariants | MediaVariantsJson | null | undefined): ImageVariant | null {
    const map = getVariantMap(variants as MediaVariantsJson);
    if (!map) return null;
    return map.xs || map.sm || map.md || map.lg || map.original || null;
}

/**
 * Get the largest available variant from variants object
 * Prefers lg > md > sm > original for full display
 * @param variants - ImageVariants or MediaVariantsJson
 * @returns Largest variant or null
 */
export function getLargestVariant(variants: ImageVariants | MediaVariantsJson | null | undefined): ImageVariant | null {
    const map = getVariantMap(variants as MediaVariantsJson);
    if (!map) return null;
    return map.lg || map.md || map.sm || map.original || map.xs || null;
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
    const keys: (keyof StorageVariants)[] = ['xs', 'sm', 'md', 'lg', 'original'];

    for (const key of keys) {
        const variant = storageVariants[key];
        if (variant) {
            const { r2_key, ...publicVariant } = variant;
            result[key] = publicVariant;
        }
    }

    return result;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_FOCAL_POINT: FocalPoint = { x: 50, y: 50 };

export const DEFAULT_IMAGES_JSON: ArticleImagesJson = {};

// ============================================
// CONTAINER SIZE PRESETS
// ============================================

/**
 * Common container sizes for different UI contexts (in CSS pixels)
 * Values represent the display size, multiply by 2 for retina
 */
export const CONTAINER_SIZES = {
    /** Avatar/profile photos: 32-200px display */
    avatar: { xs: 32, sm: 48, md: 80, lg: 120, xl: 200 },
    /** Card thumbnails: 150-400px display */
    card: { xs: 150, sm: 200, md: 300, lg: 400 },
    /** Hero/banner images: 360-2048px display */
    hero: { xs: 360, sm: 720, md: 1200, lg: 1600, xl: 2048 },
    /** Small thumbnails: 60-180px display */
    thumbnail: { xs: 60, sm: 90, md: 120, lg: 180 },
    /** Pinterest pins: 236-600px display */
    pin: { xs: 236, sm: 474, md: 600 },
    /** Recipe step images: 200-600px display */
    step: { xs: 200, sm: 300, md: 400, lg: 600 },
} as const;

export type ContainerType = keyof typeof CONTAINER_SIZES;
export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Pick the best variant for a given target width
 * Returns the smallest variant that is >= targetWidth (accounting for retina)
 * @param variants - ImageVariants object
 * @param targetWidth - Desired display width in CSS pixels
 * @param retinaMultiplier - Pixel density multiplier (default 2 for retina)
 */
export function pickVariantByWidth(
    variants: ImageVariants | undefined,
    targetWidth: number,
    retinaMultiplier: number = 2
): ImageVariant | null {
    if (!variants) return null;

    const effectiveWidth = targetWidth * retinaMultiplier;
    const sorted = [
        { key: 'xs', v: variants.xs },
        { key: 'sm', v: variants.sm },
        { key: 'md', v: variants.md },
        { key: 'lg', v: variants.lg },
        { key: 'original', v: variants.original },
    ].filter(x => x.v).sort((a, b) => (a.v?.width || 0) - (b.v?.width || 0));

    // Find smallest variant >= effectiveWidth
    for (const { v } of sorted) {
        if (v && v.width >= effectiveWidth) return v;
    }

    // Fallback to largest available
    return sorted[sorted.length - 1]?.v || null;
}

/**
 * Get optimal variant for a known container type and size
 * @param slot - ImageSlot with variants
 * @param containerType - Type of container (avatar, card, hero, etc.)
 * @param size - Size preset (xs, sm, md, lg, xl)
 * @returns Best matching variant or null
 */
export function getVariantForContainer(
    slot: ImageSlot | undefined,
    containerType: ContainerType,
    size: ContainerSize = 'md'
): ImageVariant | null {
    if (!slot?.variants) return null;

    const sizes = CONTAINER_SIZES[containerType];
    const targetWidth = (sizes as Record<string, number>)[size] || sizes.md || 300;

    return pickVariantByWidth(slot.variants, targetWidth);
}

/**
 * Get URL for a specific container context
 * Convenience wrapper around getVariantForContainer
 */
export function getVariantUrlForContainer(
    slot: ImageSlot | undefined,
    containerType: ContainerType,
    size: ContainerSize = 'md'
): string | null {
    const variant = getVariantForContainer(slot, containerType, size);
    return variant?.url || null;
}
