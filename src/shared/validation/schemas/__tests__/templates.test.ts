import { describe, expect, it } from 'vitest';
import { CreateTemplateSchema, TemplateThumbnailUploadFields } from '../templates';

describe('template validation schemas', () => {
  it('accepts snake_case API payloads', () => {
    const result = CreateTemplateSchema.parse({
      slug: 'recipe-pin',
      name: 'Recipe Pin',
      background_color: '#ffffff',
      thumbnail_url: '/api/images/template-assets/recipe-pin.webp',
      elements_json: [{ id: 'text-1', type: 'text', font_size: 48 }],
      is_active: true,
    });

    expect(result.elements_json).toEqual([{ id: 'text-1', type: 'text', font_size: 48 }]);
  });

  it('rejects camelCase API payload keys', () => {
    expect(() =>
      CreateTemplateSchema.parse({
        slug: 'recipe-pin',
        name: 'Recipe Pin',
        backgroundColor: '#ffffff',
        elements_json: [],
      })
    ).toThrow();
  });

  it('accepts snake_case thumbnail upload fields', () => {
    expect(TemplateThumbnailUploadFields.parse({ template_slug: 'recipe-pin' })).toEqual({
      template_slug: 'recipe-pin',
    });
  });

  it('rejects camelCase thumbnail upload fields', () => {
    expect(() => TemplateThumbnailUploadFields.parse({ templateSlug: 'recipe-pin' })).toThrow();
  });
});
