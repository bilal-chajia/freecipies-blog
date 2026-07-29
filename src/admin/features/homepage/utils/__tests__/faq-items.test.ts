import { describe, expect, it } from 'vitest';
import type { HomepageSection } from '@modules/settings/types/settings.types';
import {
  addFaqItem,
  pinFaqLast,
  removeFaqItem,
  reorderFaqItems,
  updateFaqItem,
} from '../faq-items';

describe('FAQ item transforms', () => {
  it('adds, edits, deletes, and reorders without mutating input', () => {
    const original = [{ question: 'One?', answer: 'A1' }];
    const added = addFaqItem(original);
    const edited = updateFaqItem(added, 1, { question: 'Two?', answer: 'A2' });
    const reordered = reorderFaqItems(edited, 1, 0);
    const removed = removeFaqItem(reordered, 1);
    expect(original).toEqual([{ question: 'One?', answer: 'A1' }]);
    expect(removed).toEqual([{ question: 'Two?', answer: 'A2' }]);
  });

  it('returns the input for invalid edit, delete, and reorder indexes', () => {
    const original = [{ question: 'One?', answer: 'A1' }];
    expect(updateFaqItem(original, -1, { question: 'No' })).toBe(original);
    expect(removeFaqItem(original, 1)).toBe(original);
    expect(reorderFaqItems(original, 0, 2)).toBe(original);
  });
});

describe('pinFaqLast', () => {
  it('keeps one existing FAQ after all other sections without mutating input', () => {
    const original: HomepageSection[] = [
      { id: 'faq', type: 'faq', enabled: false, title: 'FAQ', items: [] },
      { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 4 },
    ];
    const result = pinFaqLast(original);
    expect(original.map((section) => section.id)).toEqual(['faq', 'latest']);
    expect(result.map((section) => section.id)).toEqual(['latest', 'faq']);
  });

  it('does not invent a FAQ when none exists', () => {
    const original: HomepageSection[] = [
      { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 4 },
    ];
    expect(pinFaqLast(original)).toBe(original);
  });
});
