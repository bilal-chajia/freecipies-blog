import { buildImageUrl } from '../types/images';
import type {
  AuthorImagesJson,
  ResolvedAuthorCreditSnapshot,
  StorageVariant,
  StoredAuthorCreditSnapshot,
  MediaVariantsJson,
} from '../types/images';

export const IMAGE_VARIANT_KEYS = ['xs', 'sm', 'md', 'lg', 'original'] as const;
export type ImageVariantKey = typeof IMAGE_VARIANT_KEYS[number];

export const SNAPSHOT_VARIANT_KEYS = ['xs', 'sm', 'md', 'lg'] as const;
export type SnapshotVariantKey = typeof SNAPSHOT_VARIANT_KEYS[number];

export type SnapshotContainerKind = 'article' | 'author' | 'category';

// C6: StorageImageVariant and MediaVariantsJsonContract are aliases for SSOT types from @shared/types/images.
// Internal code continues to use these names — no churn required.
export type StorageImageVariant = StorageVariant;
export type MediaStorageVariants = Record<ImageVariantKey, StorageImageVariant>;
export type SnapshotStorageVariants = Partial<Record<SnapshotVariantKey, StorageImageVariant>>;
export type MediaVariantsJsonContract = MediaVariantsJson;

export interface NormalizedImageSnapshot {
  media_id?: number;
  alt?: string;
  caption?: string;
  credit?: unknown;
  placeholder?: string;
  focal_point?: { x: number; y: number };
  aspect_ratio?: string;
  variants: SnapshotStorageVariants;
}

export interface NormalizedImageSnapshotContainer {
  hero?: NormalizedImageSnapshot;
  thumbnail?: NormalizedImageSnapshot;
  avatar?: NormalizedImageSnapshot;
  recipe_steps?: Record<string, NormalizedImageSnapshot>;
  content_images?: Record<string, NormalizedImageSnapshot>;
}

export interface PublicImageVariantContract {
  url: string;
  width: number;
  height: number;
  size_bytes?: number;
}

export type PublicMediaVariants = Record<ImageVariantKey, PublicImageVariantContract>;

export interface MediaRowForPayload {
  id: number;
  name: string;
  alt_text?: string | null;
  caption?: string | null;
  credit?: string | null;
  mime_type?: string | null;
  aspect_ratio?: string | null;
  variants_json?: string | null;
  focal_point_json?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface AdminMediaPayload {
  id: number;
  name: string;
  alt_text: string | null;
  caption: string | null;
  credit: ResolvedAuthorCreditSnapshot | null;
  mime_type: string;
  aspect_ratio: string | null;
  focal_point: { x: number; y: number };
  placeholder: string;
  variants: Partial<PublicMediaVariants>;
  url: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface AuthorRowForCredit {
  id: number;
  name: string;
  slug: string;
  imagesJson?: string | null;
  images_json?: string | null;
}

const HERO_VARIANTS = ['sm', 'md', 'lg'] as const;
const SMALL_VARIANTS = ['xs', 'sm'] as const;
const INLINE_VARIANTS = ['sm', 'md', 'lg'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readVariantSizeBytes(record: Record<string, unknown>): number | undefined {
  return readNumber(record, 'size_bytes') ?? readNumber(record, 'sizeBytes');
}

function readR2Key(record: Record<string, unknown>): string | undefined {
  return readString(record, 'r2_key')
    ?? readString(record, 'r2Key')
    ?? extractR2KeyFromUrl(readString(record, 'url'));
}

export function extractR2KeyFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, 'https://local.invalid');
    const pathname = parsed.pathname;
    const prefixes = ['/api/images/', '/images/'];

    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix)) {
        return decodeURIComponent(pathname.slice(prefix.length));
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizeStorageVariant(input: unknown, label: string): StorageImageVariant {
  if (!isRecord(input)) {
    throw new Error(`Invalid image variant "${label}"`);
  }

  const r2Key = readR2Key(input);
  const width = readNumber(input, 'width');
  const height = readNumber(input, 'height');

  if (!r2Key) {
    throw new Error(`Image variant "${label}" is missing r2_key`);
  }
  if (typeof width !== 'number') {
    throw new Error(`Image variant "${label}" is missing width`);
  }
  if (typeof height !== 'number') {
    throw new Error(`Image variant "${label}" is missing height`);
  }

  const result: StorageImageVariant = {
    r2_key: r2Key,
    width,
    height,
  };
  const sizeBytes = readVariantSizeBytes(input);
  if (typeof sizeBytes === 'number') {
    result.size_bytes = sizeBytes;
  }
  return result;
}

function normalizeRequiredAuthorCreditVariant(input: unknown, label: string): StorageImageVariant {
  return normalizeStorageVariant(input, `credit.avatar.variants.${label}`);
}

function normalizeAuthorCreditAvatar(input: unknown): StoredAuthorCreditSnapshot['avatar'] | undefined {
  const source = parseJsonRecord(input);
  if (!source) return undefined;

  const variantsSource = readRecord(source, 'variants');
  if (!variantsSource) return undefined;

  const xs = variantsSource.xs;
  const sm = variantsSource.sm;
  if (!xs || !sm) return undefined;

  const avatar: StoredAuthorCreditSnapshot['avatar'] = {
    variants: {
      xs: normalizeRequiredAuthorCreditVariant(xs, 'xs'),
      sm: normalizeRequiredAuthorCreditVariant(sm, 'sm'),
    },
  };

  const mediaId = readNumber(source, 'media_id') ?? readNumber(source, 'mediaId');
  if (typeof mediaId === 'number') avatar.media_id = mediaId;

  const alt = readString(source, 'alt');
  if (alt !== undefined) avatar.alt = alt;

  return avatar;
}

export function parseStoredAuthorCreditSnapshot(input: unknown): StoredAuthorCreditSnapshot | null {
  const source = parseJsonRecord(input);
  if (!source) return null;

  const type = readString(source, 'type');
  const id = readNumber(source, 'id');
  const name = readString(source, 'name');
  const slug = readString(source, 'slug');

  if (type !== 'author' || typeof id !== 'number' || !name || !slug) {
    return null;
  }

  const credit: StoredAuthorCreditSnapshot = { type: 'author', id, name, slug };
  const avatar = normalizeAuthorCreditAvatar(source.avatar);
  if (avatar) credit.avatar = avatar;
  return credit;
}

export function normalizeStoredAuthorCreditSnapshot(input: unknown): StoredAuthorCreditSnapshot {
  const credit = parseStoredAuthorCreditSnapshot(input);
  if (!credit) {
    throw new Error('media.credit must be a serialized author credit snapshot');
  }
  return credit;
}

export function buildAuthorCreditSnapshot(author: AuthorRowForCredit): StoredAuthorCreditSnapshot {
  const credit: StoredAuthorCreditSnapshot = {
    type: 'author',
    id: author.id,
    name: author.name,
    slug: author.slug,
  };

  const imagesJson = author.imagesJson ?? author.images_json ?? null;
  const images = parseJsonRecord(imagesJson) as AuthorImagesJson | null;
  const avatar = normalizeAuthorCreditAvatar(images?.avatar);
  if (avatar) credit.avatar = avatar;

  return credit;
}

function toPublicAuthorCreditAvatar(
  avatar: StoredAuthorCreditSnapshot['avatar']
): ResolvedAuthorCreditSnapshot['avatar'] | undefined {
  if (!avatar) return undefined;

  return {
    ...(typeof avatar.media_id === 'number' ? { media_id: avatar.media_id } : {}),
    ...(avatar.alt ? { alt: avatar.alt } : {}),
    variants: {
      xs: toPublicVariant(avatar.variants.xs),
      sm: toPublicVariant(avatar.variants.sm),
    },
  };
}

export function serializeAuthorCreditForAdmin(input: unknown): ResolvedAuthorCreditSnapshot | null {
  const credit = parseStoredAuthorCreditSnapshot(input);
  if (!credit) return null;

  return {
    type: 'author',
    id: credit.id,
    name: credit.name,
    slug: credit.slug,
    ...(credit.avatar ? { avatar: toPublicAuthorCreditAvatar(credit.avatar) } : {}),
  };
}

export function normalizeMediaVariantsJson(input: unknown): MediaVariantsJsonContract {
  const root = parseJsonRecord(input);
  if (!root) {
    throw new Error('media.variants_json must be a JSON object');
  }

  const variantsSource = readRecord(root, 'variants') ?? root;
  const placeholder = readString(root, 'placeholder');
  if (!placeholder) {
    throw new Error('media.variants_json.placeholder is required');
  }

  const variants = {} as MediaStorageVariants;
  for (const key of IMAGE_VARIANT_KEYS) {
    const source = variantsSource[key];
    if (!source) {
      throw new Error(`media.variants_json.variants.${key} is required`);
    }
    variants[key] = normalizeStorageVariant(source, key);
  }

  return { variants, placeholder };
}

/**
 * Extract all R2 object keys from a raw variantsJson string/object.
 * Used before hard-deleting a media record to clean up R2 storage.
 * Returns an empty array if the JSON is malformed or missing keys.
 */
export function extractR2KeysFromMediaVariantsJson(variantsJson: string | null | undefined): string[] {
  if (!variantsJson) return [];
  try {
    const parsed = normalizeMediaVariantsJson(variantsJson);
    return IMAGE_VARIANT_KEYS
      .map(key => parsed.variants[key]?.r2_key)
      .filter((key): key is string => typeof key === 'string' && key.length > 0);
  } catch {
    // Malformed variantsJson — log but don't block deletion
    console.warn('[extractR2KeysFromMediaVariantsJson] Failed to parse variantsJson:', variantsJson);
    return [];
  }
}

function normalizeSnapshotVariant(input: unknown, label: string): StorageImageVariant | null {
  if (!isRecord(input)) return null;
  try {
    return normalizeStorageVariant(input, label);
  } catch {
    return null;
  }
}

function normalizeSnapshotVariants(
  input: unknown,
  allowedKeys: readonly SnapshotVariantKey[]
): SnapshotStorageVariants {
  const source = parseJsonRecord(input);
  const variants: SnapshotStorageVariants = {};
  if (!source) return variants;

  for (const key of allowedKeys) {
    const normalized = normalizeSnapshotVariant(source[key], key);
    if (normalized) {
      variants[key] = normalized;
    }
  }

  return variants;
}

function readFocalPoint(record: Record<string, unknown>): { x: number; y: number } | undefined {
  const source = readRecord(record, 'focal_point');
  if (!source) return undefined;

  const x = readNumber(source, 'x');
  const y = readNumber(source, 'y');
  if (typeof x !== 'number' || typeof y !== 'number') return undefined;

  return { x, y };
}

function normalizeSnapshotSlot(
  input: unknown,
  allowedVariantKeys: readonly SnapshotVariantKey[]
): NormalizedImageSnapshot | null {
  const source = parseJsonRecord(input);
  if (!source) return null;

  const variants = normalizeSnapshotVariants(source.variants, allowedVariantKeys);
  if (!Object.keys(variants).length) return null;

  const slot: NormalizedImageSnapshot = { variants };

  const mediaId = readNumber(source, 'media_id') ?? readNumber(source, 'mediaId');
  if (typeof mediaId === 'number') slot.media_id = mediaId;

  const alt = readString(source, 'alt');
  if (alt !== undefined) slot.alt = alt;

  const caption = readString(source, 'caption');
  if (caption !== undefined) slot.caption = caption;

  if ('credit' in source) {
    // Normalize the embedded author credit so its avatar variants are stored as
    // r2_key (parseStoredAuthorCreditSnapshot strips resolved /api/images urls).
    // Fall back to the raw value for non-author / string credits.
    const normalizedCredit = parseStoredAuthorCreditSnapshot(source.credit);
    slot.credit = normalizedCredit ?? source.credit;
  }

  const placeholder = readString(source, 'placeholder');
  if (placeholder !== undefined) slot.placeholder = placeholder;

  const focalPoint = readFocalPoint(source);
  if (focalPoint) slot.focal_point = focalPoint;

  const aspectRatio = readString(source, 'aspect_ratio');
  if (aspectRatio !== undefined) slot.aspect_ratio = aspectRatio;

  return slot;
}

function readLegacyHeroSource(
  source: Record<string, unknown>
): unknown {
  return source.hero;
}

export function normalizeImageSnapshotContainer(
  kind: SnapshotContainerKind,
  input: unknown
): NormalizedImageSnapshotContainer {
  const source = parseJsonRecord(input);
  if (!source) return {};

  const result: NormalizedImageSnapshotContainer = {};

  const hero = normalizeSnapshotSlot(readLegacyHeroSource(source), HERO_VARIANTS);
  if (hero) result.hero = hero;

  const thumbnail = normalizeSnapshotSlot(source.thumbnail, SMALL_VARIANTS);
  if (thumbnail) result.thumbnail = thumbnail;

  const avatar = kind === 'author' ? normalizeSnapshotSlot(source.avatar, SMALL_VARIANTS) : null;
  if (avatar) result.avatar = avatar;

  if (kind === 'article') {
    const recipeStepsSource = readRecord(source, 'recipe_steps') ?? readRecord(source, 'recipeSteps');
    if (recipeStepsSource) {
      const recipeSteps: Record<string, NormalizedImageSnapshot> = {};
      for (const [stepKey, stepValue] of Object.entries(recipeStepsSource)) {
        const stepSlot = normalizeSnapshotSlot(stepValue, INLINE_VARIANTS);
        if (stepSlot) recipeSteps[stepKey] = stepSlot;
      }
      if (Object.keys(recipeSteps).length) {
        result.recipe_steps = recipeSteps;
      }
    }

    const contentImagesSource = readRecord(source, 'content_images') ?? readRecord(source, 'contentImages');
    if (contentImagesSource) {
      const contentImages: Record<string, NormalizedImageSnapshot> = {};
      for (const [imageKey, imageValue] of Object.entries(contentImagesSource)) {
        const imageSlot = normalizeSnapshotSlot(imageValue, INLINE_VARIANTS);
        if (imageSlot) contentImages[imageKey] = imageSlot;
      }
      if (Object.keys(contentImages).length) {
        result.content_images = contentImages;
      }
    }
  }

  return result;
}

function toPublicVariant(variant: StorageImageVariant): PublicImageVariantContract {
  const publicVariant: PublicImageVariantContract = {
    url: buildImageUrl(variant.r2_key),
    width: variant.width,
    height: variant.height,
  };

  if (typeof variant.size_bytes === 'number') {
    publicVariant.size_bytes = variant.size_bytes;
  }

  return publicVariant;
}

function toPublicMediaVariants(variants: MediaStorageVariants): PublicMediaVariants {
  const result = {} as PublicMediaVariants;
  for (const key of IMAGE_VARIANT_KEYS) {
    result[key] = toPublicVariant(variants[key]);
  }
  return result;
}

function parseFocalPointJson(input: string | null | undefined): { x: number; y: number } {
  const fallback = { x: 50, y: 50 };
  const parsed = parseJsonRecord(input);
  if (!parsed) return fallback;

  const x = readNumber(parsed, 'x');
  const y = readNumber(parsed, 'y');
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : fallback;
}

function pickAdminUrl(variants: Partial<PublicMediaVariants>): string {
  return variants.sm?.url
    ?? variants.md?.url
    ?? variants.lg?.url
    ?? variants.xs?.url
    ?? '';
}

export function serializeAdminMediaPayload(row: MediaRowForPayload): AdminMediaPayload {
  const variantsJson = row.variants_json ?? null;
  let placeholder = '';
  let variants: Partial<PublicMediaVariants> = {};

  if (variantsJson) {
    try {
      const normalized = normalizeMediaVariantsJson(variantsJson);
      placeholder = normalized.placeholder;
      variants = toPublicMediaVariants(normalized.variants);
    } catch {
      variants = {};
    }
  }

  return {
    id: row.id,
    name: row.name,
    alt_text: row.alt_text ?? null,
    caption: row.caption ?? null,
    credit: serializeAuthorCreditForAdmin(row.credit ?? null),
    mime_type: row.mime_type ?? 'image/webp',
    aspect_ratio: row.aspect_ratio ?? null,
    focal_point: parseFocalPointJson(row.focal_point_json ?? null),
    placeholder,
    variants,
    url: pickAdminUrl(variants),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    deleted_at: row.deleted_at ?? null,
  };
}

export const HERO_ALLOWED_VARIANTS = ['sm', 'md', 'lg'] as const;
export const THUMBNAIL_ALLOWED_VARIANTS = ['xs', 'sm'] as const;
export const AVATAR_ALLOWED_VARIANTS = ['xs', 'sm'] as const;
export const RECIPE_STEP_ALLOWED_VARIANTS = ['sm', 'md', 'lg'] as const;

export interface SnapshotPatch {
  alt?: string;
  caption?: string;
  credit?: unknown;
  placeholder?: string;
  focal_point?: { x: number; y: number };
  aspect_ratio?: string;
  variants?: SnapshotStorageVariants;
}

export function buildSnapshotPatch(mediaRow: {
  alt_text?: string | null;
  caption?: string | null;
  credit?: string | null;
  focal_point_json?: string | null;
  aspect_ratio?: string | null;
  variants_json?: string | null;
}): SnapshotPatch {
  const patch: SnapshotPatch = {
    alt: mediaRow.alt_text ?? undefined,
    caption: mediaRow.caption ?? undefined,
  };

  const credit = mediaRow.credit;
  if (credit) {
    try {
      patch.credit = JSON.parse(credit);
    } catch {
      // keep existing
    }
  }

  const fpJson = mediaRow.focal_point_json;
  if (fpJson) {
    try {
      const fp = JSON.parse(fpJson);
      if (typeof fp?.x === 'number' && typeof fp?.y === 'number') {
        patch.focal_point = fp;
      }
    } catch {
      // keep existing
    }
  }

  const ar = mediaRow.aspect_ratio;
  if (ar) {
    patch.aspect_ratio = ar;
  }

  const varJson = mediaRow.variants_json;
  if (varJson) {
    try {
      const normalized = normalizeMediaVariantsJson(varJson);
      patch.placeholder = normalized.placeholder;
      patch.variants = normalized.variants;
    } catch {
      // keep existing
    }
  }

  return patch;
}

export interface ApplyPatchOptions {
  omitCaptionCredit?: boolean;
}

export function applyPatchToSlot(
  slot: Record<string, unknown>,
  patch: SnapshotPatch,
  allowedVariantKeys: readonly SnapshotVariantKey[],
  options?: ApplyPatchOptions
): Record<string, unknown> {
  const updated = { ...slot };

  if (patch.alt !== undefined) updated.alt = patch.alt;

  if (options?.omitCaptionCredit) {
    delete updated.caption;
    delete updated.credit;
  } else {
    if (patch.caption !== undefined) updated.caption = patch.caption;
    if (patch.credit !== undefined) updated.credit = patch.credit;
  }

  if (patch.placeholder !== undefined) updated.placeholder = patch.placeholder;

  if (patch.focal_point !== undefined) updated.focal_point = patch.focal_point;
  if (patch.aspect_ratio !== undefined) updated.aspect_ratio = patch.aspect_ratio;

  if (patch.variants) {
    const newVariants: SnapshotStorageVariants = {};
    for (const key of allowedVariantKeys) {
      const source = patch.variants[key];
      if (source) {
        newVariants[key] = source;
      }
    }
    if (Object.keys(newVariants).length > 0) {
      updated.variants = newVariants;
    }
  }

  return updated;
}

export function buildCardImage(
  imagesJson: unknown,
  fallbackAlt: string
): {
  media_id?: number;
  alt: string;
  placeholder: string;
  variants: {
    xs: StorageImageVariant;
    sm: StorageImageVariant;
  };
} | null {
  const images = parseJsonRecord(imagesJson) || {};
  const slot = parseJsonRecord(images.thumbnail ?? images.hero);
  if (!slot) return null;

  const variantsSource = parseJsonRecord(slot.variants);
  if (!variantsSource) return null;

  const xs = normalizeSnapshotVariant(variantsSource.xs, 'xs');
  const sm = normalizeSnapshotVariant(variantsSource.sm, 'sm');
  if (!xs || !sm) return null;

  const mediaId = readNumber(slot, 'media_id') ?? readNumber(slot, 'mediaId');
  const alt = readString(slot, 'alt') || fallbackAlt;
  const placeholder = readString(slot, 'placeholder') || '';

  return {
    ...(typeof mediaId === 'number' ? { media_id: mediaId } : {}),
    alt,
    placeholder,
    variants: { xs, sm },
  };
}

