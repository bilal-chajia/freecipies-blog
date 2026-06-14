import { describe, it, expect } from 'vitest';
import { checkPublishCompleteness } from '../publish-completeness';

const hero = { media_id: 1, alt: 'a', variants: { md: { r2_key: 'media/x.webp' } } };
const base = {
  type: 'article',
  headline: 'H',
  slug: 's',
  content_json: '{"blocks":[{"type":"paragraph"}]}',
  recipe_json: null,
  roundup_json: null,
  images_json: { hero },
};

describe('checkPublishCompleteness', () => {
  it('flags missing headline and slug for any type', () => {
    const issues = checkPublishCompleteness({ ...base, headline: '  ', slug: '' });
    expect(issues.join(' ')).toMatch(/headline/i);
    expect(issues.join(' ')).toMatch(/slug/i);
  });

  it('requires a hero image for every type', () => {
    expect(checkPublishCompleteness({ ...base, images_json: {} }).join(' ')).toMatch(/hero/i);
    expect(checkPublishCompleteness({ ...base, images_json: null }).join(' ')).toMatch(/hero/i);
    // an empty hero placeholder object is not a real image
    expect(checkPublishCompleteness({ ...base, images_json: { hero: {} } }).join(' ')).toMatch(/hero/i);
    // accepts a JSON-string images_json carrying a hero (the getArticleById shape)
    expect(checkPublishCompleteness({ ...base, images_json: JSON.stringify({ hero }) })).toEqual([]);
  });

  it('article needs at least one content block', () => {
    const empty = checkPublishCompleteness({ ...base, content_json: '{"blocks":[]}' });
    expect(empty.join(' ')).toMatch(/content/i);
    const ok = checkPublishCompleteness({ ...base, content_json: '{"blocks":[{"type":"paragraph"}]}' });
    expect(ok).toEqual([]);
  });

  it('recipe needs ingredients and instructions', () => {
    const r = { ...base, type: 'recipe' };
    expect(checkPublishCompleteness({ ...r, recipe_json: '{"ingredients":[],"instructions":[]}' }).length).toBeGreaterThan(0);
    expect(checkPublishCompleteness({ ...r, recipe_json: '{"ingredients":["x"],"instructions":["y"]}' })).toEqual([]);
  });

  it('roundup needs at least one item', () => {
    const ro = { ...base, type: 'roundup' };
    expect(checkPublishCompleteness({ ...ro, roundup_json: '{"items":[]}' }).length).toBeGreaterThan(0);
    expect(checkPublishCompleteness({ ...ro, roundup_json: '{"items":[{"title":"A"}]}' })).toEqual([]);
  });

  it('tolerates already-parsed objects and bad JSON (bad JSON = incomplete)', () => {
    expect(checkPublishCompleteness({ ...base, type: 'recipe', recipe_json: { ingredients: ['x'], instructions: ['y'] } })).toEqual([]);
    expect(checkPublishCompleteness({ ...base, type: 'recipe', recipe_json: '{bad' }).length).toBeGreaterThan(0);
  });
});
