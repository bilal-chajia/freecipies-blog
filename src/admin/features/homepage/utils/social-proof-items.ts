import { arrayMove } from '@dnd-kit/sortable';
import type {
  HomepageResolvedSocialProofLogo,
  HomepageSocialProofStat,
  HomepageSocialProofTestimonial,
} from '@modules/settings/types/settings.types';

export const MAX_SOCIAL_PROOF_STATS = 4;
export const MAX_SOCIAL_PROOF_TESTIMONIALS = 6;
export const MAX_SOCIAL_PROOF_LOGOS = 6;

const isValidIndex = <T>(items: T[], index: number): boolean => (
  Number.isInteger(index) && index >= 0 && index < items.length
);

function addItem<T>(items: T[], maximum: number, item: T): T[] {
  return items.length >= maximum ? items : [...items, item];
}

function updateItem<T>(items: T[], index: number, patch: Partial<T>): T[] {
  if (!isValidIndex(items, index)) return items;

  return items.map((item, itemIndex) => (
    itemIndex === index ? { ...item, ...patch } : item
  ));
}

function removeItem<T>(items: T[], index: number): T[] {
  if (!isValidIndex(items, index)) return items;
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    !isValidIndex(items, fromIndex)
    || !isValidIndex(items, toIndex)
    || fromIndex === toIndex
  ) {
    return items;
  }

  return arrayMove(items, fromIndex, toIndex);
}

export function addSocialProofStat(stats: HomepageSocialProofStat[]): HomepageSocialProofStat[] {
  return addItem(stats, MAX_SOCIAL_PROOF_STATS, { value: '', label: '' });
}

export function updateSocialProofStat(
  stats: HomepageSocialProofStat[],
  index: number,
  patch: Partial<HomepageSocialProofStat>,
): HomepageSocialProofStat[] {
  return updateItem(stats, index, patch);
}

export function removeSocialProofStat(
  stats: HomepageSocialProofStat[],
  index: number,
): HomepageSocialProofStat[] {
  return removeItem(stats, index);
}

export function reorderSocialProofStats(
  stats: HomepageSocialProofStat[],
  fromIndex: number,
  toIndex: number,
): HomepageSocialProofStat[] {
  return reorderItems(stats, fromIndex, toIndex);
}

export function addSocialProofTestimonial(
  testimonials: HomepageSocialProofTestimonial[],
): HomepageSocialProofTestimonial[] {
  return addItem(testimonials, MAX_SOCIAL_PROOF_TESTIMONIALS, {
    quote: '',
    name: '',
    role: '',
  });
}

export function updateSocialProofTestimonial(
  testimonials: HomepageSocialProofTestimonial[],
  index: number,
  patch: Partial<HomepageSocialProofTestimonial>,
): HomepageSocialProofTestimonial[] {
  return updateItem(testimonials, index, patch);
}

export function removeSocialProofTestimonial(
  testimonials: HomepageSocialProofTestimonial[],
  index: number,
): HomepageSocialProofTestimonial[] {
  return removeItem(testimonials, index);
}

export function reorderSocialProofTestimonials(
  testimonials: HomepageSocialProofTestimonial[],
  fromIndex: number,
  toIndex: number,
): HomepageSocialProofTestimonial[] {
  return reorderItems(testimonials, fromIndex, toIndex);
}

export function addSocialProofLogo(
  logos: HomepageResolvedSocialProofLogo[],
): HomepageResolvedSocialProofLogo[] {
  return addItem(logos, MAX_SOCIAL_PROOF_LOGOS, { name: '', image: null });
}

export function updateSocialProofLogo(
  logos: HomepageResolvedSocialProofLogo[],
  index: number,
  patch: Partial<HomepageResolvedSocialProofLogo>,
): HomepageResolvedSocialProofLogo[] {
  return updateItem(logos, index, patch);
}

export function removeSocialProofLogo(
  logos: HomepageResolvedSocialProofLogo[],
  index: number,
): HomepageResolvedSocialProofLogo[] {
  return removeItem(logos, index);
}

export function reorderSocialProofLogos(
  logos: HomepageResolvedSocialProofLogo[],
  fromIndex: number,
  toIndex: number,
): HomepageResolvedSocialProofLogo[] {
  return reorderItems(logos, fromIndex, toIndex);
}
