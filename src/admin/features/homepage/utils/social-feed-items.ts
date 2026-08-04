import { arrayMove } from '@dnd-kit/sortable';
import type { HomepageResolvedSocialFeedItem } from '@modules/settings/types/settings.types';

export const MAX_SOCIAL_FEED_ITEMS = 12;

const isValidIndex = <T>(items: T[], index: number): boolean => (
  Number.isInteger(index) && index >= 0 && index < items.length
);

export function addSocialFeedItem(
  items: HomepageResolvedSocialFeedItem[],
): HomepageResolvedSocialFeedItem[] {
  return items.length >= MAX_SOCIAL_FEED_ITEMS
    ? items
    : [...items, { network: 'instagram', caption: '', href: '', image: null }];
}

export function updateSocialFeedItem(
  items: HomepageResolvedSocialFeedItem[],
  index: number,
  patch: Partial<HomepageResolvedSocialFeedItem>,
): HomepageResolvedSocialFeedItem[] {
  if (!isValidIndex(items, index)) return items;

  return items.map((item, itemIndex) => (
    itemIndex === index ? { ...item, ...patch } : item
  ));
}

export function removeSocialFeedItem(
  items: HomepageResolvedSocialFeedItem[],
  index: number,
): HomepageResolvedSocialFeedItem[] {
  if (!isValidIndex(items, index)) return items;
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function reorderSocialFeedItems(
  items: HomepageResolvedSocialFeedItem[],
  fromIndex: number,
  toIndex: number,
): HomepageResolvedSocialFeedItem[] {
  if (
    !isValidIndex(items, fromIndex)
    || !isValidIndex(items, toIndex)
    || fromIndex === toIndex
  ) {
    return items;
  }

  return arrayMove(items, fromIndex, toIndex);
}
