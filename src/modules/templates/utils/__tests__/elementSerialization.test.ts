import { describe, expect, it } from 'vitest';
import {
  stringifyStoredTemplateElements,
  toEditorTemplateElements,
  toStoredTemplateElements,
} from '../elementSerialization';

describe('template element serialization', () => {
  it('serializes editor elements to stored snake_case JSON', () => {
    const stored = toStoredTemplateElements([
      {
        id: 'image-1',
        type: 'imageSlot',
        imageUrl: '/api/images/template-assets/example.webp',
        sourceType: 'upload',
        borderRadius: 8,
        imageOffset: { x: 10, y: 20 },
        width: 300,
        height: 400,
        x: 0,
        y: 0,
        rotation: 0,
        locked: false,
      },
      {
        id: 'text-1',
        type: 'text',
        fontFamily: 'Inter',
        fontSize: 64,
        textAlign: 'center',
        shadow: { enabled: true, offsetX: 1, offsetY: 2, blur: 4, color: '#000000' },
      },
    ]);

    expect(stored).toEqual([
      expect.objectContaining({
        type: 'image_slot',
        image_url: '/api/images/template-assets/example.webp',
        source_type: 'upload',
        border_radius: 8,
        image_offset: { x: 10, y: 20 },
      }),
      expect.objectContaining({
        type: 'text',
        font_family: 'Inter',
        font_size: 64,
        text_align: 'center',
        shadow: expect.objectContaining({ offset_x: 1, offset_y: 2 }),
      }),
    ]);
  });

  it('hydrates stored snake_case JSON back to editor elements', () => {
    const storedJson = JSON.stringify([
      {
        id: 'image-1',
        type: 'image_slot',
        image_url: '/api/images/template-assets/example.webp',
        source_type: 'upload',
        border_radius: 8,
      },
    ]);

    expect(toEditorTemplateElements(storedJson)).toEqual([
      expect.objectContaining({
        type: 'imageSlot',
        imageUrl: '/api/images/template-assets/example.webp',
        sourceType: 'upload',
        borderRadius: 8,
      }),
    ]);
  });

  it('stringifies stored elements as snake_case', () => {
    expect(stringifyStoredTemplateElements([{ id: 'text-1', type: 'text', fontSize: 32 }])).toBe(
      '[{"id":"text-1","type":"text","font_size":32}]'
    );
  });
});
