import {
  parseVariantsJson,
  getVariantMap,
  getBestVariant,
  getVariantForContainer,
  resolveVariantUrl
} from '@shared/types/images';
import type { ResolvedImageVariant } from '@shared/types/images';
import type { MediaRecord } from '@modules/media/types/media.types';
import { isImageFile, formatFileSize } from '../../../utils/helpers';

export type MediaLibraryItem = MediaRecord & {
  url?: string;
  mime_type?: string;
  created_at?: string;
  aspect_ratio?: string | null;
  alt_text?: string | null;
};

export const isMediaItemImage = (item: MediaLibraryItem): boolean => {
  if (item.mimeType?.startsWith('image/') || item.mime_type?.startsWith('image/')) return true;
  return isImageFile(item.name || '');
};

export const parseVariants = (item: MediaLibraryItem) => parseVariantsJson(item);

export const getVariantSizeBytes = (variant: ResolvedImageVariant | null | undefined): number | null => {
  if (!variant) return null;
  return variant.size_bytes ?? null;
};

export const getDisplayedSizeBytes = (item: MediaLibraryItem): number | null => {
  const variants = parseVariants(item);
  const best = getBestVariant(variants);
  const variantSize = getVariantSizeBytes(best);
  if (typeof variantSize === 'number') return variantSize;
  return null;
};

export const formatDisplayedSize = (item: MediaLibraryItem): string => {
  const bytes = getDisplayedSizeBytes(item);
  return typeof bytes === 'number' && bytes > 0 ? formatFileSize(bytes) : '-';
};

export const getThumbnailUrl = (item: MediaLibraryItem): string => {
  const parsed = parseVariants(item);
  const variants = getVariantMap(parsed);
  if (!variants) return resolveVariantUrl(null) || item.url || '';

  const slot = { variants };
  const variant = getVariantForContainer(slot, 'thumbnail', 'lg');
  return resolveVariantUrl(variant) || item.url || '';
};

export const getFullUrl = (item: MediaLibraryItem): string => {
  const parsed = parseVariants(item);
  const variants = getVariantMap(parsed);
  if (!variants) return item.url || '';

  const slot = { variants };
  const variant = getVariantForContainer(slot, 'hero', 'xl');
  return resolveVariantUrl(variant) || item.url || '';
};
