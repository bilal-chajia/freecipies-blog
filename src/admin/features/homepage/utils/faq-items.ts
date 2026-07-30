import { arrayMove } from '@dnd-kit/sortable';
import type {
  HomepageFaqItem,
  HomepageSection,
} from '@modules/settings/types/settings.types';

export interface FaqEditorState {
  items: HomepageFaqItem[];
  rowIds: string[];
}

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

export function createFaqEditorState(
  items: HomepageFaqItem[],
  createRowId: () => string,
): FaqEditorState {
  return {
    items,
    rowIds: items.map(() => createRowId()),
  };
}

export function updateFaqEditorRow(
  state: FaqEditorState,
  rowId: string,
  patch: Partial<HomepageFaqItem>,
): FaqEditorState {
  const index = state.rowIds.indexOf(rowId);
  const items = updateFaqItem(state.items, index, patch);
  return items === state.items ? state : { ...state, items };
}

export function removeFaqEditorRow(
  state: FaqEditorState,
  rowId: string,
): FaqEditorState {
  const index = state.rowIds.indexOf(rowId);
  if (!isValidIndex(state.items, index)) return state;
  return {
    items: removeFaqItem(state.items, index),
    rowIds: state.rowIds.filter((id) => id !== rowId),
  };
}

export function reorderFaqEditorRows(
  state: FaqEditorState,
  activeId: string,
  overId: string,
): FaqEditorState {
  const fromIndex = state.rowIds.indexOf(activeId);
  const toIndex = state.rowIds.indexOf(overId);
  const items = reorderFaqItems(state.items, fromIndex, toIndex);
  if (items === state.items) return state;
  return {
    items,
    rowIds: arrayMove(state.rowIds, fromIndex, toIndex),
  };
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
