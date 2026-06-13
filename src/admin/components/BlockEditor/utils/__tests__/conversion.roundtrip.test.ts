/**
 * Adapter round-trip safety net.
 *
 * A stored content_json block, hydrated into the editor and serialized back,
 * must survive without losing data. These tests exercise the load→save path
 * (contentJsonToBlocks → blocksToContentJson) that runs client-side BEFORE the
 * API's strict validator sees anything — so a block dropped or a field lost here
 * is invisible to the server guard. This is where the historical data-loss P0s
 * lived; the suite locks the round-trip down.
 */
import { describe, it, expect } from 'vitest';
import { contentJsonToBlocks, blocksToContentJson } from '../conversion';
import type { BlockAdapterContext } from '../../blocks/BlockAdapter';

/** Round-trip a single canonical block and return the re-serialized block. */
function roundTrip(block: Record<string, unknown>, context: BlockAdapterContext = {}) {
  const doc = { version: 1 as const, kind: 'content_document' as const, blocks: [block] };
  const editorBlocks = contentJsonToBlocks(doc, context) ?? [];
  const result = blocksToContentJson(editorBlocks);
  return result.blocks;
}

describe('conversion round-trip — text blocks', () => {
  it('preserves a paragraph with inline markdown', () => {
    const [out] = roundTrip({ id: 'p1', type: 'paragraph', text: 'Hello **bold** and *italic* and [x](https://e.com)' });
    expect(out).toMatchObject({ type: 'paragraph', text: 'Hello **bold** and *italic* and [x](https://e.com)' });
  });

  it('preserves a heading level and text', () => {
    const [out] = roundTrip({ id: 'h1', type: 'heading', level: 3, text: 'Why it works' });
    expect(out).toMatchObject({ type: 'heading', level: 3, text: 'Why it works' });
  });

  it('preserves a blockquote text (cite is intentionally not part of the contract)', () => {
    const [out] = roundTrip({ id: 'q1', type: 'blockquote', text: 'Good dough feels soft.' });
    expect(out).toMatchObject({ type: 'blockquote', text: 'Good dough feels soft.' });
    expect(out).not.toHaveProperty('cite');
  });

  it('preserves a list style and items (with inline markdown)', () => {
    const [out] = roundTrip({ id: 'l1', type: 'list', style: 'checklist', items: ['Cool **completely**', 'Store airtight'] });
    expect(out).toMatchObject({ type: 'list', style: 'checklist', items: ['Cool **completely**', 'Store airtight'] });
  });
});

describe('conversion round-trip — media & utility blocks', () => {
  it('preserves an image_ref marker', () => {
    const [out] = roundTrip({ id: 'img1', type: 'image', image_ref: 'body-image-1' });
    expect(out).toMatchObject({ type: 'image', image_ref: 'body-image-1' });
  });

  it('preserves a video provider, id and aspect ratio', () => {
    const [out] = roundTrip({ id: 'v1', type: 'video', provider: 'youtube', video_id: 'abc123', aspect_ratio: '4:3' });
    expect(out).toMatchObject({ type: 'video', provider: 'youtube', video_id: 'abc123', aspect_ratio: '4:3' });
  });

  it('preserves a tip_box variant, title and text', () => {
    const [out] = roundTrip({ id: 't1', type: 'tip_box', variant: 'warning', title: 'Make ahead', text: 'Keeps for **3 days**.' });
    expect(out).toMatchObject({ type: 'tip_box', variant: 'warning', title: 'Make ahead', text: 'Keeps for **3 days**.' });
  });

  it('preserves a divider', () => {
    const [out] = roundTrip({ id: 'd1', type: 'divider' });
    expect(out).toMatchObject({ type: 'divider' });
  });

  it('preserves a table headers and rows', () => {
    const [out] = roundTrip({ id: 'tb1', type: 'table', headers: ['Ingredient', 'Amount'], rows: [['Flour', '2 cups'], ['Water', '1 cup']] });
    expect(out).toMatchObject({ type: 'table', headers: ['Ingredient', 'Amount'], rows: [['Flour', '2 cups'], ['Water', '1 cup']] });
  });
});

describe('conversion round-trip — placement markers', () => {
  it('preserves a main_recipe marker', () => {
    const [out] = roundTrip({ id: 'mr', type: 'main_recipe' }, { recipe_json: JSON.stringify({ servings: 4 }) });
    expect(out).toMatchObject({ type: 'main_recipe' });
  });

  it('preserves a main_roundup marker', () => {
    const [out] = roundTrip({ id: 'mru', type: 'main_roundup' }, { roundup_json: JSON.stringify({ items: [], list_type: 'ItemList' }) });
    expect(out).toMatchObject({ type: 'main_roundup' });
  });

  it('preserves a main_faq marker', () => {
    const [out] = roundTrip({ id: 'mf', type: 'main_faq' }, { faqs_json: JSON.stringify({ items: [] }) });
    expect(out).toMatchObject({ type: 'main_faq' });
  });
});

describe('conversion round-trip — full document', () => {
  it('does not drop or reorder blocks', () => {
    const blocks = [
      { id: 'p1', type: 'paragraph', text: 'Intro' },
      { id: 'h1', type: 'heading', level: 2, text: 'Section' },
      { id: 'l1', type: 'list', style: 'unordered', items: ['a', 'b'] },
      { id: 'mr', type: 'main_recipe' },
      { id: 'd1', type: 'divider' },
      { id: 'img1', type: 'image', image_ref: 'ref-1' },
    ];
    const doc = { version: 1 as const, kind: 'content_document' as const, blocks };
    const editorBlocks = contentJsonToBlocks(doc, { recipe_json: '{}' }) ?? [];
    const result = blocksToContentJson(editorBlocks);
    expect(result.blocks.map((b) => b.type)).toEqual([
      'paragraph', 'heading', 'list', 'main_recipe', 'divider', 'image',
    ]);
  });
});
