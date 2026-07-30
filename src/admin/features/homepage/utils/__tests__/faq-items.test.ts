import { describe, expect, it } from 'vitest';
import type { HomepageSection } from '@modules/settings/types/settings.types';
import {
  addFaqItem,
  createFaqEditorState,
  pinFaqLast,
  removeFaqEditorRow,
  removeFaqItem,
  reorderFaqEditorRows,
  reorderFaqItems,
  updateFaqEditorRow,
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

describe('FAQ editor row identity', () => {
  it('keeps the focused row aligned through repeated keyboard moves, editing, and deletion', () => {
    let nextId = 0;
    let state = createFaqEditorState([
      { question: 'One?', answer: 'A1' },
      { question: 'Two?', answer: 'A2' },
      { question: 'Three?', answer: 'A3' },
    ], () => `row-${++nextId}`);
    const focusedRowId = state.rowIds[1];

    state = reorderFaqEditorRows(state, focusedRowId, state.rowIds[0]);
    state = reorderFaqEditorRows(state, focusedRowId, state.rowIds[1]);
    state = reorderFaqEditorRows(state, focusedRowId, state.rowIds[2]);
    state = updateFaqEditorRow(state, focusedRowId, { answer: 'Updated A2' });

    const deletedRowId = state.rowIds[0];
    state = removeFaqEditorRow(state, deletedRowId);

    const focusedIndex = state.rowIds.indexOf(focusedRowId);
    expect(focusedIndex).toBeGreaterThanOrEqual(0);
    expect(state.items[focusedIndex]).toEqual({ question: 'Two?', answer: 'Updated A2' });
    expect(state.rowIds).not.toContain(deletedRowId);
    expect(state.items.every((item) => !('id' in item))).toBe(true);
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
