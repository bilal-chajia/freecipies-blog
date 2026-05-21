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
      if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'authors'").get()) return candidate;
    } finally {
      db.close();
    }
  }
  fail('No local D1 sqlite file with an authors table was found.');
}

function extractR2KeyFromUrl(url) {
  if (typeof url !== 'string') return null;
  const proxyMatch = url.match(/^\/api\/images\/(.+)$/);
  if (proxyMatch) return proxyMatch[1];
  const localMatch = url.match(/^https?:\/\/[^/]+\/api\/images\/(.+)$/);
  if (localMatch) return localMatch[1];
  const r2Match = url.match(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/i);
  if (r2Match) return r2Match[1];
  return null;
}

function normalizeVariant(value) {
  if (!isRecord(value)) return null;
  const r2Key = typeof value.r2_key === 'string'
    ? value.r2_key
    : extractR2KeyFromUrl(value.url);
  const width = Number(value.width);
  const height = Number(value.height);
  if (!r2Key || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;
  const result = {
    r2_key: r2Key,
    width,
    height,
  };
  const sizeBytes = Number(value.size_bytes ?? value.sizeBytes);
  if (Number.isFinite(sizeBytes) && sizeBytes >= 0) result.size_bytes = sizeBytes;
  return result;
}

function normalizeVariantSet(slot, mediaRow, keys) {
  const variants = {};
  const slotVariants = isRecord(slot?.variants) ? slot.variants : {};
  const mediaVariantsJson = parseJson(mediaRow?.variants_json);
  const mediaVariants = isRecord(mediaVariantsJson?.variants) ? mediaVariantsJson.variants : {};

  for (const key of keys) {
    const variant = normalizeVariant(slotVariants[key]) ?? normalizeVariant(mediaVariants[key]);
    if (variant) variants[key] = variant;
  }

  return Object.keys(variants).length === keys.length ? variants : null;
}

function mediaIdFromSlot(slot) {
  const mediaId = slot?.media_id ?? slot?.mediaId;
  const numeric = Number(mediaId);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function normalizeSlot(slot, mediaById, keys, fallbackAspectRatio, defaultAlt) {
  if (!isRecord(slot)) return null;
  const mediaId = mediaIdFromSlot(slot);
  const mediaRow = mediaId ? mediaById.get(mediaId) : null;
  const variants = normalizeVariantSet(slot, mediaRow, keys);
  if (!variants) return null;

  const mediaVariantsJson = parseJson(mediaRow?.variants_json);
  const normalized = {
    ...(mediaId ? { media_id: mediaId } : {}),
    alt: typeof slot.alt === 'string' && slot.alt.trim() ? slot.alt : defaultAlt,
    placeholder: typeof slot.placeholder === 'string' && slot.placeholder
      ? slot.placeholder
      : typeof mediaVariantsJson?.placeholder === 'string'
        ? mediaVariantsJson.placeholder
        : '',
    aspect_ratio: typeof slot.aspect_ratio === 'string'
      ? slot.aspect_ratio
      : typeof slot.aspectRatio === 'string'
        ? slot.aspectRatio
        : fallbackAspectRatio,
    variants,
  };

  const focalPoint = isRecord(slot.focal_point) ? slot.focal_point : isRecord(slot.focalPoint) ? slot.focalPoint : null;
  if (focalPoint) normalized.focal_point = focalPoint;

  return normalized.placeholder ? normalized : null;
}

function normalizeAuthorImages(imagesJson, mediaById, authorName) {
  const images = parseJson(imagesJson);
  if (!isRecord(images)) return {};
  const result = {};
  const avatar = normalizeSlot(images.avatar, mediaById, ['xs', 'sm'], '1:1', authorName);
  if (avatar) {
    avatar.aspect_ratio = '1:1';
    result.avatar = avatar;
  }
  const hero = normalizeSlot(images.hero, mediaById, ['sm', 'md', 'lg'], '16:9', authorName);
  if (hero) result.hero = hero;
  return result;
}

function main() {
  if (args.includes('--remote')) fail('Remote access is forbidden. This migration only edits local Miniflare D1 state.');
  const d1Path = detectD1Path();
  const db = new DatabaseSync(d1Path);
  try {
    const mediaById = new Map(
      db.prepare('SELECT id, variants_json FROM media WHERE deleted_at IS NULL').all()
        .map((row) => [row.id, row])
    );
    const rows = db.prepare(`
      SELECT id, name, images_json
      FROM authors
      WHERE deleted_at IS NULL
      ORDER BY id
    `).all();
    const updates = [];
    for (const row of rows) {
      const normalized = normalizeAuthorImages(row.images_json, mediaById, row.name);
      const serialized = JSON.stringify(normalized);
      if (serialized !== row.images_json) {
        updates.push({ id: row.id, images_json: serialized });
      }
    }

    if (apply && updates.length) {
      const update = db.prepare('UPDATE authors SET images_json = ? WHERE id = ?');
      db.exec('BEGIN');
      try {
        for (const row of updates) update.run(row.images_json, row.id);
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
