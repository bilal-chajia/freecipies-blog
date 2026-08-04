import { describe, expect, it } from 'vitest';
import {
  MAX_SOCIAL_FEED_ITEMS,
  addSocialFeedItem,
  removeSocialFeedItem,
  reorderSocialFeedItems,
  updateSocialFeedItem,
} from '../social-feed-items';

describe('social feed item transforms', () => {
  it('adds the exact blank item without mutating input', () => {
    const items = [{ network: 'facebook' as const, caption: 'Dinner ideas', href: 'https://facebook.com/example', image: null }];

    const added = addSocialFeedItem(items);

    expect(added).toEqual([
      ...items,
      { network: 'instagram', caption: '', href: '', image: null },
    ]);
    expect(added).not.toBe(items);
    expect(items).toEqual([
      { network: 'facebook', caption: 'Dinner ideas', href: 'https://facebook.com/example', image: null },
    ]);
  });

  it('caps additions at twelve items', () => {
    const items = Array.from({ length: MAX_SOCIAL_FEED_ITEMS }, (_, index) => ({
      network: 'instagram' as const,
      caption: `Post ${index}`,
      href: `https://instagram.com/p/${index}`,
      image: null,
    }));

    expect(addSocialFeedItem(items)).toBe(items);
  });

  it('updates only the requested item without mutating input', () => {
    const items = [
      { network: 'instagram' as const, caption: 'First', href: 'https://instagram.com/p/first', image: null },
      { network: 'facebook' as const, caption: 'Second', href: 'https://facebook.com/second', image: null },
    ];

    const updated = updateSocialFeedItem(items, 1, { network: 'pinterest', caption: 'Pinned' });

    expect(updated).toEqual([
      { network: 'instagram', caption: 'First', href: 'https://instagram.com/p/first', image: null },
      { network: 'pinterest', caption: 'Pinned', href: 'https://facebook.com/second', image: null },
    ]);
    expect(updated).not.toBe(items);
    expect(items[1]).toEqual({
      network: 'facebook', caption: 'Second', href: 'https://facebook.com/second', image: null,
    });
  });

  it('returns the original array for an invalid removal', () => {
    const items = [{ network: 'instagram' as const, caption: 'First', href: 'https://instagram.com/p/first', image: null }];

    expect(removeSocialFeedItem(items, -1)).toBe(items);
  });

  it('reorders valid indexes without mutating input', () => {
    const items = [
      { network: 'instagram' as const, caption: 'First', href: 'https://instagram.com/p/first', image: null },
      { network: 'facebook' as const, caption: 'Second', href: 'https://facebook.com/second', image: null },
      { network: 'pinterest' as const, caption: 'Third', href: 'https://pinterest.com/pin/third', image: null },
    ];

    const reordered = reorderSocialFeedItems(items, 2, 0);

    expect(reordered).toEqual([items[2], items[0], items[1]]);
    expect(reordered).not.toBe(items);
    expect(items.map((item) => item.caption)).toEqual(['First', 'Second', 'Third']);
  });
});
