import { describe, expect, it } from 'vitest';
import {
  buildAuthorCreditSnapshot,
  normalizeImageSnapshotContainer,
  normalizeMediaVariantsJson,
  normalizeStoredAuthorCreditSnapshot,
  serializeAdminMediaPayload,
} from '../image-contract';

const legacyUploadVariants = {
  xs: { r2Key: 'media/image-xs.webp', width: 360, height: 240, sizeBytes: 101, url: '/api/images/media/image-xs.webp' },
  sm: { r2Key: 'media/image-sm.webp', width: 720, height: 480, sizeBytes: 202, url: '/api/images/media/image-sm.webp' },
  md: { r2Key: 'media/image-md.webp', width: 1200, height: 800, sizeBytes: 303, url: '/api/images/media/image-md.webp' },
  lg: { r2Key: 'media/image-lg.webp', width: 2048, height: 1365, sizeBytes: 404, url: '/api/images/media/image-lg.webp' },
  original: { r2Key: 'media/image-original.jpg', width: 3000, height: 2000, sizeBytes: 505, url: '/api/images/media/image-original.jpg' },
};

const storedCredit = {
  type: 'author',
  id: 1,
  name: 'Chef Maria salvador',
  slug: 'chef-maria',
  avatar: {
    media_id: 70,
    alt: 'Chef Maria salvador',
    variants: {
      xs: { r2_key: 'media/maria-xs.webp', width: 50, height: 50, size_bytes: 906 },
      sm: { r2_key: 'media/maria-sm.webp', width: 100, height: 100, size_bytes: 2058 },
    },
  },
} as const;

describe('normalizeMediaVariantsJson', () => {
  it('stores required variants with r2_key and size_bytes, never urls or sizeBytes', () => {
    const result = normalizeMediaVariantsJson({
      variants: legacyUploadVariants,
      placeholder: 'data:image/webp;base64,abc',
    });

    expect(Object.keys(result.variants)).toEqual(['xs', 'sm', 'md', 'lg', 'original']);
    expect(result.placeholder).toBe('data:image/webp;base64,abc');
    expect(result.variants.sm).toEqual({
      r2_key: 'media/image-sm.webp',
      width: 720,
      height: 480,
      size_bytes: 202,
    });
    expect(JSON.stringify(result)).not.toContain('sizeBytes');
    expect(JSON.stringify(result)).not.toContain('"url"');
  });

  it('requires placeholder and all canonical image variants', () => {
    expect(() => normalizeMediaVariantsJson({
      variants: { ...legacyUploadVariants, lg: undefined },
      placeholder: 'data:image/webp;base64,abc',
    })).toThrow(/lg/);

    expect(() => normalizeMediaVariantsJson({
      variants: legacyUploadVariants,
      placeholder: '',
    })).toThrow(/placeholder/);
  });
});

describe('normalizeImageSnapshotContainer', () => {
  it('normalizes canonical article hero snapshots', () => {
    const result = normalizeImageSnapshotContainer('article', {
      hero: {
        media_id: 7,
        alt: 'Hero',
        aspectRatio: '16:9',
        placeholder: 'snapshot-copy',
        variants: {
          sm: { r2_key: 'media/image-sm.webp', url: '/api/images/media/image-sm.webp', width: 720, height: 480, sizeBytes: 202 },
          md: { r2_key: 'media/image-md.webp', url: '/api/images/media/image-md.webp', width: 1200, height: 800, sizeBytes: 303 },
          original: { r2_key: 'media/image-original.jpg', url: '/api/images/media/image-original.jpg', width: 3000, height: 2000, sizeBytes: 505 },
        },
      },
      pinterest: {
        variants: {
          sm: { url: '/api/images/pins/old.webp', width: 720, height: 1080 },
        },
      },
    });

    expect(result).toEqual({
      hero: {
        media_id: 7,
        alt: 'Hero',
        aspect_ratio: '16:9',
        placeholder: 'snapshot-copy',
        variants: {
          sm: { r2_key: 'media/image-sm.webp', width: 720, height: 480, size_bytes: 202 },
          md: { r2_key: 'media/image-md.webp', width: 1200, height: 800, size_bytes: 303 },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain('cover');
    expect(JSON.stringify(result)).not.toContain('pinterest');
    expect(JSON.stringify(result)).not.toContain('original');
    expect(JSON.stringify(result)).not.toContain('"url"');
    expect(JSON.stringify(result)).not.toContain('sizeBytes');
  });

  it('does not use author banner as a hero fallback', () => {
    const result = normalizeImageSnapshotContainer('author', {
      banner: {
        alt: 'Profile banner',
        variants: {
          sm: { r2_key: 'media/banner-sm.webp', width: 720, height: 240 },
        },
      },
      avatar: {
        alt: 'Avatar',
        variants: {
          xs: { r2_key: 'media/avatar-xs.webp', width: 120, height: 120 },
          sm: { r2_key: 'media/avatar-sm.webp', width: 240, height: 240 },
        },
      },
    });

    expect(result.hero).toBeUndefined();
    expect(result.avatar?.variants).toEqual({
      xs: { r2_key: 'media/avatar-xs.webp', width: 120, height: 120 },
      sm: { r2_key: 'media/avatar-sm.webp', width: 240, height: 240 },
    });
    expect('banner' in result).toBe(false);
  });
});

describe('serializeAdminMediaPayload', () => {
  it('builds media.credit from an author row as serialized storage JSON input', () => {
    const credit = buildAuthorCreditSnapshot({
      id: 1,
      name: 'Chef Maria salvador',
      slug: 'chef-maria',
      imagesJson: JSON.stringify({ avatar: storedCredit.avatar }),
    });

    expect(credit).toEqual(storedCredit);
    expect(JSON.stringify(credit)).not.toContain('"url"');
  });

  it('validates stored author credit snapshots and rejects strings', () => {
    expect(normalizeStoredAuthorCreditSnapshot(storedCredit)).toEqual(storedCredit);
    expect(() => normalizeStoredAuthorCreditSnapshot('Chef Maria salvador')).toThrow(/media\.credit/);
  });

  it('normalizes admin author credit urls back to stored R2 keys', () => {
    expect(normalizeStoredAuthorCreditSnapshot({
      type: 'author',
      id: 1,
      name: 'Chef Maria salvador',
      slug: 'chef-maria',
      avatar: {
        media_id: 70,
        alt: 'Chef Maria salvador',
        variants: {
          xs: { url: '/api/images/media/maria-xs.webp', width: 50, height: 50, size_bytes: 906 },
          sm: { url: '/api/images/media/maria-sm.webp', width: 100, height: 100, size_bytes: 2058 },
        },
      },
    })).toEqual(storedCredit);
  });

  it('exposes urls for admin consumption without r2_key', () => {
    const payload = serializeAdminMediaPayload({
      id: 42,
      name: 'image',
      altText: 'Alt',
      caption: null,
      credit: JSON.stringify(storedCredit),
      mimeType: 'image/webp',
      aspectRatio: '3:2',
      variantsJson: JSON.stringify({
        variants: legacyUploadVariants,
        placeholder: 'data:image/webp;base64,abc',
      }),
      focalPointJson: '{"x":45,"y":55}',
      createdAt: '2026-05-04 12:00:00',
      updatedAt: '2026-05-04 12:00:00',
      deletedAt: null,
    });

    expect(payload.url).toBe('/api/images/media/image-sm.webp');
    expect(payload.variants.sm).toEqual({
      url: '/api/images/media/image-sm.webp',
      width: 720,
      height: 480,
      size_bytes: 202,
    });
    expect(payload.placeholder).toBe('data:image/webp;base64,abc');
    expect(payload.credit).toEqual({
      type: 'author',
      id: 1,
      name: 'Chef Maria salvador',
      slug: 'chef-maria',
      avatar: {
        media_id: 70,
        alt: 'Chef Maria salvador',
        variants: {
          xs: { url: '/api/images/media/maria-xs.webp', width: 50, height: 50, size_bytes: 906 },
          sm: { url: '/api/images/media/maria-sm.webp', width: 100, height: 100, size_bytes: 2058 },
        },
      },
    });
    expect(JSON.stringify(payload)).not.toContain('r2_key');
    expect(JSON.stringify(payload)).not.toContain('sizeBytes');
  });
});
