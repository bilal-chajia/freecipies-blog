import type { ImageVariantKey } from './image-contract';

const MEDIA_IMAGE_PREFIX = 'media/images';
const ASSET_ID_LENGTH = 8;

export function normalizeImageSlugBase(input: string | null | undefined): string {
  const normalized = (input || 'image')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80);

  return normalized || 'image';
}

export function normalizeImageAssetId(input: string | null | undefined): string {
  const normalized = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, ASSET_ID_LENGTH);

  return normalized || createImageAssetId();
}

export function createImageAssetId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(ASSET_ID_LENGTH);
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  let id = '';
  for (const byte of bytes) {
    id += alphabet[byte % alphabet.length];
  }
  return id;
}

export function normalizeImageExtension(input: string | null | undefined): string {
  const clean = (input || 'webp')
    .toLowerCase()
    .replace(/^\./, '')
    .replace(/[^a-z0-9]/g, '');

  return clean || 'webp';
}

export function buildMediaImageR2Key({
  slugBase,
  variant,
  assetId,
  extension,
}: {
  slugBase: string;
  variant: ImageVariantKey;
  assetId: string;
  extension: string;
}): string {
  const cleanSlugBase = normalizeImageSlugBase(slugBase);
  const cleanAssetId = normalizeImageAssetId(assetId);
  const cleanExtension = normalizeImageExtension(extension);

  return `${MEDIA_IMAGE_PREFIX}/${cleanSlugBase}-${variant}-${cleanAssetId}.${cleanExtension}`;
}
