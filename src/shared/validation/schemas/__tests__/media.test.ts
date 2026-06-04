import { describe, expect, it } from 'vitest';
import { ConfirmUploadSchema, UpdateMediaSchema } from '../media';

const authorCredit = {
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
};

const variant = (name: string) => ({
  r2_key: `media/${name}.webp`,
  width: 720,
  height: 480,
  size_bytes: 12000,
});

describe('media validation schemas', () => {
  it('keeps snake_case confirm payloads in canonical snake_case', () => {
    const result = ConfirmUploadSchema.parse({
      upload_id: 'upload-1',
      base_name: 'avocado-toast',
      name: 'Avocado Toast',
      alt_text: 'Avocado toast on a plate',
      caption: 'Creamy avocado toast',
      credit: authorCredit,
      aspect_ratio: '3:2',
      focal_point: { x: 50, y: 45 },
      mime_type: 'image/webp',
      variants: {
        original: variant('original'),
        lg: variant('lg'),
        md: variant('md'),
        sm: variant('sm'),
        xs: variant('xs'),
      },
      placeholder: 'data:image/jpeg;base64,abc',
    });

    expect(result.upload_id).toBe('upload-1');
    expect(result.base_name).toBe('avocado-toast');
    expect(result.alt_text).toBe('Avocado toast on a plate');
    expect(result.aspect_ratio).toBe('3:2');
    expect(result.focal_point).toEqual({ x: 50, y: 45 });
    expect(result.mime_type).toBe('image/webp');
    expect(result.variants.md).toEqual({
      r2Key: 'media/md.webp',
      width: 720,
      height: 480,
      sizeBytes: 12000,
    });
  });

  it('keeps rejecting free-string media credit', () => {
    const result = ConfirmUploadSchema.safeParse({
      upload_id: 'upload-1',
      base_name: 'avocado-toast',
      name: 'Avocado Toast',
      alt_text: 'Avocado toast on a plate',
      caption: 'Creamy avocado toast',
      credit: 'Chef Maria salvador',
      mime_type: 'image/webp',
      variants: {
        original: variant('original'),
        lg: variant('lg'),
        md: variant('md'),
        sm: variant('sm'),
        xs: variant('xs'),
      },
      placeholder: 'data:image/jpeg;base64,abc',
    });

    expect(result.success).toBe(false);
  });

  it('keeps snake_case update payloads in canonical snake_case', () => {
    const result = UpdateMediaSchema.parse({
      alt_text: 'Updated alt',
      focal_point: { x: 25, y: 75 },
      aspect_ratio: '16:9',
      caption: 'Updated caption',
    });

    expect(result).toEqual({
      alt_text: 'Updated alt',
      focal_point: { x: 25, y: 75 },
      aspect_ratio: '16:9',
      caption: 'Updated caption',
    });
  });
});
