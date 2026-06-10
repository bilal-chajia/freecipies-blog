import { describe, expect, it } from 'vitest';
import {
  parseStoredTemplateElements,
  stringifyStoredTemplateElements,
} from '../elementSerialization';

describe('template element serialization (canonical snake_case)', () => {
  it('round-trips elements identically — no key conversion', () => {
    const elements = [
      {
        id: 'image_slot-1',
        type: 'image_slot',
        image_url: '/api/images/template-assets/example.webp',
        source_type: 'upload',
        border_radius: 8,
        image_offset: { x: 10, y: 20 },
        x: 0, y: 0, width: 300, height: 400, rotation: 0, locked: false,
      },
      {
        id: 'text-1',
        type: 'text',
        font_family: 'Inter',
        font_size: 64,
        text_align: 'center',
        shadow: { enabled: true, offset_x: 1, offset_y: 2, blur: 4, color: '#000000' },
        x: 0, y: 0, width: 200, height: 50, rotation: 0, locked: false,
      },
    ];
    expect(parseStoredTemplateElements(stringifyStoredTemplateElements(elements as never))).toEqual(elements);
  });

  it('parses stored snake_case JSON as-is', () => {
    const stored = JSON.stringify([
      { id: 'image_slot-1', type: 'image_slot', image_url: '/x.webp', source_type: 'upload', border_radius: 8 },
    ]);
    expect(parseStoredTemplateElements(stored)).toEqual([
      { id: 'image_slot-1', type: 'image_slot', image_url: '/x.webp', source_type: 'upload', border_radius: 8 },
    ]);
  });

  it('returns [] for null, empty, or invalid JSON', () => {
    expect(parseStoredTemplateElements(null)).toEqual([]);
    expect(parseStoredTemplateElements('')).toEqual([]);
    expect(parseStoredTemplateElements('{not json')).toEqual([]);
    expect(parseStoredTemplateElements('{"not":"array"}')).toEqual([]);
  });

  it('accepts an already-parsed array', () => {
    expect(parseStoredTemplateElements([{ id: 'a', type: 'text' }] as never)).toEqual([{ id: 'a', type: 'text' }]);
  });
});
