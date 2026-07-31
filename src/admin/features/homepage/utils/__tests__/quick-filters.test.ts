import { describe, expect, it } from 'vitest';
import {
  addQuickFilter,
  removeQuickFilter,
  reorderQuickFilters,
  updateQuickFilter,
} from '../quick-filters';

describe('quick filter transforms', () => {
  it('adds, edits, reorders, and removes without mutating input', () => {
    const original = [{ label: 'Quick', href: '/recipes?tag=quick' }];

    const added = addQuickFilter(original);
    const edited = updateQuickFilter(added, 1, {
      label: 'Dinner',
      href: '/recipes?category=dinner',
    });
    const reordered = reorderQuickFilters(edited, 1, 0);
    const removed = removeQuickFilter(reordered, 1);

    expect(reordered).toEqual([
      { label: 'Dinner', href: '/recipes?category=dinner' },
      original[0],
    ]);
    expect(removed).toEqual([{ label: 'Dinner', href: '/recipes?category=dinner' }]);
    expect(original).toEqual([{ label: 'Quick', href: '/recipes?tag=quick' }]);
  });

  it('returns the original array for invalid indexes', () => {
    const original = [{ label: 'Quick', href: '/recipes?tag=quick' }];

    expect(updateQuickFilter(original, -1, { label: 'Dinner' })).toBe(original);
    expect(removeQuickFilter(original, 4)).toBe(original);
    expect(reorderQuickFilters(original, 0, 4)).toBe(original);
    expect(reorderQuickFilters(original, 0, 0)).toBe(original);
  });
});
