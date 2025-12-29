/**
 * Images Types - Re-export from Shared
 * =====================================
 * This file re-exports from the unified shared types.
 * Maintained for backwards compatibility.
 * 
 * @see src/shared/types/images.ts for the source of truth
 */

// Re-export all image types from shared
export {
    // Public types
    type ImageVariant,
    type ImageVariants,
    type FocalPoint,
    type ImageSlot,
    type ArticleImagesJson,
    type AuthorImagesJson,
    type CategoryImagesJson,
    type ImagesJson,
    type ImageSlotName,

    // Storage types (for media module only)
    type StorageVariant,
    type StorageVariants,
    type MediaVariantsJson,

    // Content block types
    type ContentImageBlock,

    // Utility functions
    getBestVariantUrl,
    getSrcSet,
    getFocalPointCss,
    stripStorageKeys,

    // Constants
    DEFAULT_FOCAL_POINT,
    DEFAULT_IMAGES_JSON,
} from '@shared/types/images';
