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
  for (const name of readdirSync(root)) {
    if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue;
    const candidate = join(root, name);
    const db = new DatabaseSync(candidate);
    try {
      if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articles'").get()) return candidate;
    } finally {
      db.close();
    }
  }
  fail('No local D1 sqlite file with an articles table was found.');
}

function normalizeFaqs(value) {
  const source = parseJson(value);
  const objectSource = Array.isArray(source) ? { items: source } : isRecord(source) ? source : {};
  const items = Array.isArray(objectSource.items) ? objectSource.items : [];
  return {
    heading: typeof objectSource.heading === 'string' && objectSource.heading.trim()
      ? objectSource.heading.trim()
      : 'Frequently Asked Questions',
    intro: typeof objectSource.intro === 'string' && objectSource.intro.trim() ? objectSource.intro.trim() : null,
    items: items
      .map((item) => ({
        question: typeof item?.question === 'string' ? item.question : typeof item?.q === 'string' ? item.q : '',
        answer: typeof item?.answer === 'string' ? item.answer : typeof item?.a === 'string' ? item.a : '',
      }))
      .filter((item) => item.question.trim() && item.answer.trim())
      .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() })),
  };
}

function socialLinksFromBio(value) {
  const bio = parseJson(value);
  const socials = isRecord(bio) && Array.isArray(bio.socials) ? bio.socials : [];
  return socials
    .filter((item) => isRecord(item) && item.network && item.url)
    .map((item) => ({
      network: item.network,
      url: item.url,
      ...(item.label ? { label: item.label } : {}),
    }));
}

function authorSnapshot(author) {
  if (!author) return null;
  const images = parseJson(author.images_json);
  return {
    id: author.id,
    slug: author.slug,
    name: author.name,
    job_title: author.job_title || null,
    bio: author.short_description || null,
    avatar: isRecord(images) ? images.avatar ?? null : null,
    social_links: socialLinksFromBio(author.bio_json),
  };
}

function categorySnapshot(category) {
  if (!category) return null;
  return {
    id: category.id,
    slug: category.slug,
    label: category.label,
    color: category.color || null,
  };
}

function tagColor(styleJson) {
  const style = parseJson(styleJson);
  return isRecord(style) && typeof style.color === 'string' ? style.color : null;
}

function stripInlineMarkdown(text) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

function nextHeadingNumber(counters, level) {
  const index = level - 2;
  counters[index] = (counters[index] || 0) + 1;
  for (let i = index + 1; i < counters.length; i += 1) counters[i] = 0;
  return counters.slice(0, index + 1).filter((value) => value > 0).join('.');
}

function closestParent(stack, level) {
  for (let current = level - 1; current >= 2; current -= 1) {
    if (stack[current]) return stack[current];
  }
  return null;
}

function roundupItemAnchor(position, title) {
  return `item-${position}`;
}

function extractBlocks(contentJson) {
  const content = parseJson(contentJson);
  if (Array.isArray(content)) return content;
  if (isRecord(content) && Array.isArray(content.blocks)) return content.blocks;
  return [];
}

function buildToc(contentJson, headline, roundupJson) {
  const blocks = extractBlocks(contentJson);
  const roundup = parseJson(roundupJson);
  const toc = [];
  const counters = [0, 0, 0, 0, 0];
  const stack = {};

  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.type === 'heading') {
      const level = Number(block.level || 2);
      if (level < 2 || level > 6) continue;
      const rawText = String(block.text || '').trim();
      if (!rawText) continue;
      const id = slugifyHeading(rawText);
      toc.push({
        id,
        text: stripInlineMarkdown(rawText),
        level,
        number: nextHeadingNumber(counters, level),
        parent_id: closestParent(stack, level),
        source_type: 'heading',
      });
      stack[level] = id;
      for (let current = level + 1; current <= 6; current += 1) delete stack[current];
    }
    if (block.type === 'main_recipe') {
      const id = 'recipe-card';
      toc.push({ id, text: headline || 'Recipe', level: 2, number: nextHeadingNumber(counters, 2), parent_id: null, source_type: 'marker' });
      stack[2] = id;
    }
    if (block.type === 'main_roundup') {
      const id = 'main-roundup';
      const number = nextHeadingNumber(counters, 2);
      toc.push({ id, text: headline || 'Roundup', level: 2, number, parent_id: null, source_type: 'marker' });
      stack[2] = id;
      const items = isRecord(roundup) && Array.isArray(roundup.items) ? roundup.items : [];
      items.forEach((item, index) => {
        const position = Number(item?.position) || index + 1;
        const text = String(item?.title || item?.headline || `Item ${position}`).trim();
        toc.push({
          id: roundupItemAnchor(position, text),
          text,
          level: 3,
          number: `${number}.${index + 1}`,
          parent_id: id,
          source_type: 'roundup_item',
          position,
        });
      });
    }
    if (block.type === 'main_faq') {
      const id = 'faq-section';
      toc.push({ id, text: 'Frequently Asked Questions', level: 2, number: nextHeadingNumber(counters, 2), parent_id: null, source_type: 'marker' });
      stack[2] = id;
    }
  }

  return toc;
}

function cardVariant(variant) {
  if (!isRecord(variant) || typeof variant.r2_key !== 'string') return null;
  const width = Number(variant.width);
  const height = Number(variant.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return {
    r2_key: variant.r2_key,
    width,
    height,
    ...(Number.isFinite(Number(variant.size_bytes)) ? { size_bytes: Number(variant.size_bytes) } : {}),
  };
}

function cardImage(imagesJson, fallbackAlt) {
  const images = parseJson(imagesJson);
  const slot = isRecord(images) ? images.thumbnail || images.hero : null;
  if (!isRecord(slot) || !isRecord(slot.variants)) return null;
  const xs = cardVariant(slot.variants.xs);
  const sm = cardVariant(slot.variants.sm);
  if (!xs || !sm) return null;
  return {
    ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
    alt: typeof slot.alt === 'string' && slot.alt.trim() ? slot.alt : fallbackAlt,
    placeholder: typeof slot.placeholder === 'string' ? slot.placeholder : '',
    variants: { xs, sm },
  };
}

function buildCard(article, cachedAuthor, cachedCategory, cachedTags) {
  const cachedRecipe = parseJson(article.cached_recipe_json) || {};
  const cachedRating = parseJson(article.cached_rating_json) || {};
  const card = {
    id: article.id,
    type: article.type,
    slug: article.slug,
    headline: article.headline,
    short_description: article.short_description,
    image: cardImage(article.images_json, article.headline),
    category: cachedCategory,
    author: isRecord(cachedAuthor) && Object.keys(cachedAuthor).length
      ? {
        id: cachedAuthor.id,
        slug: cachedAuthor.slug,
        name: cachedAuthor.name,
        job_title: cachedAuthor.job_title ?? null,
        avatar: cachedAuthor.avatar ?? null,
      }
      : null,
    tags: cachedTags,
  };
  if (article.type === 'recipe') {
    card.recipe = {
      total_time_minutes: cachedRecipe.total_time_minutes ?? null,
      difficulty: cachedRecipe.difficulty ?? null,
      calories_per_serving: cachedRecipe.calories_per_serving ?? null,
      badges: cachedRecipe.badges ?? {},
    };
    card.rating = isRecord(cachedRating) && Object.keys(cachedRating).length ? cachedRating : null;
  } else if (article.type === 'article') {
    card.reading_time = article.reading_time_minutes || null;
  } else if (article.type === 'roundup') {
    const roundup = parseJson(article.roundup_json);
    card.item_count = isRecord(roundup) && Array.isArray(roundup.items) ? roundup.items.length : 0;
  }
  return card;
}

function main() {
  if (args.includes('--remote')) fail('Remote access is forbidden. This migration only edits local Miniflare D1 state.');
  const d1Path = detectD1Path();
  const db = new DatabaseSync(d1Path);

  try {
    const authors = new Map(db.prepare('SELECT id, slug, name, job_title, short_description, images_json, bio_json FROM authors').all().map((row) => [row.id, row]));
    const categories = new Map(db.prepare('SELECT id, slug, label, color FROM categories').all().map((row) => [row.id, row]));
    const tagRows = db.prepare(`
      SELECT att.article_id, t.id, t.slug, t.label, t.style_json
      FROM articles_to_tags att
      INNER JOIN tags t ON t.id = att.tag_id
      WHERE t.deleted_at IS NULL
      ORDER BY t.label
    `).all();
    const tagsByArticle = new Map();
    for (const row of tagRows) {
      const list = tagsByArticle.get(row.article_id) ?? [];
      list.push({
        id: row.id,
        label: row.label,
        slug: row.slug,
        color: tagColor(row.style_json),
      });
      tagsByArticle.set(row.article_id, list);
    }

    const articles = db.prepare(`
      SELECT id, type, slug, headline, short_description, author_id, category_id, content_json, roundup_json,
             images_json, faqs_json, cached_author_json, cached_category_json, cached_tags_json,
             cached_recipe_json, cached_rating_json, cached_card_json, cached_toc_json, reading_time_minutes
      FROM articles
    `).all();
    const updates = [];

    for (const article of articles) {
      const cachedAuthor = authorSnapshot(authors.get(article.author_id)) ?? {};
      const cachedCategory = categorySnapshot(categories.get(article.category_id)) ?? {};
      const cachedTags = tagsByArticle.get(article.id) ?? [];
      const next = {
        faqs_json: JSON.stringify(normalizeFaqs(article.faqs_json)),
        cached_author_json: JSON.stringify(cachedAuthor),
        cached_category_json: JSON.stringify(cachedCategory),
        cached_tags_json: JSON.stringify(cachedTags),
        cached_toc_json: JSON.stringify(buildToc(article.content_json, article.headline, article.roundup_json)),
        cached_card_json: JSON.stringify(buildCard(article, cachedAuthor, cachedCategory, cachedTags)),
      };
      if (
        next.faqs_json !== (article.faqs_json ?? '{}') ||
        next.cached_author_json !== (article.cached_author_json ?? '{}') ||
        next.cached_category_json !== (article.cached_category_json ?? '{}') ||
        next.cached_tags_json !== (article.cached_tags_json ?? '[]') ||
        next.cached_toc_json !== (article.cached_toc_json ?? '[]') ||
        next.cached_card_json !== (article.cached_card_json ?? '{}')
      ) {
        updates.push({ id: article.id, ...next });
      }
    }

    if (apply && updates.length) {
      const update = db.prepare(`
        UPDATE articles
        SET faqs_json = ?, cached_author_json = ?, cached_category_json = ?, cached_tags_json = ?,
            cached_toc_json = ?, cached_card_json = ?
        WHERE id = ?
      `);
      db.exec('BEGIN');
      try {
        for (const row of updates) {
          update.run(
            row.faqs_json,
            row.cached_author_json,
            row.cached_category_json,
            row.cached_tags_json,
            row.cached_toc_json,
            row.cached_card_json,
            row.id
          );
        }
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
      rows_scanned: articles.length,
      rows_to_update: updates.length,
      updates: updates.map((row) => ({ id: row.id })),
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
