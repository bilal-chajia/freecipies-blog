import { describe, expect, it } from 'vitest';
import { stringifyStoredTemplateElements } from '../elementSerialization';
import type { TemplateElement } from '../../types/elements.types';

const CAMEL_CASE_KEY = /"[a-z]+[A-Z][a-zA-Z]*"\s*:/;

describe('TEMPLATE_JSON_CONTRACT conformance', () => {
  it('serialized elements contain zero camelCase keys', () => {
    const elements: TemplateElement[] = [
      {
        id: 'text-1', type: 'text', x: 0, y: 0, width: 200, height: 50,
        rotation: 0, locked: false,
        content: 'Hello', font_family: 'Inter', font_size: 64,
        text_align: 'center', line_height: 1.2, letter_spacing: 0.5,
        shadow: { enabled: true, color: '#000', blur: 4, offset_x: 1, offset_y: 2 },
        background: { color: '#fff', opacity: 0.8, padding: 8, border_radius: 4 },
      },
      {
        id: 'image_slot-1', type: 'image_slot', x: 0, y: 0, width: 300,
        height: 400, rotation: 0, locked: false,
        image_url: '/x.webp', source_type: 'upload', border_radius: 8,
        image_offset: { x: 1, y: 2 }, image_scale: 1.5, clip_radius: 4,
      },
      {
        id: 'shape-1', type: 'shape', x: 0, y: 0, width: 100, height: 100,
        rotation: 0, locked: false, shape_type: 'rect', fill: '#f00',
        stroke: '#000', stroke_width: 2, border_radius: 6,
      },
    ];
    const json = stringifyStoredTemplateElements(elements);
    expect(json).not.toMatch(CAMEL_CASE_KEY);
    expect(json).toContain('"image_slot"');
  });
});
