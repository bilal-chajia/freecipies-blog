import { arrayMove } from '@dnd-kit/sortable';
import type {
  HomepageFaqItem,
  HomepageSection,
} from '@modules/settings/types/settings.types';

const isValidIndex = <T>(items: T[], index: number): boolean => (
  Number.isInteger(index) && index >= 0 && index < items.length
);

export function addFaqItem(items: HomepageFaqItem[]): HomepageFaqItem[] {
  return [...items, { question: '', answer: '' }];
}

export function updateFaqItem(
  items: HomepageFaqItem[],
  index: number,
  patch: Partial<HomepageFaqItem>,
): HomepageFaqItem[] {
  if (!isValidIndex(items, index)) return items;
  return items.map((item, itemIndex) => (
    itemIndex === index ? { ...item, ...patch } : item
  ));
}

export function removeFaqItem(
  items: HomepageFaqItem[],
  index: number,
): HomepageFaqItem[] {
  if (!isValidIndex(items, index)) return items;
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function reorderFaqItems(
  items: HomepageFaqItem[],
  fromIndex: number,
  toIndex: number,
): HomepageFaqItem[] {
  if (
    !isValidIndex(items, fromIndex)
    || !isValidIndex(items, toIndex)
    || fromIndex === toIndex
  ) {
    return items;
  }
  return arrayMove(items, fromIndex, toIndex);
}

export function pinFaqLast(sections: HomepageSection[]): HomepageSection[] {
  const faq = sections.find((section) => section.type === 'faq');
  if (!faq) return sections;

  const nonFaqSections = sections.filter((section) => section.type !== 'faq');
  if (
    nonFaqSections.length === sections.length - 1
    && sections[sections.length - 1] === faq
  ) {
    return sections;
  }

  return [...nonFaqSections, faq];
}
