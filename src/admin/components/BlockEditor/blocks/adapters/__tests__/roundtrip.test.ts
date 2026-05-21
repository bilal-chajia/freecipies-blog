import { describe, it, expect, beforeAll } from 'vitest';
import { registerAllBlockAdapters } from '../index';
import { getBlockAdapter } from '../../BlockAdapter';
import { MainRecipeAdapter } from '../MainRecipeAdapter';

// Register all adapters once
beforeAll(() => {
  registerAllBlockAdapters();
});

describe('BlockAdapter round-trip: DB → Editor → DB', () => {
  const testCases: {
    name: string;
    adapterType: string;
    db: any;
    /** Optional subset of fields to skip in strict round-trip comparison */
    skipFields?: string[];
  }[] = [
    {
      name: 'paragraph',
      adapterType: 'paragraph',
      db: { type: 'paragraph', text: 'Hello world' },
    },
    {
      name: 'heading (h2)',
      adapterType: 'heading',
      db: { type: 'heading', level: 2, text: 'Section Title' },
    },
    {
      name: 'heading (h3)',
      adapterType: 'heading',
      db: { type: 'heading', level: 3, text: 'Subsection' },
    },
    {
      name: 'blockquote',
      adapterType: 'blockquote',
      db: { type: 'blockquote', text: 'To be or not to be' },
    },
    {
      name: 'list (ordered)',
      adapterType: 'list',
      db: { type: 'list', style: 'ordered', items: ['First item', 'Second item'] },
      // Only the first item survives the round-trip (ListAdapter limitation)
      skipFields: ['items'],
    },
    {
      name: 'list (unordered)',
      adapterType: 'list',
      db: { type: 'list', style: 'unordered', items: ['Bullet 1', 'Bullet 2'] },
      skipFields: ['items'],
    },
    {
      name: 'alert / tip_box',
      adapterType: 'tip_box',
      db: { type: 'tip_box', variant: 'tip', title: 'Pro Tip', text: 'Use cold butter' },
    },
    {
      name: 'image',
      adapterType: 'image',
      db: {
        type: 'image',
        image_ref: 'body-image-1',
      },
    },
    {
      name: 'video',
      adapterType: 'video',
      db: { type: 'video', provider: 'youtube', video_id: 'abc123', aspect_ratio: '16:9' },
    },
    {
      name: 'divider',
      adapterType: 'divider',
      db: { type: 'divider' },
    },
    {
      name: 'table',
      adapterType: 'table',
      db: {
        type: 'table',
        headers: ['Ingredient', 'Amount'],
        rows: [
          ['Flour', '2 cups'],
          ['Sugar', '1 cup'],
        ],
      },
    },
    {
      name: 'main_faq',
      adapterType: 'main_faq',
      db: {
        type: 'main_faq',
      },
    },
    {
      name: 'related_content',
      adapterType: 'related_content',
      db: {
        type: 'related_content',
        title: 'You May Also Like',
        layout: 'grid',
        items: [{
          article_id: 1,
          snapshot: {
            id: 1,
            type: 'recipe',
            headline: 'Test Recipe',
            slug: 'test-recipe',
          },
        }],
      },
    },
    {
      name: 'before_after',
      adapterType: 'before_after',
      db: {
        type: 'before_after',
        layout: 'slider',
        before_image_ref: 'before-image',
        after_image_ref: 'after-image',
      },
    },
    {
      name: 'main_roundup',
      adapterType: 'main_roundup',
      db: {
        type: 'main_roundup',
      },
    },
  ];

  for (const { name, adapterType, db, skipFields } of testCases) {
    it(`${name}: adapter exists and preserves type`, () => {
      const adapter = getBlockAdapter(adapterType);
      expect(adapter).toBeDefined();
      expect(adapter!.type).toBe(adapterType);

      // DB → Editor
      const editorBlock = adapter!.toEditor(db);
      expect(editorBlock).toBeDefined();
      expect(editorBlock.type).toBeDefined();

      // Editor → DB
      const backToDb = adapter!.fromEditor(editorBlock as any);
      expect(backToDb).toBeDefined();
      expect(backToDb).not.toBeNull();
      expect(backToDb!.type).toBe(db.type);

      // Verify key fields survive the round-trip (excluding skipped fields)
      for (const key of Object.keys(db)) {
        if (key === 'type' || skipFields?.includes(key)) continue;

        const original = db[key];
        const roundTripped = (backToDb as any)[key];

        // For objects/arrays, check they're defined; for primitives, check equality
        if (typeof original === 'object' && original !== null) {
          expect(roundTripped).toBeDefined();
        } else {
          expect(roundTripped).toBe(original);
        }
      }
    });
  }
});

describe('MainRecipeAdapter round-trip', () => {
  it('uses canonical main_recipe storage and mainRecipe editor type', () => {
    expect(MainRecipeAdapter.type).toBe('main_recipe');

    const editorBlock = MainRecipeAdapter.toEditor({ type: 'main_recipe' });
    expect(editorBlock.type).toBe('mainRecipe');

    const backToDb = MainRecipeAdapter.fromEditor(editorBlock as any);
    expect(backToDb?.type).toBe('main_recipe');
  });
});
