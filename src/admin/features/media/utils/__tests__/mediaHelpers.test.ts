import { describe, expect, it } from 'vitest';
import {
  isMediaItemImage,
  getDisplayedSizeBytes,
  formatDisplayedSize,
  getThumbnailUrl,
  getFullUrl
} from '../mediaHelpers';
import type { MediaLibraryItem } from '../mediaHelpers';

describe('mediaHelpers', () => {
  describe('isMediaItemImage', () => {
    it('returns true for image MIME types', () => {
      const item = {
        id: 1,
        name: 'test.png',
        mime_type: 'image/png',
        alt_text: '',
        caption: '',
        credit: '',
        variants_json: '{"variants":{},"placeholder":""}'
      } as unknown as MediaLibraryItem;
      expect(isMediaItemImage(item)).toBe(true);
    });

    it('returns false for video/other MIME types and extensions', () => {
      const item = {
        id: 2,
        name: 'video.mp4',
        mime_type: 'video/mp4',
        alt_text: '',
        caption: '',
        credit: '',
        variants_json: '{"variants":{},"placeholder":""}'
      } as unknown as MediaLibraryItem;
      expect(isMediaItemImage(item)).toBe(false);
    });
  });

  describe('size helpers', () => {
    it('correctly retrieves displayed size in bytes', () => {
      const item = {
        id: 3,
        name: 'test.jpg',
        mime_type: 'image/jpeg',
        alt_text: '',
        caption: '',
        credit: '',
        variants_json: JSON.stringify({
          variants: {
            xs: { url: '/api/images/test-xs.webp', width: 100, height: 100, size_bytes: 500 },
            sm: { url: '/api/images/test-sm.webp', width: 200, height: 200, size_bytes: 1500 }
          },
          placeholder: ''
        })
      } as unknown as MediaLibraryItem;
      expect(getDisplayedSizeBytes(item)).toBe(500); // xs is preferred as best variant
    });

    it('returns formatted size string', () => {
      const item = {
        id: 4,
        name: 'test.jpg',
        mime_type: 'image/jpeg',
        alt_text: '',
        caption: '',
        credit: '',
        variants_json: JSON.stringify({
          variants: {
            xs: { url: '/api/images/test-xs.webp', width: 100, height: 100, size_bytes: 1024 }
          },
          placeholder: ''
        })
      } as unknown as MediaLibraryItem;
      expect(formatDisplayedSize(item)).toBe('1 KB');
    });

    it('returns "-" for items with missing size info', () => {
      const item = {
        id: 5,
        name: 'test.jpg',
        mime_type: 'image/jpeg',
        alt_text: '',
        caption: '',
        credit: '',
        variants_json: '{"variants":{},"placeholder":""}'
      } as unknown as MediaLibraryItem;
      expect(formatDisplayedSize(item)).toBe('-');
    });
  });

  describe('url extraction', () => {
    const complexItem = {
      id: 6,
      name: 'pasta.jpg',
      mime_type: 'image/jpeg',
      alt_text: 'pasta',
      caption: '',
      credit: '',
      url: '/fallback.jpg',
      variants_json: JSON.stringify({
        variants: {
          xs: { url: '/api/images/pasta-xs.webp', width: 360, height: 240 },
          sm: { url: '/api/images/pasta-sm.webp', width: 720, height: 480 },
          md: { url: '/api/images/pasta-md.webp', width: 1200, height: 800 },
          lg: { url: '/api/images/pasta-lg.webp', width: 2048, height: 1365 }
        },
        placeholder: ''
      })
    } as unknown as MediaLibraryItem;

    it('extracts thumbnail size url', () => {
      expect(getThumbnailUrl(complexItem)).toBe('/api/images/pasta-xs.webp'); // getVariantForContainer('thumbnail', 'lg') maps to xs because it asks for target width 180 * retina density 2 = 360, which xs(360) satisfies perfectly
    });

    it('extracts full size url', () => {
      expect(getFullUrl(complexItem)).toBe('/api/images/pasta-lg.webp'); // getVariantForContainer('hero', 'xl') maps to lg because original is excluded
    });
  });
});
