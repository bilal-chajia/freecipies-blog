import { describe, expect, it } from 'vitest';
import {
  buildMediaImageR2Key,
  createImageAssetId,
  normalizeImageAssetId,
  normalizeImageSlugBase,
} from '../r2-naming';

describe('R2 media image naming', () => {
  it('builds canonical R2 keys for all editorial image variants', () => {
    expect(buildMediaImageR2Key({
      slugBase: 'Avocado Toast!',
      variant: 'xs',
      assetId: 'm8f3a91c',
      extension: '.WEBP',
    })).toBe('media/images/avocado-toast-xs-m8f3a91c.webp');

    expect(buildMediaImageR2Key({
      slugBase: 'Avocado Toast!',
      variant: 'original',
      assetId: 'm8f3a91c',
      extension: 'jpg',
    })).toBe('media/images/avocado-toast-original-m8f3a91c.jpg');
  });

  it('normalizes slug bases and asset ids without unsafe characters', () => {
    expect(normalizeImageSlugBase('Crème Brûlée / Hero Image')).toBe('creme-brulee-hero-image');
    expect(normalizeImageAssetId('1769389999101-u8dfq31k')).toBe('17693899');
  });

  it('creates short lowercase asset ids', () => {
    expect(createImageAssetId()).toMatch(/^[a-z0-9]{8}$/);
  });
});
