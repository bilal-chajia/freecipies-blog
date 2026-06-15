import { describe, expect, it } from 'vitest';
import { buildHomeJsonLd } from '../home-jsonld';

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
});
