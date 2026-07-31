import { arrayMove } from '@dnd-kit/sortable';
import type { HomepageQuickFilter } from '@modules/settings/types/settings.types';

function isValidIndex<T>(items: T[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < items.length;
}

export function addQuickFilter(filters: HomepageQuickFilter[]): HomepageQuickFilter[] {
  return [...filters, { label: '', href: '/recipes' }];
}

export function updateQuickFilter(
  filters: HomepageQuickFilter[],
  index: number,
  patch: Partial<HomepageQuickFilter>,
): HomepageQuickFilter[] {
  if (!isValidIndex(filters, index)) return filters;

  return filters.map((filter, filterIndex) => (
    filterIndex === index ? { ...filter, ...patch } : filter
  ));
}

export function removeQuickFilter(
  filters: HomepageQuickFilter[],
  index: number,
): HomepageQuickFilter[] {
  if (!isValidIndex(filters, index)) return filters;

  return filters.filter((_, filterIndex) => filterIndex !== index);
}

export function reorderQuickFilters(
  filters: HomepageQuickFilter[],
  fromIndex: number,
  toIndex: number,
): HomepageQuickFilter[] {
  if (
    !isValidIndex(filters, fromIndex)
    || !isValidIndex(filters, toIndex)
    || fromIndex === toIndex
  ) {
    return filters;
  }

  return arrayMove(filters, fromIndex, toIndex);
}
