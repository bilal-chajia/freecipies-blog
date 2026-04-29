import { CONTENT_BLOCK_TYPES, type ContentBlock, type ContentBlockType, type NormalizedContentBlock } from '../contract/content-blocks.types';
import type { ContentDocument } from '../contract/content-document.types';

const canonicalTypes = new Set<string>(CONTENT_BLOCK_TYPES);

function parseInput(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeFAQItems(items: unknown): unknown[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const question = stringValue(record.question) ?? stringValue(record.q);
      const answer = stringValue(record.answer) ?? stringValue(record.a);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean) as unknown[];
}

function publicVariantSnapshot(input: unknown): Record<string, unknown> | undefined {
  const record = asRecord(input);
  if (!record) return undefined;
  const url = stringValue(record.url);
  const width = numberValue(record.width);
  const height = numberValue(record.height);
  if (!url || !width || !height) return undefined;
  return { url, width, height };
}

function compactRelatedImage(input: unknown): Record<string, unknown> | undefined {
  const record = asRecord(input);
  if (!record) return undefined;
  const mediaId = numberValue(record.media_id);
  const alt = stringValue(record.alt);
  const variants = asRecord(record.variants);
  const sm = publicVariantSnapshot(variants?.sm);
  const md = publicVariantSnapshot(variants?.md);
  if (!mediaId || !alt || (!sm && !md)) return undefined;
  return {
    media_id: mediaId,
    alt,
    variants: {
      ...(sm ? { sm } : {}),
      ...(md ? { md } : {}),
    },
  };
}

function normalizeRelatedItem(input: unknown, contentType?: string): Record<string, unknown> | null {
  const record = asRecord(input);
  if (!record) return null;
  const type = stringValue(record.content_type) ?? contentType;
  if (type !== 'recipe' && type !== 'article' && type !== 'roundup') return null;

  const articleId = numberValue(record.article_id) ?? numberValue(record.id);
  const slug = stringValue(record.slug);
  const title = stringValue(record.title) ?? stringValue(record.headline);
  if (!slug || !title) return null;

  const image = compactRelatedImage(record.image) ?? compactRelatedImage(record.thumbnail);
  return {
    content_type: type,
    ...(articleId ? { article_id: articleId } : {}),
    slug,
    title,
    ...(stringValue(record.description) ? { description: stringValue(record.description) } : {}),
    ...(image ? { image } : {}),
    ...(numberValue(record.total_time) ? { total_time: numberValue(record.total_time) } : {}),
    ...(stringValue(record.difficulty) ? { difficulty: stringValue(record.difficulty) } : {}),
    ...(numberValue(record.reading_time) ? { reading_time: numberValue(record.reading_time) } : {}),
    ...(numberValue(record.item_count) ? { item_count: numberValue(record.item_count) } : {}),
  };
}

function normalizeRelatedItems(block: Record<string, unknown>): unknown[] {
  if (Array.isArray(block.items)) {
    return block.items
      .map((item) => normalizeRelatedItem(item))
      .filter(Boolean) as unknown[];
  }

  return [
    ...(Array.isArray(block.recipes) ? block.recipes.map((item) => normalizeRelatedItem(item, 'recipe')) : []),
    ...(Array.isArray(block.articles) ? block.articles.map((item) => normalizeRelatedItem(item, 'article')) : []),
    ...(Array.isArray(block.roundups) ? block.roundups.map((item) => normalizeRelatedItem(item, 'roundup')) : []),
  ].filter(Boolean) as unknown[];
}

function normalizeLegacyType(block: Record<string, unknown>): Record<string, unknown> {
  const type = block.type;

  if (type === 'alert') {
    const props = asRecord(block.props);
    return {
      id: block.id,
      type: 'tip_box',
      variant: stringValue(props?.type) ?? stringValue(block.variant) ?? 'info',
      title: stringValue(block.title) ?? stringValue(props?.title),
      text: stringValue(block.text) ?? '',
    };
  }

  if (type === 'customImage') {
    const props = asRecord(block.props);
    const mediaId = props?.mediaId;
    return {
      id: block.id,
      type: 'image',
      media_id: typeof mediaId === 'number' ? mediaId : Number(mediaId || 0),
      alt: stringValue(props?.alt) ?? stringValue(block.alt) ?? '',
      caption: stringValue(props?.caption),
      credit: stringValue(props?.credit),
    };
  }

  if (type === 'faqSection') {
    return {
      id: block.id,
      type: 'faq_section',
      title: stringValue(block.title),
      items: normalizeFAQItems(block.items),
    };
  }

  if (type === 'relatedContent') {
    return {
      id: block.id,
      type: 'related_content',
      title: stringValue(block.title),
      layout: stringValue(block.layout) ?? 'grid',
      mode: stringValue(block.mode),
      limit: numberValue(block.limit),
      items: normalizeRelatedItems(block),
    };
  }

  if (type === 'roundupList' || type === 'roundup_list') {
    const items = Array.isArray(block.items) ? block.items : [];
    const first = asRecord(items[0]) ?? block;
    return {
      ...first,
      id: block.id,
      type: 'roundup_item',
    };
  }

  if (type === 'mainRecipe') {
    return { id: block.id, type: 'main_recipe' };
  }

  if (type === 'faq_section') {
    return {
      id: block.id,
      type: 'faq_section',
      title: stringValue(block.title),
      items: normalizeFAQItems(block.items),
    };
  }

  if (type === 'related_content') {
    return {
      id: block.id,
      type: 'related_content',
      title: stringValue(block.title),
      layout: stringValue(block.layout) ?? 'grid',
      mode: stringValue(block.mode),
      limit: numberValue(block.limit),
      items: normalizeRelatedItems(block),
    };
  }

  if (type === 'video') {
    return {
      id: block.id,
      type: 'video',
      provider: stringValue(block.provider),
      video_id: stringValue(block.video_id) ?? stringValue(block.videoId),
      aspect_ratio: stringValue(block.aspect_ratio) ?? stringValue(block.aspectRatio) ?? '16:9',
    };
  }

  return block;
}

function normalizeBlock(block: unknown, index: number): NormalizedContentBlock | null {
  const record = asRecord(block);
  if (!record) return null;

  const normalized = normalizeLegacyType(record);
  const type = normalized.type;
  if (typeof type !== 'string' || !canonicalTypes.has(type)) return null;

  return {
    ...normalized,
    id: stringValue(normalized.id) ?? `block-${index}`,
    type: type as ContentBlockType,
  } as ContentBlock as NormalizedContentBlock;
}

function extractBlocks(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;

  const record = asRecord(parsed);
  if (!record) return [];

  if (Array.isArray(record.blocks)) return record.blocks;
  return [];
}

export function normalizeContentDocument(input: unknown): ContentDocument {
  const parsed = parseInput(input);
  const blocks = extractBlocks(parsed)
    .map((block, index) => normalizeBlock(block, index))
    .filter((block): block is NormalizedContentBlock => Boolean(block));

  return {
    version: 1,
    kind: 'content_document',
    blocks,
  };
}

export function serializeContentDocument(input: unknown): string {
  return JSON.stringify(normalizeContentDocument(input));
}
