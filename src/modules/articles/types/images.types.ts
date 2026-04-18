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
    type ImageVariant,
    type ImageVariants,
    type FocalPoint,
    type ImageSlot,
    type ArticleImagesJson,
    type AuthorImagesJson,
    type CategoryImagesJson,
    type ImagesJson,
    type ImageSlotName,

    type StorageVariant,
    type StorageVariants,
    type MediaVariantsJson,

    type StoredImageVariant,
    type StoredImageVariants,

    type ContentImageBlock,

    buildImageUrl,
    resolveVariantUrl,
    storedToPublicVariant,
    storedVariantsToPublic,
    getBestVariantUrl,
    getSrcSet,
    getFocalPointCss,
    stripStorageKeys,

    DEFAULT_FOCAL_POINT,
    DEFAULT_IMAGES_JSON,
} from '@shared/types/images';
