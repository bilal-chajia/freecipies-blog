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
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return {};
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
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
      const hasRequiredTables = ['articles', 'authors', 'categories'].every((table) =>
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
      );
      if (hasRequiredTables) return candidate;
    } finally {
      db.close();
    }
  }

  fail('No local D1 sqlite file with articles/authors/categories tables was found.');
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function booleanValue(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return fallback;
}

function twitterCard(value) {
  return value === 'summary' || value === 'summary_large_image' ? value : 'summary_large_image';
}

function normalizeSeoJson(value) {
  const source = parseJson(value);
  return {
    meta_title: stringOrNull(source.meta_title ?? source.metaTitle),
    meta_description: stringOrNull(source.meta_description ?? source.metaDescription),
    no_index: booleanValue(source.no_index ?? source.noIndex, false),
    canonical: stringOrNull(source.canonical ?? source.canonicalUrl),
    og_image: stringOrNull(source.og_image ?? source.ogImage),
    og_title: stringOrNull(source.og_title ?? source.ogTitle),
    og_description: stringOrNull(source.og_description ?? source.ogDescription),
    twitter_card: twitterCard(source.twitter_card ?? source.twitterCard),
  };
}

function migrateTable(db, table) {
  const rows = db.prepare(`SELECT id, seo_json FROM ${table}`).all();
  const updates = [];

  for (const row of rows) {
    const normalized = normalizeSeoJson(row.seo_json);
    const serialized = JSON.stringify(normalized);
    if (serialized !== (row.seo_json ?? '{}')) updates.push({ id: row.id, seo_json: serialized });
  }

  if (apply && updates.length) {
    const update = db.prepare(`UPDATE ${table} SET seo_json = ? WHERE id = ?`);
    for (const row of updates) update.run(row.seo_json, row.id);
  }

  return {
    table,
    rows_scanned: rows.length,
    rows_to_update: updates.length,
    updates: updates.map((row) => ({ id: row.id })),
  };
}

function main() {
  if (args.includes('--remote')) fail('Remote access is forbidden. This migration only edits local Miniflare D1 state.');
  const d1Path = detectD1Path();
  const db = new DatabaseSync(d1Path);

  try {
    const results = [];
    if (apply) db.exec('BEGIN');
    try {
      for (const table of ['articles', 'authors', 'categories']) {
        results.push(migrateTable(db, table));
      }
      if (apply) db.exec('COMMIT');
    } catch (error) {
      if (apply) db.exec('ROLLBACK');
      throw error;
    }

    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      local_only: true,
      d1_path: d1Path,
      results,
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
