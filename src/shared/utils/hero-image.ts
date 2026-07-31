/**
 * Hero Image Resolution
 * =====================
 * Single source of truth for picking the display image of a content page
 * or card: prefer the `hero` slot when it exists AND (has a srcset OR no
 * thumbnail is available), otherwise fall back to `thumbnail`.
 */

import { extractImage, getImageSrcSet, getImageSlot, type ExtractedImage } from './hydration';
import { resolveVariantUrl, type ImageSlot } from '@shared/types/images';

export interface ResolvedHeroImage {
  image: ExtractedImage;
  srcSet: string;
  slot: 'hero' | 'thumbnail';
}

const toCssAspectRatio = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (value.includes('/')) return value;
  if (value.includes(':')) return value.replace(':', ' / ');
  return value;
};

const buildImageStyle = (imageSlot?: ImageSlot): string | undefined => {
  if (!imageSlot) return undefined;
  const styles: string[] = [];

  if (imageSlot.focal_point) {
    styles.push(`object-position: ${imageSlot.focal_point.x}% ${imageSlot.focal_point.y}%`);
  }

  const aspectRatio = toCssAspectRatio(imageSlot.aspect_ratio);
  if (aspectRatio) {
    styles.push(`aspect-ratio: ${aspectRatio}`);
  }

  return styles.length ? styles.join('; ') : undefined;
};

/**
 * Extract an image from a slot, falling back to the `original` variant when no
 * named responsive variants (xs/sm/md/lg) are available. This matches the
 * intended behavior that a hero slot with only an original asset is still
 * usable as a display image, even though it cannot produce a srcset.
 */
function extractWithOriginalFallback(
  images_json: string | null | undefined,
  slot: 'hero' | 'thumbnail',
  targetWidth?: number
): ExtractedImage {
  const extracted = extractImage(images_json, slot, targetWidth);
  if (extracted.image_url) return extracted;

  const imageSlot = getImageSlot(images_json, slot);
  if (!imageSlot?.variants?.original) return extracted;

  const original = imageSlot.variants.original;
  const resolvedUrl = resolveVariantUrl(original);
  if (!resolvedUrl) return extracted;

  return {
    image_url: resolvedUrl,
    imageAlt: imageSlot.alt,
    imageWidth: original.width,
    imageHeight: original.height,
    imageAspectRatio: toCssAspectRatio(imageSlot.aspect_ratio),
    imageObjectPosition: imageSlot.focal_point
      ? `${imageSlot.focal_point.x}% ${imageSlot.focal_point.y}%`
      : undefined,
    imageStyle: buildImageStyle(imageSlot),
  };
}

export function resolveHeroImage(
  images_json: string | null | undefined,
  targetWidth = 1200
): ResolvedHeroImage {
  const heroSlot = extractWithOriginalFallback(images_json, 'hero', targetWidth);
  const heroThumb = extractWithOriginalFallback(images_json, 'thumbnail', targetWidth);
  const heroSlotSrcSet = getImageSrcSet(images_json, 'hero');
  const thumbSrcSet = getImageSrcSet(images_json, 'thumbnail');
  const useHeroSlot = !!(heroSlot.image_url && (heroSlotSrcSet || !heroThumb.image_url));

  return {
    image: useHeroSlot ? heroSlot : heroThumb,
    srcSet: useHeroSlot ? heroSlotSrcSet : thumbSrcSet,
    slot: useHeroSlot ? 'hero' : 'thumbnail',
  };
}
