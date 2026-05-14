/**
 * Unified Image Types
 * ====================
 * Single source of truth for all image-related types in the project.
 * 
 * USAGE:
 * - Frontend/Consumer code: Use ResolvedImageVariant, ResolvedImageSlot, ImagesJson
 * - Media storage code: Use StoredImageVariant, StoredImageSlot, MediaVariantsJson, StrictStorageVariants
 * 
 * NAMING CONVENTION:
 * - Runtime/public JSON: snake_case (media_id, size_bytes)
 * - Database JSON: snake_case (media_id, r2_key, size_bytes)
 * - Transform at API boundary layer
 */

// ============================================
// PUBLIC TYPES (Consumer-facing)
// ============================================

/**
 * Resolved responsive image variant for rendering.
 * This shape uses public URLs only; it must not contain R2 keys.
 */
export interface ResolvedImageVariant {
    /** Public CDN URL */
    url: string;

    /** Width in pixels */
    width: number;

    /** Height in pixels (for CLS prevention) */
    height: number;

    /** File size in bytes (optional, for admin display) */
    size_bytes?: number;
}

/** @deprecated Prefer ResolvedImageVariant for rendered/public payloads. */
export type ImageVariant = ResolvedImageVariant;

/**
 * Collection of responsive variants
 * Standard breakpoints: xs(360), sm(720), md(1200), lg(2048)
 */
export interface ResolvedImageVariants {
    /** 360px - Budget phones, 1x screens */
    xs?: ResolvedImageVariant;

    /** 720px - Phones 2x retina, small tablets */
    sm?: ResolvedImageVariant;

    /** 1200px - Tablets, laptops, standard desktop */
    md?: ResolvedImageVariant;

    /** 2048px - 4K displays, MacBook Retina */
    lg?: ResolvedImageVariant;

    /** Original size - Only if source > 2048px */
    original?: ResolvedImageVariant;
}

/** @deprecated Prefer ResolvedImageVariants for rendered/public payloads. */
export type ImageVariants = ResolvedImageVariants;

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
 * Resolved image slot with metadata.
 * Used by API/frontend rendering after storage R2 keys have been converted to URLs.
 */
export interface ResolvedImageSlot {
    /** Reference to source Media ID */
    media_id?: number;

    /** SEO / Accessibility text */
    alt?: string;

    /** Visible caption below image */
    caption?: string;

    /** Legal / copyright info */
    credit?: string | Record<string, unknown>;

    /** Blurhash/LQIP string (<1KB) */
    placeholder?: string;

    /** Focal point for CSS object-position */
    focal_point?: FocalPoint;

    /** Layout hint (e.g., "16:9", "4:3", "1:1") */
    aspect_ratio?: string;

    /** Responsive image variants */
    variants: ResolvedImageVariants;
}

/** @deprecated Prefer ResolvedImageSlot for rendered/public payloads. */
export type ImageSlot = ResolvedImageSlot;

/**
 * Images JSON container for articles
 */
export interface ArticleImagesJson {
    /** Primary article page/header image */
    hero?: ImageSlot;

    /** Card thumbnail (if different from hero) */
    thumbnail?: ImageSlot;

    /** Recipe step images keyed by recipe_json step image_ref */
    recipe_steps?: Record<string, ImageSlot>;

}

/**
 * Images JSON container for authors
 */
export interface AuthorImagesJson {
    /** Profile page hero background */
    hero?: ImageSlot;

    /** Profile photo / headshot */
    avatar?: ImageSlot;

}

/**
 * Images JSON container for categories
 */
export interface CategoryImagesJson {
    /** Hero background image */
    hero?: ImageSlot;

    /** Menu icons / category cards */
    thumbnail?: ImageSlot;

}

/**
 * Union type for all images_json containers
 */
export type ImagesJson = ArticleImagesJson | AuthorImagesJson | CategoryImagesJson;

/**
 * Valid slot names for extraction
 */
export type ImageSlotName = 'hero' | 'thumbnail' | 'avatar' | 'recipe_steps';

// ============================================
// URL BUILDING
// ============================================

const IMAGE_PROXY_PREFIX = '/api/images';

export function buildImageUrl(r2Key: string): string {
    return `${IMAGE_PROXY_PREFIX}/${r2Key}`;
}

export function resolvePublicVariantUrl(variant: { url?: string } | null | undefined): string | null {
    return variant?.url ?? null;
}

/**
 * Accepts legacy/storage-shaped variants and resolves R2 keys through /api/images.
 * Prefer resolvePublicVariantUrl in frontend code that should only receive rendered payloads.
 */
export function resolveVariantUrl(variant: { url?: string; r2_key?: string; r2Key?: string } | null | undefined): string | null {
    if (!variant) return null;
    if (variant.r2_key) return buildImageUrl(variant.r2_key);
    if (variant.r2Key) return buildImageUrl(variant.r2Key);
    if (variant.url) return variant.url;
    return null;
}

// ============================================
// STORED VARIANT TYPES (DB persistence)
// ============================================

export interface StoredImageVariant {
    r2_key: string;
    width: number;
    height: number;
    size_bytes?: number;
}

export interface StoredImageVariants {
    xs?: StoredImageVariant;
    sm?: StoredImageVariant;
    md?: StoredImageVariant;
    lg?: StoredImageVariant;
    original?: StoredImageVariant;
}

export interface StoredImageSlot {
    media_id?: number;
    alt?: string;
    caption?: string;
    credit?: string | Record<string, unknown>;
    placeholder?: string;
    focal_point?: FocalPoint;
    aspect_ratio?: string;
    variants: StoredImageVariants;
}

export interface StoredAuthorCreditAvatar {
    media_id?: number;
    alt?: string;
    variants: {
        xs: StoredImageVariant;
        sm: StoredImageVariant;
    };
}

export interface StoredAuthorCreditSnapshot {
    type: 'author';
    id: number;
    name: string;
    slug: string;
    avatar?: StoredAuthorCreditAvatar;
}

export interface ResolvedAuthorCreditAvatar {
    media_id?: number;
    alt?: string;
    variants: {
        xs: ResolvedImageVariant;
        sm: ResolvedImageVariant;
    };
}

export interface ResolvedAuthorCreditSnapshot {
    type: 'author';
    id: number;
    name: string;
    slug: string;
    avatar?: ResolvedAuthorCreditAvatar;
}

// ============================================
// STORAGE TYPES (Media module internal)
// ============================================

export interface StorageVariant {
    /** R2 bucket key for file operations */
    r2_key: string;
    /** Width in pixels */
    width: number;
    /** Height in pixels (for CLS prevention) */
    height: number;
    /** File size in bytes (optional, for admin display) */
    size_bytes?: number;
}

export interface StrictStorageVariants {
    xs: StorageVariant;
    sm: StorageVariant;
    md: StorageVariant;
    lg: StorageVariant;
    original: StorageVariant;
}

/** Partial variants for snapshot/image slots where not all sizes may exist. */
export type PartialStorageVariants = Partial<StrictStorageVariants>;

/** @deprecated Use StrictStorageVariants (media table) or PartialStorageVariants (snapshots). */
export type StorageVariants = PartialStorageVariants;

/** Strict contract for media.variants_json — all 5 variant keys required. Matches image-contract.ts. */
export interface MediaVariantsJson {
    variants: StrictStorageVariants;
    placeholder: string;
}

/** Loose/parsed shape before validation — variants may be incomplete. */
export interface ParsedMediaVariantsJson {
    variants: PartialStorageVariants;
    placeholder: string;
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

export function storedToPublicVariant(sv: StoredImageVariant): ImageVariant {
    const size_bytes = sv.size_bytes;
    return { url: buildImageUrl(sv.r2_key), width: sv.width, height: sv.height, ...(typeof size_bytes === 'number' ? { size_bytes } : {}) };
}

export function storedVariantsToPublic(variants: StoredImageVariants): ImageVariants {
    const result: ImageVariants = {};
    const keys: (keyof StoredImageVariants)[] = ['xs', 'sm', 'md', 'lg', 'original'];
    for (const key of keys) {
        const v = variants[key];
        if (v) result[key] = storedToPublicVariant(v);
    }
    return result;
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
    credit?: string;
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
export function parseVariantsJson(item: {
    variants_json?: unknown;
    variantsJson?: unknown;
    variants?: unknown;
    placeholder?: unknown;
} | null | undefined): ParsedMediaVariantsJson | null {
    if (!item) return null;
    if (item.variants && typeof item.variants === 'object') {
        return {
            variants: item.variants as PartialStorageVariants,
            placeholder: typeof item.placeholder === 'string' ? item.placeholder : '',
        };
    }
    const json = item.variants_json || item.variantsJson;
    if (!json) return null;
    if (typeof json === 'object') {
        return json as ParsedMediaVariantsJson;
    }
    if (typeof json === 'string') {
        try {
            return JSON.parse(json) as ParsedMediaVariantsJson;
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Strict parse of a variants_json string from the DB.
 * Unlike parseVariantsJson (lenient), this throws if required fields are missing.
 * Use in server-side critical paths where a corrupt record should surface as an error.
 *
 * @throws Error if variantsJson is null, malformed, or missing required variants/placeholder
 */
export function parseVariantsJsonStrict(variantsJson: string | null | undefined): MediaVariantsJson {
    if (!variantsJson) {
        throw new Error('parseVariantsJsonStrict: variantsJson is null or empty');
    }
    let parsed: unknown;
    try {
        parsed = typeof variantsJson === 'string' ? JSON.parse(variantsJson) : variantsJson;
    } catch {
        throw new Error('parseVariantsJsonStrict: invalid JSON');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('parseVariantsJsonStrict: root must be an object');
    }
    const root = parsed as Record<string, unknown>;
    const variantsSource = (root.variants && typeof root.variants === 'object' && !Array.isArray(root.variants))
        ? root.variants as Record<string, unknown>
        : root;
    if (typeof root.placeholder !== 'string' || !root.placeholder) {
        throw new Error('parseVariantsJsonStrict: missing placeholder');
    }
    const REQUIRED_KEYS = ['xs', 'sm', 'md', 'lg', 'original'] as const;
    for (const key of REQUIRED_KEYS) {
        const v = (variantsSource as Record<string, unknown>)[key];
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
            throw new Error(`parseVariantsJsonStrict: missing variant "${key}"`);
        }
        const vr = v as Record<string, unknown>;
        if (typeof vr.r2_key !== 'string' || !vr.r2_key) {
            throw new Error(`parseVariantsJsonStrict: variant "${key}" missing r2_key`);
        }
    }
    // Return as MediaVariantsJson — already validated above
    return (root.variants ? parsed : { variants: parsed, placeholder: root.placeholder }) as MediaVariantsJson;
}

/**
 * Extract variants map from parsed JSON
 * Handles nested { variants: {...} } structure from DB
 * @param parsed - Parsed variants JSON or raw variants object
 * @returns ImageVariants object
 */
export function getVariantMap(parsed: ParsedMediaVariantsJson | ImageVariants | null | undefined): ImageVariants {
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
 * Prefers xs > sm for thumbnails (smallest usable). original is excluded from normal render selection.
 * @param variants - ImageVariants or MediaVariantsJson
 * @returns Best variant or null
 */
export function getBestVariant(variants: ImageVariants | ParsedMediaVariantsJson | null | undefined): ImageVariant | null {
    const map = getVariantMap(variants as ParsedMediaVariantsJson);
    if (!map) return null;
    return map.xs || map.sm || map.md || map.lg || null;
}

/**
 * Get the largest available variant from variants object
 * Prefers lg > md > sm > xs for full display. original is excluded from normal render selection.
 * @param variants - ImageVariants or MediaVariantsJson
 * @returns Largest variant or null
 */
export function getLargestVariant(variants: ImageVariants | ParsedMediaVariantsJson | null | undefined): ImageVariant | null {
    const map = getVariantMap(variants as ParsedMediaVariantsJson);
    if (!map) return null;
    return map.lg || map.md || map.sm || map.xs || null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract best available variant URL
 * Prefers lg > md > sm > xs. original is excluded from normal render selection.
 */
export function getBestVariantUrl(slot: ImageSlot | undefined): string | null {
    if (!slot?.variants) return null;

    const variant =
        slot.variants.lg ||
        slot.variants.md ||
        slot.variants.sm ||
        slot.variants.xs;

    return resolveVariantUrl(variant);
}

/**
 * Get responsive srcset string for <img> element
 */
export function getSrcSet(slot: ImageSlot | undefined): string {
    if (!slot?.variants) return '';

    const entries: string[] = [];
    const v = slot.variants;

    if (v.xs) entries.push(`${resolveVariantUrl(v.xs)} ${v.xs.width}w`);
    if (v.sm) entries.push(`${resolveVariantUrl(v.sm)} ${v.sm.width}w`);
    if (v.md) entries.push(`${resolveVariantUrl(v.md)} ${v.md.width}w`);
    if (v.lg) entries.push(`${resolveVariantUrl(v.lg)} ${v.lg.width}w`);

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
export function stripStorageKeys(storageVariants: StorageVariants | StoredImageVariants): ImageVariants {
    const result: ImageVariants = {};
    const keys: (keyof StorageVariants)[] = ['xs', 'sm', 'md', 'lg', 'original'];

    for (const key of keys) {
        const variant = storageVariants[key];
        if (variant && 'r2_key' in variant) {
            result[key] = {
                url: buildImageUrl(variant.r2_key),
                width: variant.width,
                height: variant.height,
                ...(typeof variant.size_bytes === 'number'
                    ? { size_bytes: variant.size_bytes }
                    : {}),
            };
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
    targetWidth: number | undefined,
    retinaMultiplier: number = 2
): ImageVariant | null {
    if (!variants) return null;

    const sorted = [
        { key: 'xs', v: variants.xs },
        { key: 'sm', v: variants.sm },
        { key: 'md', v: variants.md },
        { key: 'lg', v: variants.lg },
    ].filter(x => x.v).sort((a, b) => (a.v?.width || 0) - (b.v?.width || 0));

    if (!targetWidth) {
        // No target: return largest available
        return sorted[sorted.length - 1]?.v || null;
    }

    const effectiveWidth = targetWidth * retinaMultiplier;

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
    return resolveVariantUrl(variant);
}
