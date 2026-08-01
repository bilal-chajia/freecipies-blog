import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  collectSocialFeedNetworks,
  isSupportedSocialFeedNetwork,
  SOCIAL_FEED_CONSENT_KEY,
  SOCIAL_FEED_PROVIDER_SOURCES,
} from '../social-feed-embed-support';

describe('social feed embed support', () => {
  it('collects each supported network once in first-seen order', () => {
    expect(collectSocialFeedNetworks([
      'instagram',
      'pinterest',
      'instagram',
      'unsupported',
      'facebook',
      'pinterest',
    ])).toEqual(['instagram', 'pinterest', 'facebook']);
  });

  it('accepts only the exact supported network values', () => {
    expect(isSupportedSocialFeedNetwork('instagram')).toBe(true);
    expect(isSupportedSocialFeedNetwork('facebook')).toBe(true);
    expect(isSupportedSocialFeedNetwork('pinterest')).toBe(true);
    expect(isSupportedSocialFeedNetwork('Instagram')).toBe(false);
    expect(isSupportedSocialFeedNetwork('twitter')).toBe(false);
  });

  it('uses the session consent key and official provider sources', () => {
    expect(SOCIAL_FEED_CONSENT_KEY).toBe('homepage-social-feed-consent');
    expect(SOCIAL_FEED_PROVIDER_SOURCES.instagram).toBe('https://www.instagram.com/embed.js');
    expect(SOCIAL_FEED_PROVIDER_SOURCES.pinterest).toBe('https://assets.pinterest.com/js/pinit.js');
  });
});

describe('social feed SSR boundary', () => {
  it('keeps provider URLs and session storage out of the fallback component', async () => {
    const source = await readFile(new URL('../../components/home/SocialFeed.astro', import.meta.url), 'utf8');

    expect(source).not.toContain('https://www.instagram.com/embed.js');
    expect(source).not.toContain('https://connect.facebook.net/en_US/sdk.js');
    expect(source).not.toContain('https://assets.pinterest.com/js/pinit.js');
    expect(source).not.toContain('sessionStorage');
  });

  it('imports the browser embed module once from the home sections component', async () => {
    const source = await readFile(new URL('../../components/home/HomeSections.astro', import.meta.url), 'utf8');
    const matches = source.match(/import '@site\/scripts\/social-feed-embeds';/g) ?? [];

    expect(matches).toHaveLength(1);
  });
});
