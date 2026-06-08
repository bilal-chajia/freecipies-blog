#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import process from 'node:process';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value) {
  if (isRecord(value) || Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function detectD1Path() {
  const root = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!existsSync(root)) fail(`Local D1 state directory not found: ${root}`);

  const candidates = readdirSync(root)
    .filter((name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite')
    .map((name) => join(root, name));

  for (const candidate of candidates) {
    const db = new DatabaseSync(candidate);
    try {
      const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articles'").get();
      if (row) return candidate;
    } finally {
      db.close();
    }
  }

  fail('No local D1 sqlite file with an articles table was found.');
}

function cleanText(value) {
  return typeof value === 'string' ? value : '';
}

function cleanOptionalText(value) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function blockId(block, index) {
  if (isRecord(block) && typeof block.id === 'string' && block.id.trim()) return block.id;
  return `block-${index}`;
}

function parseMediaSnapshot(row) {
  if (!row) return null;
  const variantsJson = parseJson(row.variants_json);
  const credit = parseJson(row.credit);
  return {
    media_id: row.id,
    caption: cleanOptionalText(row.caption),
    credit: isRecord(credit) ? credit : undefined,
    placeholder: isRecord(variantsJson) && typeof variantsJson.placeholder === 'string' ? variantsJson.placeholder : undefined,
  };
}

function normalizeStoredVariant(value) {
  if (!isRecord(value) || typeof value.r2_key !== 'string' || !value.r2_key.trim()) return null;
  const width = Number(value.width);
  const height = Number(value.height);
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) return null;
  const variant = {
    r2_key: value.r2_key,
    width,
    height,
  };
  const sizeBytes = value.size_bytes ?? value.sizeBytes;
  const numericSizeBytes = Number(sizeBytes);
  if (Number.isInteger(numericSizeBytes) && numericSizeBytes >= 0) variant.size_bytes = numericSizeBytes;
  return variant;
}

function normalizeContentImageSnapshot(block, mediaSnapshot) {
  if (!isRecord(block)) return null;
  const mediaId = Number(block.media_id ?? block.mediaId ?? mediaSnapshot?.media_id);
  if (!Number.isInteger(mediaId) || mediaId <= 0) return null;

  const sourceVariants = isRecord(block.variants) ? block.variants : {};
  const variants = {};
  for (const key of ['sm', 'md', 'lg']) {
    const variant = normalizeStoredVariant(sourceVariants[key]);
    if (variant) variants[key] = variant;
  }

  if (!variants.sm || !variants.md || !variants.lg) return null;

  const snapshot = {
    media_id: mediaId,
    alt: cleanOptionalText(block.alt) ?? cleanOptionalText(block.title) ?? `Image ${mediaId}`,
    caption: cleanOptionalText(block.caption) ?? mediaSnapshot?.caption ?? cleanOptionalText(block.alt) ?? `Image ${mediaId}`,
    credit: isRecord(block.credit) ? block.credit : mediaSnapshot?.credit,
    placeholder: cleanOptionalText(block.placeholder) ?? mediaSnapshot?.placeholder ?? '',
    variants,
  };

  const focalPoint = isRecord(block.focal_point) ? block.focal_point : isRecord(block.focalPoint) ? block.focalPoint : null;
  if (focalPoint) snapshot.focal_point = focalPoint;
  const aspectRatio = cleanOptionalText(block.aspect_ratio ?? block.aspectRatio);
  if (aspectRatio) snapshot.aspect_ratio = aspectRatio;

  return snapshot.credit && snapshot.placeholder ? snapshot : null;
}

function normalizeImageRef(block, context) {
  if (!isRecord(block)) return null;
  const props = isRecord(block.props) ? block.props : {};
  const ref = block.image_ref ?? block.imageRef ?? props.image_ref ?? props.imageRef;
  if (typeof ref === 'string' && ref.trim()) return ref;

  const mediaId = block.media_id ?? block.mediaId ?? props.media_id ?? props.mediaId;
  const numericMediaId = typeof mediaId === 'number'
    ? mediaId
    : Number.parseInt(String(mediaId ?? ''), 10);
  if (Number.isInteger(numericMediaId) && numericMediaId > 0) {
    const imageRef = `body-image-${context.imageIndex}`;
    const mediaSnapshot = context.mediaById.get(numericMediaId) ?? null;
    const snapshot = normalizeContentImageSnapshot(block, mediaSnapshot);
    if (snapshot) context.contentImages[imageRef] = snapshot;
    context.imageIndex += 1;
    return imageRef;
  }
  return null;
}

function normalizeRelatedItems(value) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const articleId = item.article_id ?? item.articleId ?? item.id;
    const numericArticleId = typeof articleId === 'number'
      ? articleId
      : Number.parseInt(String(articleId ?? ''), 10);
    if (!Number.isInteger(numericArticleId) || numericArticleId <= 0) return [];

    if (isRecord(item.snapshot)) {
      const snapshot = { ...item.snapshot };
      if (typeof snapshot.id !== 'number') snapshot.id = numericArticleId;
      return [{ article_id: numericArticleId, snapshot }];
    }

    const slug = cleanOptionalText(item.slug) ?? `article-${numericArticleId}`;
    const headline = cleanOptionalText(item.headline) ?? cleanOptionalText(item.title) ?? slug;
    const type = item.type === 'recipe' || item.type === 'roundup' || item.type === 'article'
      ? item.type
      : 'article';

    const snapshot = {
      id: numericArticleId,
      type,
      slug,
      headline,
    };
    const shortDescription = cleanOptionalText(item.short_description) ?? cleanOptionalText(item.shortDescription) ?? cleanOptionalText(item.description);
    if (shortDescription) snapshot.short_description = shortDescription;

    return [{ article_id: numericArticleId, snapshot }];
  });
}

function normalizeBlock(input, index, context) {
  if (!isRecord(input)) return null;
  const type = typeof input.type === 'string' ? input.type : '';
  const props = isRecord(input.props) ? input.props : {};
  const id = blockId(input, index);

  if (type === 'paragraph') return { id, type: 'paragraph', text: cleanText(input.text ?? props.text ?? input.content) };
  if (type === 'heading') {
    const level = Number(input.level ?? props.level ?? 2);
    return { id, type: 'heading', level: [2, 3, 4, 5, 6].includes(level) ? level : 2, text: cleanText(input.text ?? props.text ?? input.content) };
  }
  if (type === 'blockquote') {
    const block = { id, type: 'blockquote', text: cleanText(input.text ?? props.text ?? input.content) };
    const cite = cleanOptionalText(input.cite ?? props.cite);
    if (cite) block.cite = cite;
    return block;
  }
  if (type === 'list') {
    const style = input.style === 'ordered' || input.style === 'checklist' || input.style === 'unordered' ? input.style : 'unordered';
    const items = Array.isArray(input.items) ? input.items.map(cleanText) : [];
    return { id, type: 'list', style, items };
  }
  if (type === 'tip_box' || type === 'alert') {
    const rawVariant = input.variant ?? props.variant ?? props.type ?? input.alertType;
    const variant = ['tip', 'warning', 'info', 'note'].includes(rawVariant) ? rawVariant : 'tip';
    const block = { id, type: 'tip_box', variant, text: cleanText(input.text ?? props.text ?? input.content) };
    const title = cleanOptionalText(input.title ?? props.title);
    if (title) block.title = title;
    return block;
  }
  if (type === 'divider') return { id, type: 'divider' };
  if (type === 'table') {
    const headers = Array.isArray(input.headers) ? input.headers.map(cleanText) : [];
    const rows = Array.isArray(input.rows) ? input.rows.map((row) => Array.isArray(row) ? row.map(cleanText) : []) : [];
    return { id, type: 'table', headers, rows };
  }
  if (type === 'video') {
    const provider = ['youtube', 'vimeo', 'self'].includes(input.provider) ? input.provider : 'youtube';
    const aspectRatio = input.aspect_ratio ?? input.aspectRatio ?? props.aspect_ratio ?? props.aspectRatio;
    const videoId = input.video_id ?? input.videoId ?? props.video_id ?? props.videoId;
    return {
      id,
      type: 'video',
      provider,
      video_id: cleanText(videoId),
      aspect_ratio: ['16:9', '4:3', '1:1', '9:16'].includes(aspectRatio) ? aspectRatio : '16:9',
    };
  }
  if (type === 'image' || type === 'customImage') {
    const imageRef = normalizeImageRef(input, context);
    return imageRef ? { id, type: 'image', image_ref: imageRef } : null;
  }
  if (type === 'before_after') {
    const beforeRef = input.before_image_ref ?? input.beforeImageRef ?? props.before_image_ref ?? props.beforeImageRef;
    const afterRef = input.after_image_ref ?? input.afterImageRef ?? props.after_image_ref ?? props.afterImageRef;
    if (typeof beforeRef !== 'string' || !beforeRef.trim() || typeof afterRef !== 'string' || !afterRef.trim()) return null;
    const layout = input.layout === 'side_by_side' || input.layout === 'slider' ? input.layout : 'slider';
    const block = { id, type: 'before_after', layout, before_image_ref: beforeRef, after_image_ref: afterRef };
    const beforeLabel = cleanOptionalText(input.before_label ?? input.beforeLabel ?? props.before_label ?? props.beforeLabel);
    const afterLabel = cleanOptionalText(input.after_label ?? input.afterLabel ?? props.after_label ?? props.afterLabel);
    if (beforeLabel) block.before_label = beforeLabel;
    if (afterLabel) block.after_label = afterLabel;
    return block;
  }
  if (type === 'related_content' || type === 'relatedContent') {
    const layout = input.layout === 'carousel' || input.layout === 'list' || input.layout === 'grid' ? input.layout : 'grid';
    const block = {
      id,
      type: 'related_content',
      layout,
      items: normalizeRelatedItems(input.items),
    };
    const title = cleanOptionalText(input.title);
    if (title) block.title = title;
    const limit = Number(input.limit);
    if (Number.isInteger(limit) && limit > 0) block.limit = limit;
    return block;
  }
  if (type === 'main_recipe' || type === 'mainRecipe') return { id, type: 'main_recipe' };
  if (type === 'main_roundup' || type === 'roundupList' || type === 'roundup_list') return { id, type: 'main_roundup' };
  if (type === 'main_faq' || type === 'faqSection' || type === 'faq_section') return { id, type: 'main_faq' };

  return null;
}

function normalizeContentJson(value, imagesJsonValue, mediaById) {
  const parsed = parseJson(value);
  const imagesJson = isRecord(parseJson(imagesJsonValue)) ? parseJson(imagesJsonValue) : {};
  const existingContentImages = isRecord(imagesJson.content_images) ? imagesJson.content_images : {};
  const context = {
    imageIndex: Object.keys(existingContentImages).length + 1,
    contentImages: { ...existingContentImages },
    mediaById,
  };
  const rawBlocks = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.blocks)
      ? parsed.blocks
      : [];

  const blocks = rawBlocks
    .map((block, index) => normalizeBlock(block, index, context))
    .filter(Boolean);

  const contentJson = {
    version: 1,
    kind: 'content_document',
    blocks,
  };

  const nextImagesJson = {
    ...imagesJson,
    ...(Object.keys(context.contentImages).length ? { content_images: context.contentImages } : {}),
  };

  return { contentJson, imagesJson: nextImagesJson };
}

function main() {
  if (args.includes('--remote')) fail('Remote access is forbidden. This migration only edits local Miniflare D1 state.');

  const d1Path = detectD1Path();
  const db = new DatabaseSync(d1Path);

  try {
    const mediaById = new Map(
      db.prepare('SELECT id, caption, credit, variants_json FROM media WHERE deleted_at IS NULL').all()
        .map((row) => [row.id, parseMediaSnapshot(row)])
    );

    const rows = db.prepare(`
      SELECT id, content_json, images_json
      FROM articles
      WHERE deleted_at IS NULL
        AND content_json IS NOT NULL
        AND content_json != ''
      ORDER BY id
    `).all();

    const updates = [];
    for (const row of rows) {
      const normalized = normalizeContentJson(row.content_json, row.images_json, mediaById);
      const serializedContent = JSON.stringify(normalized.contentJson);
      const serializedImages = JSON.stringify(normalized.imagesJson);
      if (serializedContent !== row.content_json || serializedImages !== row.images_json) {
        updates.push({
          id: row.id,
          before_length: String(row.content_json).length,
          after_length: serializedContent.length,
          block_count: normalized.contentJson.blocks.length,
          content_image_count: Object.keys(normalized.imagesJson.content_images ?? {}).length,
          content_json: serializedContent,
          images_json: serializedImages,
        });
      }
    }

    if (apply && updates.length) {
      const update = db.prepare('UPDATE articles SET content_json = ?, images_json = ? WHERE id = ?');
      db.exec('BEGIN');
      try {
        for (const row of updates) update.run(row.content_json, row.images_json, row.id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }

    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      local_only: true,
      d1_path: d1Path,
      rows_scanned: rows.length,
      rows_to_update: updates.length,
      updates: updates.map(({ id, before_length, after_length, block_count, content_image_count }) => ({ id, before_length, after_length, block_count, content_image_count })),
    }, null, 2));
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
