import { describe, expect, it } from 'vitest';
import { buildContentImageSelection } from '../image-selection';

describe('buildContentImageSelection', () => {
  it('keeps resolved admin media variants visible in the editor', () => {
    const result = buildContentImageSelection({
      item: {
        id: 77,
        name: 'toast',
        altText: 'Avocado toast',
        caption: 'Ready to serve',
        credit: { type: 'author', name: 'Jane Doe' },
        placeholder: 'data:image/webp;base64,abc',
        aspectRatio: '3:2',
        focalPoint: { x: 45, y: 55 },
        variants: {
          sm: { url: '/api/images/media/toast-sm.webp', width: 720, height: 480, size_bytes: 202 },
          md: { url: '/api/images/media/toast-md.webp', width: 1200, height: 800, size_bytes: 303 },
        },
      },
      currentProps: {},
      fallbackBlockId: 'image-block',
    });

    expect(result.props).toMatchObject({
      imageRef: 'body-image-77',
      url: '/api/images/media/toast-md.webp',
      mediaId: '77',
      alt: 'Avocado toast',
      caption: 'Ready to serve',
      credit: 'Jane Doe',
      width: 1200,
      height: 800,
    });
    expect(JSON.parse(result.props.variantsJson)).toEqual({
      sm: { url: '/api/images/media/toast-sm.webp', width: 720, height: 480, size_bytes: 202 },
      md: { url: '/api/images/media/toast-md.webp', width: 1200, height: 800, size_bytes: 303 },
    });
    expect(result.slot).toMatchObject({
      media_id: 77,
      alt: 'Avocado toast',
      caption: 'Ready to serve',
      credit: { type: 'author', name: 'Jane Doe' },
      placeholder: 'data:image/webp;base64,abc',
      aspect_ratio: '3:2',
      focal_point: { x: 45, y: 55 },
      variants: {
        sm: { url: '/api/images/media/toast-sm.webp', width: 720, height: 480, size_bytes: 202 },
        md: { url: '/api/images/media/toast-md.webp', width: 1200, height: 800, size_bytes: 303 },
      },
    });
  });

  it('reuses an existing image ref when replacing an image', () => {
    const result = buildContentImageSelection({
      item: {
        id: 88,
        alt_text: 'Replacement',
        variants: {
          sm: { url: '/api/images/media/replacement-sm.webp', width: 720, height: 480 },
        },
      },
      currentProps: { imageRef: 'body-image-old', width: 640 },
      fallbackBlockId: 'image-block',
    });

    expect(result.props.imageRef).toBe('body-image-old');
    expect(result.props.url).toBe('/api/images/media/replacement-sm.webp');
    expect(result.slot.media_id).toBe(88);
  });
});
