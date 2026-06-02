import { getVariantMap, parseVariantsJson, resolveVariantUrl } from '@shared/types/images';

type VariantKey = 'xs' | 'sm' | 'md' | 'lg' | 'original';
type Variant = {
  url?: string;
  r2_key?: string; // boundary-allow: input-only field, resolved to a public url via resolveVariantUrl; never persisted/exposed by admin
  r2Key?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  sizeBytes?: number;
};

type MediaSelectionItem = {
  id?: string | number | null;
  url?: string;
  name?: string | null;
  alt?: string | null;
  altText?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  credit?: unknown;
  placeholder?: string | null;
  aspectRatio?: string | null;
  aspect_ratio?: string | null;
  focalPoint?: { x?: number; y?: number } | null;
  focal_point?: { x?: number; y?: number } | null;
  variants?: unknown;
  variantsJson?: unknown;
  variants_json?: unknown;
  width?: number;
  height?: number;
};

type BlockImageProps = Record<string, unknown>;

type ImageSelectionInput = {
  item: MediaSelectionItem;
  currentProps: BlockImageProps;
  fallbackBlockId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeVariant(value: unknown): Variant | null {
  if (!isRecord(value)) return null;
  const url = resolveVariantUrl(value as Variant);
  const width = typeof value.width === 'number' ? value.width : undefined;
  const height = typeof value.height === 'number' ? value.height : undefined;
  const sizeBytes = typeof value.size_bytes === 'number'
    ? value.size_bytes
    : typeof value.sizeBytes === 'number'
      ? value.sizeBytes
      : undefined;

  if (!url || typeof width !== 'number' || typeof height !== 'number') return null;

  return {
    url,
    width,
    height,
    ...(typeof sizeBytes === 'number' ? { size_bytes: sizeBytes } : {}),
  };
}

function normalizeVariants(item: MediaSelectionItem): Partial<Record<VariantKey, Variant>> {
  const parsed = parseVariantsJson(item);
  const rawVariants = getVariantMap(parsed);
  const variants: Partial<Record<VariantKey, Variant>> = {};
  const keys: VariantKey[] = ['xs', 'sm', 'md', 'lg', 'original'];

  for (const key of keys) {
    const variant = normalizeVariant((rawVariants as Record<string, unknown>)[key]);
    if (variant) variants[key] = variant;
  }

  return variants;
}

function readCreditName(credit: unknown): string {
  if (!isRecord(credit)) return '';
  return typeof credit.name === 'string' ? credit.name : '';
}

function serializeCredit(credit: unknown): string {
  return isRecord(credit) && credit.type === 'author' ? JSON.stringify(credit) : '{}';
}

function readFocalPoint(item: MediaSelectionItem): { x: number; y: number } | undefined {
  const source = item.focal_point ?? item.focalPoint;
  if (!source) return undefined;
  const x = typeof source.x === 'number' ? source.x : undefined;
  const y = typeof source.y === 'number' ? source.y : undefined;
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
}

function pickPreviewVariant(variants: Partial<Record<VariantKey, Variant>>): Variant | null {
  return variants.md ?? variants.lg ?? variants.sm ?? variants.xs ?? variants.original ?? null;
}

export function buildContentImageSelection({
  item,
  currentProps,
  fallbackBlockId,
}: ImageSelectionInput) {
  const variants = normalizeVariants(item);
  const bestVariant = pickPreviewVariant(variants);
  const imageRef = typeof currentProps.imageRef === 'string' && currentProps.imageRef
    ? currentProps.imageRef
    : `body-image-${item.id || fallbackBlockId}`;
  const alt = item.altText ?? item.alt_text ?? item.alt ?? item.name ?? '';
  const caption = item.caption ?? '';
  const aspectRatio = item.aspect_ratio ?? item.aspectRatio ?? undefined;
  const focalPoint = readFocalPoint(item);
  const mediaId = typeof item.id === 'number' ? item.id : Number(item.id) || item.id || imageRef;
  const url = bestVariant?.url ?? item.url ?? '';
  const width = (bestVariant?.width ?? item.width ?? Number(currentProps.width)) || 512;
  const height = (bestVariant?.height ?? item.height ?? Number(currentProps.height)) || 0;

  const slot = {
    media_id: mediaId,
    alt,
    caption,
    credit: item.credit ?? null,
    ...(item.placeholder ? { placeholder: item.placeholder } : {}),
    ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
    ...(focalPoint ? { focal_point: focalPoint } : {}),
    variants,
  };

  return {
    imageRef,
    slot,
    props: {
      ...currentProps,
      imageRef,
      url,
      mediaId: item.id?.toString() || '',
      alt,
      caption,
      credit: readCreditName(item.credit),
      creditJson: serializeCredit(item.credit),
      width,
      height,
      variantsJson: JSON.stringify(variants),
    },
  };
}
