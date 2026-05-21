import { describe, expect, it } from 'vitest';
import {
  buildAuthorCreditSnapshot,
  normalizeImageSnapshotContainer,
  normalizeMediaVariantsJson,
  normalizeStoredAuthorCreditSnapshot,
  serializeAdminMediaPayload,
  buildSnapshotPatch,
  applyPatchToSlot,
  buildCardImage,
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

describe('buildSnapshotPatch', () => {
  it('handles empty/null fields correctly', () => {
    const patch = buildSnapshotPatch({
      altText: null,
      caption: null,
      credit: null,
      focalPointJson: null,
      aspectRatio: null,
      variantsJson: null,
    });
    expect(patch).toEqual({
      alt: undefined,
      caption: undefined,
    });
  });

  it('parses valid metadata and variants successfully', () => {
    const mediaRow = {
      altText: 'Some Alt',
      caption: 'Some Caption',
      credit: '{"type":"author","id":1,"name":"Alice"}',
      focalPointJson: '{"x":30,"y":70}',
      aspectRatio: '16:9',
      variantsJson: JSON.stringify({
        variants: {
          xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
          sm: { r2_key: 'media/sm.webp', width: 720, height: 480 },
          md: { r2_key: 'media/md.webp', width: 1200, height: 800 },
          lg: { r2_key: 'media/lg.webp', width: 2048, height: 1365 },
          original: { r2_key: 'media/original.jpg', width: 3000, height: 2000 },
        },
        placeholder: 'data:image/webp;base64,abc',
      }),
    };

    const patch = buildSnapshotPatch(mediaRow);
    expect(patch).toEqual({
      alt: 'Some Alt',
      caption: 'Some Caption',
      credit: { type: 'author', id: 1, name: 'Alice' },
      focal_point: { x: 30, y: 70 },
      aspect_ratio: '16:9',
      placeholder: 'data:image/webp;base64,abc',
      variants: {
        xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
        sm: { r2_key: 'media/sm.webp', width: 720, height: 480 },
        md: { r2_key: 'media/md.webp', width: 1200, height: 800 },
        lg: { r2_key: 'media/lg.webp', width: 2048, height: 1365 },
        original: { r2_key: 'media/original.jpg', width: 3000, height: 2000 },
      },
    });
  });

  it('safely catches parsing errors and ignores malformed inputs', () => {
    const patch = buildSnapshotPatch({
      altText: 'Alt',
      credit: '{invalid-json}',
      focalPointJson: '{invalid-json}',
      variantsJson: '{invalid-json}',
    });
    expect(patch).toEqual({
      alt: 'Alt',
      caption: undefined,
    });
  });

  it('supports snake_case fields of database rows', () => {
    const patch = buildSnapshotPatch({
      altText: 'Alt',
      focal_point_json: '{"x":10,"y":20}',
      aspect_ratio: '4:3',
      variants_json: JSON.stringify({
        variants: {
          xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
          sm: { r2_key: 'media/sm.webp', width: 720, height: 480 },
          md: { r2_key: 'media/md.webp', width: 1200, height: 800 },
          lg: { r2_key: 'media/lg.webp', width: 2048, height: 1365 },
          original: { r2_key: 'media/original.jpg', width: 3000, height: 2000 },
        },
        placeholder: 'data:image/webp;base64,abc',
      }),
    });

    expect(patch.focal_point).toEqual({ x: 10, y: 20 });
    expect(patch.aspect_ratio).toBe('4:3');
    expect(patch.placeholder).toBe('data:image/webp;base64,abc');
  });
});

describe('applyPatchToSlot', () => {
  it('applies basic updates to an existing slot', () => {
    const slot = {
      media_id: 12,
      alt: 'Old Alt',
      placeholder: 'old-placeholder',
      variants: {
        xs: { r2_key: 'old-xs.webp', width: 100, height: 100 },
      },
    };

    const patch = {
      alt: 'New Alt',
      caption: 'New Caption',
      credit: { name: 'Bob' },
      placeholder: 'new-placeholder',
    };

    const updated = applyPatchToSlot(slot, patch, ['xs', 'sm']);
    expect(updated).toEqual({
      media_id: 12,
      alt: 'New Alt',
      caption: 'New Caption',
      credit: { name: 'Bob' },
      placeholder: 'new-placeholder',
      variants: {
        xs: { r2_key: 'old-xs.webp', width: 100, height: 100 },
      },
    });
  });

  it('updates and filters variants based on allowed keys only', () => {
    const slot = {
      media_id: 12,
      variants: {
        xs: { r2_key: 'old-xs.webp', width: 100, height: 100 },
      },
    };

    const patch = {
      variants: {
        xs: { r2_key: 'new-xs.webp', width: 100, height: 100 },
        sm: { r2_key: 'new-sm.webp', width: 200, height: 200 },
        md: { r2_key: 'new-md.webp', width: 300, height: 300 },
      },
    };

    const updated = applyPatchToSlot(slot, patch, ['sm', 'md']);
    expect(updated.variants).toEqual({
      sm: { r2_key: 'new-sm.webp', width: 200, height: 200 },
      md: { r2_key: 'new-md.webp', width: 300, height: 300 },
    });
    expect((updated.variants as any).xs).toBeUndefined();
  });

  it('preserves focal_point and aspect_ratio when present in patch', () => {
    const slot = { media_id: 5 };
    const patch = {
      focal_point: { x: 50, y: 50 },
      aspect_ratio: '1:1',
    };
    const updated = applyPatchToSlot(slot, patch, []);
    expect(updated.focal_point).toEqual({ x: 50, y: 50 });
    expect(updated.aspect_ratio).toBe('1:1');
  });
});

describe('buildCardImage', () => {
  it('returns null if imagesJson is empty or has no valid slots', () => {
    expect(buildCardImage(null, 'Fallback')).toBeNull();
    expect(buildCardImage('{}', 'Fallback')).toBeNull();
  });

  it('extracts thumbnail slot and builds variants xs and sm', () => {
    const imagesJson = JSON.stringify({
      thumbnail: {
        media_id: 45,
        alt: 'Thumbnail Alt',
        placeholder: 'thumb-placeholder',
        variants: {
          xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
          sm: { r2_key: 'media/sm.webp', width: 720, height: 480 },
        },
      },
    });

    const res = buildCardImage(imagesJson, 'Fallback');
    expect(res).toEqual({
      media_id: 45,
      alt: 'Thumbnail Alt',
      placeholder: 'thumb-placeholder',
      variants: {
        xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
        sm: { r2_key: 'media/sm.webp', width: 720, height: 480 },
      },
    });
  });

  it('falls back to hero slot if thumbnail is missing', () => {
    const imagesJson = JSON.stringify({
      hero: {
        mediaId: 99,
        variants: {
          xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
          sm: { r2_key: 'media/sm.webp', width: 720, height: 480 },
        },
      },
    });

    const res = buildCardImage(imagesJson, 'My Fallback');
    expect(res).toEqual({
      media_id: 99,
      alt: 'My Fallback',
      placeholder: '',
      variants: {
        xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
        sm: { r2_key: 'media/sm.webp', width: 720, height: 480 },
      },
    });
  });

  it('returns null if xs or sm variant is missing', () => {
    const imagesJson = JSON.stringify({
      thumbnail: {
        variants: {
          xs: { r2_key: 'media/xs.webp', width: 360, height: 240 },
        },
      },
    });
    expect(buildCardImage(imagesJson, 'Fallback')).toBeNull();
  });
});

