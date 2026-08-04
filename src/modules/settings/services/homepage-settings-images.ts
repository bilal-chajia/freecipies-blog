import {
  extractR2KeyFromUrl,
  type AdminMediaPayload,
  type PublicImageVariantContract,
  type StorageImageVariant,
} from '@shared/images/image-contract';
import { resolveVariantUrl } from '@shared/types/images';
import type {
  HomepageAdminSection,
  HomepageAdminSettings,
  HomepageResolvedImageSnapshot,
  HomepageSettings,
  HomepageStoredImageSnapshot,
} from '../types/settings.types';

const SPOTLIGHT_VARIANTS = ['sm', 'md', 'lg'] as const;

function presentVariant(variant: StorageImageVariant): PublicImageVariantContract {
  const url = resolveVariantUrl(variant);
  if (!url) throw new Error('Stored spotlight image variant cannot be resolved');
  return {
    url,
    width: variant.width,
    height: variant.height,
    ...(typeof variant.size_bytes === 'number' ? { size_bytes: variant.size_bytes } : {}),
  };
}

function normalizeVariant(variant: PublicImageVariantContract | undefined): StorageImageVariant {
  if (!variant) {
    throw new Error('Spotlight image requires sm, md, and lg variants');
  }

  if ('r2_key' in variant) {
    throw new Error('Spotlight image variants must not include r2_key');
  }

  if (!variant.url.startsWith('/api/images/')) {
    throw new Error('Spotlight image variants must use a local image route');
  }

  const r2Key = extractR2KeyFromUrl(variant.url);
  if (!r2Key) {
    throw new Error('Spotlight image variants must use a local image route');
  }

  return {
    r2_key: r2Key,
    width: variant.width,
    height: variant.height,
    ...(typeof variant.size_bytes === 'number' ? { size_bytes: variant.size_bytes } : {}),
  };
}

function presentImage(
  image: HomepageStoredImageSnapshot | null,
): HomepageResolvedImageSnapshot | null {
  if (!image) return null;

  return {
    media_id: image.media_id,
    alt: image.alt,
    placeholder: image.placeholder,
    ...(image.focal_point ? { focal_point: { ...image.focal_point } } : {}),
    ...(image.aspect_ratio ? { aspect_ratio: image.aspect_ratio } : {}),
    variants: {
      sm: presentVariant(image.variants.sm),
      md: presentVariant(image.variants.md),
      lg: presentVariant(image.variants.lg),
    },
  };
}

function normalizeImage(
  image: HomepageResolvedImageSnapshot | null,
): HomepageStoredImageSnapshot | null {
  if (!image) return null;

  const variants = {} as HomepageStoredImageSnapshot['variants'];
  for (const key of SPOTLIGHT_VARIANTS) {
    variants[key] = normalizeVariant(image.variants[key]);
  }

  return {
    media_id: image.media_id,
    alt: image.alt,
    placeholder: image.placeholder,
    ...(image.focal_point ? { focal_point: { ...image.focal_point } } : {}),
    ...(image.aspect_ratio ? { aspect_ratio: image.aspect_ratio } : {}),
    variants,
  };
}

export function buildHomepageImageFromAdminMedia(
  media: AdminMediaPayload,
): HomepageResolvedImageSnapshot {
  const { sm, md, lg } = media.variants;
  if (!sm || !md || !lg) {
    throw new Error('Selected media must include sm, md, and lg variants');
  }

  const alt = media.alt_text?.trim() ?? '';
  if (!alt) {
    throw new Error('Selected media requires alt text');
  }
  if (!media.placeholder.trim()) {
    throw new Error('Selected media requires a placeholder');
  }

  return {
    media_id: media.id,
    alt,
    placeholder: media.placeholder,
    focal_point: { ...media.focal_point },
    ...(media.aspect_ratio ? { aspect_ratio: media.aspect_ratio } : {}),
    variants: {
      sm: { ...sm },
      md: { ...md },
      lg: { ...lg },
    },
  };
}

export function presentHomepageSettingsForAdmin(
  settings: HomepageSettings,
): HomepageAdminSettings {
  return {
    seo: { ...settings.seo },
    sections: settings.sections.map((section): HomepageAdminSection => (
      section.type === 'seasonal_spotlight' || section.type === 'lead_magnet'
        ? { ...section, image: presentImage(section.image) }
        : section.type === 'social_proof'
          ? {
            ...section,
            logos: section.logos.map((logo) => ({
              ...logo,
              image: presentImage(logo.image),
            })),
          }
          : section.type === 'social_feed'
            ? {
              ...section,
              items: section.items.map((item) => ({
                ...item,
                image: presentImage(item.image),
              })),
            }
          : { ...section }
    )),
  };
}

export function normalizeHomepageSettingsFromAdmin(
  settings: Partial<HomepageAdminSettings>,
): Partial<HomepageSettings> {
  return {
    ...(settings.seo ? { seo: { ...settings.seo } } : {}),
    ...(settings.sections
      ? {
        sections: settings.sections.map((section): HomepageSettings['sections'][number] => (
          section.type === 'seasonal_spotlight' || section.type === 'lead_magnet'
            ? { ...section, image: normalizeImage(section.image) }
            : section.type === 'social_proof'
              ? {
                ...section,
                logos: section.logos.map((logo) => ({
                  ...logo,
                  image: normalizeImage(logo.image),
                })),
              }
              : section.type === 'social_feed'
                ? {
                  ...section,
                  items: section.items.map((item) => ({
                    ...item,
                    image: normalizeImage(item.image),
                  })),
                }
              : { ...section }
        )),
      }
      : {}),
  };
}
