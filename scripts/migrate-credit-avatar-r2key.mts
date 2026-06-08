/**
 * One-shot migration: clean residual `credit.avatar.variants.*.url` leaks in
 * `articles.images_json` (Contract Audit #1 residual — rows flagged by
 * scripts/local-contract-audit.mjs).
 *
 * Reuses the EXACT production save-path normalizer
 * (`normalizeImageSnapshotContainer('article', ...)`) so the result is
 * byte-identical to re-saving the article in the admin — zero divergence.
 *
 * Local D1 only. Dry-run by default; pass --apply to write.
 *
 *   pnpm exec tsx scripts/migrate-credit-avatar-r2key.mts          # dry-run
 *   pnpm exec tsx scripts/migrate-credit-avatar-r2key.mts --apply  # write
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { normalizeImageSnapshotContainer } from '../src/shared/images/image-contract';

const APPLY = process.argv.includes('--apply');
const TARGET_IDS = [2, 7, 8];

const D1_DIR = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

function findDb(): DatabaseSync {
  if (!existsSync(D1_DIR)) throw new Error(`D1 dir not found: ${D1_DIR}`);
  for (const name of readdirSync(D1_DIR)) {
    if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue;
    const db = new DatabaseSync(join(D1_DIR, name));
    const hit = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='articles'").get();
    if (hit) return db;
    db.close();
  }
  throw new Error('Could not find local D1 sqlite with an articles table');
}

function countUrlKeys(value: unknown): number {
  let n = 0;
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v)) {
        if (k === 'url') n += 1;
        walk(child);
      }
    }
  };
  walk(value);
  return n;
}

const db = findDb();
try {
  let changed = 0;
  for (const id of TARGET_IDS) {
    const row = db.prepare('SELECT images_json FROM articles WHERE id = ? AND deleted_at IS NULL').get(id) as
      | { images_json: string | null }
      | undefined;
    if (!row?.images_json) {
      console.log(`#${id}: no images_json — skipped`);
      continue;
    }

    const before = JSON.parse(row.images_json);
    const urlBefore = countUrlKeys(before);
    const normalized = normalizeImageSnapshotContainer('article', before);
    const urlAfter = countUrlKeys(normalized);
    const next = JSON.stringify(normalized);
    const isChanged = next !== JSON.stringify(before);

    console.log(`#${id}: url-keys ${urlBefore} -> ${urlAfter}${isChanged ? '' : ' (no change)'}`);
    if (urlAfter !== 0) {
      throw new Error(`#${id}: normalization left ${urlAfter} url key(s) — aborting`);
    }

    if (isChanged && APPLY) {
      db.prepare("UPDATE articles SET images_json = ?, updated_at = ? WHERE id = ?")
        .run(next, new Date().toISOString(), id);
      changed += 1;
    } else if (isChanged) {
      changed += 1;
    }
  }

  console.log(APPLY ? `\nApplied ${changed} update(s).` : `\nDry-run: ${changed} row(s) would change. Re-run with --apply to write.`);
} finally {
  db.close();
}
