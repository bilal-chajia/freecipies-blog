import type { PublicImageVariantContract } from '@shared/images/image-contract';
import { extractImage } from '@shared/utils';

export interface PublicRecipeThumbnail extends PublicImageVariantContract {
  alt: string;
}

interface PublicRecipeAuthor {
  name: string | null;
  slug: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface PublicRecipeCategory {
  label: string | null;
  slug: string | null;
  color: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null;
}

function nullableString(record: Record<string, unknown>, key: string): string | null {
  return typeof record[key] === 'string' ? record[key] : null;
}

export function resolvePublicRecipeThumbnail(
  imagesJson: string | null | undefined,
  fallbackAlt: string,
): PublicRecipeThumbnail | null {
  const thumbnail = extractImage(imagesJson, 'thumbnail', 720);
  const image = thumbnail.image_url
    ? thumbnail
    : extractImage(imagesJson, 'hero', 720);

  if (!image.image_url || !image.imageWidth || !image.imageHeight) {
    return null;
  }

  return {
    url: image.image_url,
    width: image.imageWidth,
    height: image.imageHeight,
    alt: image.imageAlt?.trim() || fallbackAlt,
  };
}

export function resolvePublicRecipeAuthor(author: unknown): PublicRecipeAuthor | null {
  const record = asRecord(author);
  if (!record) return null;

  return {
    name: nullableString(record, 'name'),
    slug: nullableString(record, 'slug'),
    role: nullableString(record, 'role') ?? nullableString(record, 'job_title'),
    avatar_url: nullableString(record, 'avatar_url'),
  };
}

export function resolvePublicRecipeCategory(category: unknown): PublicRecipeCategory | null {
  const record = asRecord(category);
  if (!record) return null;

  return {
    label: nullableString(record, 'label'),
    slug: nullableString(record, 'slug'),
    color: nullableString(record, 'color'),
  };
}
