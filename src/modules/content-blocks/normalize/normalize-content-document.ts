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

function storedVariantSnapshot(input: unknown): Record<string, unknown> | undefined {
  const record = asRecord(input);
  if (!record) return undefined;
  const r2Key = stringValue(record.r2_key);
  const width = numberValue(record.width);
  const height = numberValue(record.height);
  if (!r2Key || !width || !height) return undefined;
  const sizeBytes = numberValue(record.size_bytes);
  return { r2_key: r2Key, width, height, ...(sizeBytes ? { size_bytes: sizeBytes } : {}) };
}

function compactRelatedImage(input: unknown): Record<string, unknown> | undefined {
  const record = asRecord(input);
  if (!record) return undefined;
  const mediaId = numberValue(record.media_id);
  const alt = stringValue(record.alt);
  const variants = asRecord(record.variants);
  const xs = storedVariantSnapshot(variants?.xs);
  const sm = storedVariantSnapshot(variants?.sm);
  if (!mediaId || !alt || !xs || !sm) return undefined;
  return {
    media_id: mediaId,
    alt,
    variants: {
      xs,
      sm,
    },
  };
}

function normalizeRelatedItem(input: unknown, contentType?: string): Record<string, unknown> | null {
  const record = asRecord(input);
  if (!record) return null;
  const articleId = numberValue(record.article_id) ?? numberValue(record.id);
  const snapshot = asRecord(record.snapshot);
  if (articleId && snapshot) return { article_id: articleId, snapshot };

  const type = stringValue(record.content_type) ?? contentType;
  const slug = stringValue(record.slug);
  const headline = stringValue(record.headline) ?? stringValue(record.title);
  if (!articleId || !slug || !headline) return null;
  const image = compactRelatedImage(record.image) ?? compactRelatedImage(record.thumbnail);
  return {
    article_id: articleId,
    snapshot: {
      id: articleId,
      type: type === 'recipe' || type === 'roundup' || type === 'article' ? type : 'article',
      slug,
      headline,
      ...(stringValue(record.short_description) || stringValue(record.description)
        ? { short_description: stringValue(record.short_description) ?? stringValue(record.description) }
        : {}),
      ...(image ? { image } : {}),
    },
  };
}

function normalizeRelatedItems(block: Record<string, unknown>): unknown[] {
  if (Array.isArray(block.items)) {
    return block.items
      .map((item) => normalizeRelatedItem(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  return [
    ...(Array.isArray(block.recipes) ? block.recipes.map((item) => normalizeRelatedItem(item, 'recipe')) : []),
    ...(Array.isArray(block.articles) ? block.articles.map((item) => normalizeRelatedItem(item, 'article')) : []),
    ...(Array.isArray(block.roundups) ? block.roundups.map((item) => normalizeRelatedItem(item, 'roundup')) : []),
  ].filter((item): item is Record<string, unknown> => Boolean(item));
}

function normalizeLegacyType(block: Record<string, unknown>): Record<string, unknown> {
  const type = block.type;

  if (type === 'roundupList' || type === 'roundup_list' || type === 'main_roundup') {
    return { id: block.id, type: 'main_roundup' };
  }

  if (type === 'mainRecipe' || type === 'main_recipe') {
    return { id: block.id, type: 'main_recipe' };
  }

  if (type === 'faqSection' || type === 'faq_section' || type === 'main_faq') {
    return { id: block.id, type: 'main_faq' };
  }

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
    return {
      id: block.id,
      type: 'image',
      image_ref: stringValue(props?.image_ref) ?? stringValue(props?.imageRef) ?? stringValue(props?.mediaId) ?? stringValue(block.image_ref) ?? stringValue(block.imageRef) ?? '',
    };
  }

  if (type === 'relatedContent') {
    return {
      id: block.id,
      type: 'related_content',
      title: stringValue(block.title),
      layout: stringValue(block.layout) ?? 'grid',
      limit: numberValue(block.limit),
      items: normalizeRelatedItems(block),
    };
  }

  if (type === 'related_content') {
    return {
      id: block.id,
      type: 'related_content',
      title: stringValue(block.title),
      layout: stringValue(block.layout) ?? 'grid',
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

  if (type === 'image') {
    return {
      id: block.id,
      type: 'image',
      image_ref: stringValue(block.image_ref) ?? stringValue(block.imageRef) ?? '',
    };
  }

  if (type === 'before_after') {
    return {
      id: block.id,
      type: 'before_after',
      layout: stringValue(block.layout) ?? 'slider',
      before_image_ref: stringValue(block.before_image_ref) ?? stringValue(block.beforeImageRef) ?? '',
      after_image_ref: stringValue(block.after_image_ref) ?? stringValue(block.afterImageRef) ?? '',
      ...(stringValue(block.before_label) ?? stringValue(block.beforeLabel)
        ? { before_label: stringValue(block.before_label) ?? stringValue(block.beforeLabel) }
        : {}),
      ...(stringValue(block.after_label) ?? stringValue(block.afterLabel)
        ? { after_label: stringValue(block.after_label) ?? stringValue(block.afterLabel) }
        : {}),
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

function createUniqueBlockId(baseId: string, index: number, usedIds: Set<string>): string {
  const rawBase = baseId.trim() || `block-${index}`;

  if (!usedIds.has(rawBase)) {
    usedIds.add(rawBase);
    return rawBase;
  }

  let suffix = 2;
  let nextId = `${rawBase}-${suffix}`;
  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${rawBase}-${suffix}`;
  }
  usedIds.add(nextId);
  return nextId;
}

function ensureUniqueBlockIds(blocks: NormalizedContentBlock[]): NormalizedContentBlock[] {
  const usedIds = new Set<string>();
  return blocks.map((block, index) => ({
    ...block,
    id: createUniqueBlockId(block.id, index, usedIds),
  }));
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
    blocks: ensureUniqueBlockIds(blocks),
  };
}

export function serializeContentDocument(input: unknown): string {
  return JSON.stringify(normalizeContentDocument(input));
}
