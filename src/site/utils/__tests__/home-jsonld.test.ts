import { describe, expect, it } from 'vitest';
import { buildHomeJsonLd, serializeJsonLd } from '../home-jsonld';

const identity = { site_name: 'Freecipes', site_url: 'https://x.test', tagline: 'Good food', locale: 'en-US' };
const organization = { name: 'Freecipes', url: 'https://x.test', logo_url: 'https://x.test/logo.png', same_as: ['https://instagram.com/x'], contact_email: 'c@x.test' };

describe('buildHomeJsonLd', () => {
  it('emits a WebSite node with a SearchAction', () => {
    const [website] = buildHomeJsonLd({ identity, organization, socialLinks: [], searchUrlTemplate: 'https://x.test/recipes?q={search_term_string}' });
    expect(website['@type']).toBe('WebSite');
    expect(website.url).toBe('https://x.test');
    const action = website.potentialAction as Record<string, unknown> & { target: Record<string, unknown> };
    expect(action['@type']).toBe('SearchAction');
    expect(action.target.urlTemplate).toContain('{search_term_string}');
  });

  it('uses the canonical recipe search parameter', () => {
    const [website] = buildHomeJsonLd({
      identity,
      organization,
      socialLinks: [],
      searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
    });
    const action = website.potentialAction as { target: { urlTemplate: string } };
    expect(action.target.urlTemplate).toBe('https://x.test/recipes?search={search_term_string}');
  });

  it('emits an Organization node merging same_as with social links (deduped)', () => {
    const nodes = buildHomeJsonLd({
      identity, organization,
      socialLinks: [{ network: 'instagram', url: 'https://instagram.com/x', label: '@x' }, { network: 'youtube', url: 'https://youtube.com/x', label: 'YT' }],
      searchUrlTemplate: 'https://x.test/recipes?q={search_term_string}',
    });
    const org = nodes.find((n) => n['@type'] === 'Organization');
    expect(org).toBeDefined();
    expect(org!.sameAs).toEqual(['https://instagram.com/x', 'https://youtube.com/x']);
  });

  it('emits a deduplicated ItemList in visible order with absolute URLs', () => {
    const nodes = buildHomeJsonLd({
      identity,
      organization,
      socialLinks: [],
      searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
      recipes: [
        { id: 1, name: 'Hero', url: '/recipes/hero' },
        { id: 1, name: 'Hero duplicate', url: '/recipes/hero' },
        { id: 2, name: 'Featured', url: '/recipes/featured' },
      ],
    });
    const itemList = nodes.find((node) => node['@type'] === 'ItemList');
    expect(itemList?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Hero', url: 'https://x.test/recipes/hero' },
      { '@type': 'ListItem', position: 2, name: 'Featured', url: 'https://x.test/recipes/featured' },
    ]);
  });

  it('deduplicates recipes without a positive ID by URL', () => {
    const nodes = buildHomeJsonLd({
      identity,
      organization,
      socialLinks: [],
      searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
      recipes: [
        { id: 0, name: 'Fallback', url: '/recipes/fallback' },
        { id: -1, name: 'Fallback duplicate', url: '/recipes/fallback' },
      ],
    });
    const itemList = nodes.find((node) => node['@type'] === 'ItemList');
    expect(itemList?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Fallback', url: 'https://x.test/recipes/fallback' },
    ]);
  });

  it('emits FAQPage only for supplied renderable items', () => {
    const nodes = buildHomeJsonLd({
      identity,
      organization,
      socialLinks: [],
      searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
      faqItems: [{ question: 'Q?', answer: 'A.' }],
    });
    expect(nodes.find((node) => node['@type'] === 'FAQPage')).toMatchObject({
      mainEntity: [{
        '@type': 'Question',
        name: 'Q?',
        acceptedAnswer: { '@type': 'Answer', text: 'A.' },
      }],
    });
  });

  it('omits ItemList and FAQPage for empty inputs', () => {
    const nodes = buildHomeJsonLd({
      identity,
      organization,
      socialLinks: [],
      searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
      recipes: [],
      faqItems: [],
    });
    expect(nodes.some((node) => node['@type'] === 'ItemList')).toBe(false);
    expect(nodes.some((node) => node['@type'] === 'FAQPage')).toBe(false);
  });
});

describe('serializeJsonLd', () => {
  it('escapes less-than characters', () => {
    expect(serializeJsonLd({ '@type': 'Thing', value: '</script>' }))
      .toContain('\\u003c/script>');
  });
});
