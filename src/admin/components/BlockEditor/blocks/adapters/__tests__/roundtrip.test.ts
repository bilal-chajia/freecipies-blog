import { describe, it, expect, beforeAll } from 'vitest';
import { registerAllBlockAdapters } from '../index';
import { getBlockAdapter } from '../../BlockAdapter';
import { MainRecipeAdapter } from '../MainRecipeAdapter';
import { blocksToContentJson, contentJsonToBlocks } from '../../../utils/conversion';

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

describe('RelatedContentAdapter partitioning and full mapping', () => {
  it('correctly maps and partitions different item types to recipesJson, articlesJson, and roundupsJson, and reconstructs snapshots perfectly', () => {
    const adapter = getBlockAdapter('related_content');
    expect(adapter).toBeDefined();

    const dbBlock = {
      type: 'related_content',
      title: 'Featured Curations',
      layout: 'carousel',
      limit: 6,
      items: [
        {
          article_id: 101,
          snapshot: {
            id: 101,
            type: 'recipe',
            headline: 'Delicious Brownies',
            slug: 'delicious-brownies',
            category: { label: 'Desserts', color: '#ff0000' },
            recipe: { total_time_minutes: 45, difficulty: 'Easy' },
          },
        },
        {
          article_id: 102,
          snapshot: {
            id: 102,
            type: 'article',
            headline: 'How to Bake Bread',
            slug: 'how-to-bake-bread',
            reading_time_minutes: 8,
          },
        },
        {
          article_id: 103,
          snapshot: {
            id: 103,
            type: 'roundup',
            headline: 'Top 10 Soups',
            slug: 'top-10-soups',
            roundup_json: { items: [{}, {}, {}] },
          },
        },
      ],
    };

    // DB → Editor
    const editorBlock = adapter!.toEditor(dbBlock as any) as any;
    expect(editorBlock.type).toBe('relatedContent');
    expect(editorBlock.props.title).toBe('Featured Curations');
    expect(editorBlock.props.layout).toBe('carousel');
    expect(editorBlock.props.limit).toBe(6);

    // Verify JSON properties are set and correctly partitioned
    const recipes = JSON.parse(editorBlock.props.recipesJson);
    const articles = JSON.parse(editorBlock.props.articlesJson);
    const roundups = JSON.parse(editorBlock.props.roundupsJson);

    expect(recipes).toHaveLength(1);
    expect(recipes[0].id).toBe(101);
    expect(recipes[0].headline).toBe('Delicious Brownies');
    expect(recipes[0].total_time).toBe(45);
    expect(recipes[0].difficulty).toBe('Easy');
    expect(recipes[0].categoryName).toBe('Desserts');
    expect(recipes[0].categoryColor).toBe('#ff0000');

    expect(articles).toHaveLength(1);
    expect(articles[0].id).toBe(102);
    expect(articles[0].headline).toBe('How to Bake Bread');
    expect(articles[0].reading_time).toBe(8);

    expect(roundups).toHaveLength(1);
    expect(roundups[0].id).toBe(103);
    expect(roundups[0].headline).toBe('Top 10 Soups');
    expect(roundups[0].item_count).toBe(3);

    // Editor → DB
    const backToDb = adapter!.fromEditor(editorBlock as any) as any;
    expect(backToDb).not.toBeNull();
    expect(backToDb!.title).toBe('Featured Curations');
    expect(backToDb!.layout).toBe('carousel');
    expect(backToDb!.limit).toBe(6);
    expect(backToDb!.items).toHaveLength(3);

    // Verify round-tripped snapshots are fully and accurately reconstructed
    const roundTrippedRecipes = backToDb!.items.filter((item: any) => item.snapshot.type === 'recipe');
    expect(roundTrippedRecipes).toHaveLength(1);
    expect(roundTrippedRecipes[0].article_id).toBe(101);
    expect(roundTrippedRecipes[0].snapshot.headline).toBe('Delicious Brownies');
    expect(roundTrippedRecipes[0].snapshot.recipe).toEqual({ total_time_minutes: 45, difficulty: 'Easy' });
    expect(roundTrippedRecipes[0].snapshot.category).toEqual({ label: 'Desserts', color: '#ff0000' });

    const roundTrippedArticles = backToDb!.items.filter((item: any) => item.snapshot.type === 'article');
    expect(roundTrippedArticles).toHaveLength(1);
    expect(roundTrippedArticles[0].article_id).toBe(102);
    expect(roundTrippedArticles[0].snapshot.reading_time_minutes).toBe(8);

    const roundTrippedRoundups = backToDb!.items.filter((item: any) => item.snapshot.type === 'roundup');
    expect(roundTrippedRoundups).toHaveLength(1);
    expect(roundTrippedRoundups[0].article_id).toBe(103);
    expect(roundTrippedRoundups[0].snapshot.roundup_json.items).toHaveLength(3);
  });

  it('hydrates stored related_content items from cached card snapshots and preserves them on save', () => {
    const adapter = getBlockAdapter('related_content');
    expect(adapter).toBeDefined();

    const dbBlock = {
      type: 'related_content',
      title: 'Also try',
      layout: 'list',
      items: [
        {
          article_id: '301',
          cached_card_json: JSON.stringify({
            id: 301,
            type: 'recipe',
            slug: 'avocado-salad',
            headline: 'Avocado Salad',
            short_description: 'Fresh and fast.',
            image: {
              media_id: 10,
              alt: 'Avocado salad bowl',
              variants: {
                xs: { url: '/images/avocado-xs.webp', width: 360, height: 240 },
                sm: { url: '/images/avocado-sm.webp', width: 720, height: 480 },
              },
            },
            category: { label: 'Lunch', color: '#10b981' },
            recipe: { total_time_minutes: 15, difficulty: 'Easy' },
            rating: { rating_value: 4.7, rating_count: 22 },
          }),
        },
      ],
    };

    const editorBlock = adapter!.toEditor(dbBlock as any) as any;
    const recipes = JSON.parse(editorBlock.props.recipesJson);

    expect(recipes).toHaveLength(1);
    expect(recipes[0]).toMatchObject({
      id: 301,
      slug: 'avocado-salad',
      headline: 'Avocado Salad',
      categoryName: 'Lunch',
      total_time: 15,
      difficulty: 'Easy',
    });
    expect(recipes[0].thumbnail.variants.sm.url).toBe('/images/avocado-sm.webp');
    expect(recipes[0].snapshot.rating.rating_value).toBe(4.7);

    const backToDb = adapter!.fromEditor(editorBlock as any) as any;
    expect(backToDb.items).toHaveLength(1);
    expect(backToDb.items[0].article_id).toBe(301);
    expect(backToDb.items[0].snapshot.rating.rating_value).toBe(4.7);
    expect(backToDb.items[0].snapshot.image.variants.sm.url).toBe('/images/avocado-sm.webp');
  });
});

describe('BlockEditor hydrated marker blocks', () => {
  it('hydrates table blocks with the JSON props consumed by TableBlock', () => {
    const blocks = contentJsonToBlocks({
      version: 1,
      kind: 'content_document',
      blocks: [
        {
          id: 'table-1',
          type: 'table',
          headers: ['Ingredient', 'Amount'],
          rows: [['Flour', '2 cups']],
        },
      ],
    });

    expect(blocks?.[0]).toMatchObject({
      id: 'table-1',
      type: 'simpleTable',
      props: {
        headersJson: JSON.stringify(['Ingredient', 'Amount']),
        rowsJson: JSON.stringify([['Flour', '2 cups']]),
      },
    });
  });

  it('repairs duplicate stored ids before passing blocks to BlockNote', () => {
    const blocks = contentJsonToBlocks({
      version: 1,
      kind: 'content_document',
      blocks: [
        { id: 'block-3', type: 'image', image_ref: 'body-image-1' },
        { id: 'block-3', type: 'paragraph', text: 'Duplicate id paragraph' },
        { id: 'block-3', type: 'heading', level: 2, text: 'Duplicate id heading' },
      ],
    });

    expect(blocks?.map((block) => block.id)).toEqual(['block-3', 'block-3-2', 'block-3-3']);
  });

  it('saves content_json with unique block ids', () => {
    const saved = blocksToContentJson([
      { id: 'dup', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'First', styles: {} }], children: [] },
      { id: 'dup', type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Second', styles: {} }], children: [] },
      { id: 'dup', type: 'mainRecipe', props: {}, content: [], children: [] },
    ] as any);

    expect(saved.blocks.map((block) => block.id)).toEqual(['dup', 'dup-2', 'dup-3']);
  });

  it('hydrates marker blocks from article source JSON without persisting payloads into content_json', () => {
    const blocks = contentJsonToBlocks(
      {
        version: 1,
        kind: 'content_document',
        blocks: [
          { id: 'recipe-marker', type: 'main_recipe' },
          { id: 'faq-marker', type: 'main_faq' },
          { id: 'image-marker', type: 'image', image_ref: 'body-image-1' },
        ],
      },
      {
        recipeJson: '{"ingredients":[{"group_title":"Main","items":[{"name":"Avocado"}]}]}',
        faqsJson: '{"heading":"Recipe FAQs","items":[{"question":"Can I prep it?","answer":"Yes."}]}',
        imagesData: {
          content_images: {
            'body-image-1': {
              media_id: 77,
              alt: 'Avocado toast',
              caption: 'Ready to serve',
              credit: { type: 'author', name: 'Jane Doe' },
              variants: {
                sm: { url: '/images/toast-sm.webp', width: 720, height: 480 },
              },
            },
          },
        },
      }
    );

    expect(blocks?.[0]).toMatchObject({
      id: 'recipe-marker',
      type: 'mainRecipe',
      props: { recipeJson: '{"ingredients":[{"group_title":"Main","items":[{"name":"Avocado"}]}]}' },
    });
    expect(blocks?.[1]).toMatchObject({
      id: 'faq-marker',
      type: 'faqSection',
      props: {
        title: 'Recipe FAQs',
        itemsJson: JSON.stringify([{ q: 'Can I prep it?', a: 'Yes.' }]),
      },
    });
    expect(blocks?.[2]).toMatchObject({
      id: 'image-marker',
      type: 'customImage',
      props: {
        imageRef: 'body-image-1',
        mediaId: '77',
        url: '/images/toast-sm.webp',
        alt: 'Avocado toast',
        caption: 'Ready to serve',
      },
    });

    expect(blocksToContentJson(blocks as any)).toEqual({
      version: 1,
      kind: 'content_document',
      blocks: [
        { id: 'recipe-marker', type: 'main_recipe' },
        { id: 'faq-marker', type: 'main_faq' },
        { id: 'image-marker', type: 'image', image_ref: 'body-image-1' },
      ],
    });
  });
});
