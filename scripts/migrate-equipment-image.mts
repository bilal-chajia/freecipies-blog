/**
 * One-shot migration: convert equipment product images to the canonical
 * hybrid shape introduced for Contract Audit #6.
 *
 * Equipment images are now a discriminated union:
 *   { source: "media",    media_id, alt?, placeholder?, variants:{xs,sm:{r2_key,...}} }  // owned R2 photo
 *   { source: "external", url, alt?, width?, height? }                                   // affiliate image (Amazon, …)
 *
 * Legacy stored shapes were ad-hoc external images without `source`:
 *   { url, variants:{ md:{url}, sm:{url} } }   and   { url, alt, width, height }
 *
 * This migrates BOTH surfaces:
 *   - equipment.image_json
 *   - articles.recipe_json.equipment[].snapshot.image  (catalog snapshot copies)
 *
 * Idempotent. Local D1 only. Dry-run by default; pass --apply to write.
 *
 *   pnpm exec tsx scripts/migrate-equipment-image.mts          # dry-run
 *   pnpm exec tsx scripts/migrate-equipment-image.mts --apply  # write
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const APPLY = process.argv.includes('--apply');

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Convert a legacy/ad-hoc equipment image object to the canonical hybrid shape. */
export function toCanonicalEquipmentImage(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) return {};
  // Already canonical — leave as-is (idempotent).
  if (input.source === 'media' || input.source === 'external') return input;

  const variants = isRecord(input.variants) ? input.variants : undefined;
  const variantUrl = (key: string): string | undefined => {
    const v = variants?.[key];
    return isRecord(v) && typeof v.url === 'string' ? v.url : undefined;
  };

  // An owned R2 snapshot has variants with r2_key — promote to source: "media".
  const hasR2 = variants && Object.values(variants).some(
    (v) => isRecord(v) && typeof v.r2_key === 'string',
  );
  if (hasR2) {
    return { source: 'media', ...input };
  }

  const url = (typeof input.url === 'string' ? input.url : undefined)
    ?? variantUrl('md') ?? variantUrl('sm') ?? variantUrl('lg') ?? variantUrl('xs');
  if (!url) return {}; // no usable image

  const out: Record<string, unknown> = { source: 'external', url };
  if (typeof input.alt === 'string') out.alt = input.alt;
  if (typeof input.width === 'number') out.width = input.width;
  if (typeof input.height === 'number') out.height = input.height;
  return out;
}

function findDb(): DatabaseSync {
  const dir = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!existsSync(dir)) throw new Error(`D1 dir not found: ${dir}`);
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue;
    const db = new DatabaseSync(join(dir, name));
    if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='equipment'").get()) return db;
    db.close();
  }
  throw new Error('Could not find local D1 sqlite with an equipment table');
}

function migrateEquipmentTable(db: DatabaseSync): number {
  const rows = db.prepare("SELECT id, slug, image_json FROM equipment WHERE image_json IS NOT NULL AND image_json != ''").all() as
    Array<{ id: number; slug: string; image_json: string }>;
  let changed = 0;
  for (const row of rows) {
    let parsed: unknown;
    try { parsed = JSON.parse(row.image_json); } catch { console.log(`equipment #${row.id} ${row.slug}: invalid JSON — skipped`); continue; }
    const next = JSON.stringify(toCanonicalEquipmentImage(parsed));
    if (next === JSON.stringify(parsed)) { console.log(`equipment #${row.id} ${row.slug}: no change`); continue; }
    console.log(`equipment #${row.id} ${row.slug}: -> ${next}`);
    changed += 1;
    if (APPLY) db.prepare("UPDATE equipment SET image_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(next, row.id);
  }
  return changed;
}

function migrateArticleSnapshots(db: DatabaseSync): number {
  const rows = db.prepare("SELECT id, slug, recipe_json FROM articles WHERE recipe_json IS NOT NULL AND recipe_json != ''").all() as
    Array<{ id: number; slug: string; recipe_json: string }>;
  let changed = 0;
  for (const row of rows) {
    let recipe: unknown;
    try { recipe = JSON.parse(row.recipe_json); } catch { continue; }
    if (!isRecord(recipe) || !Array.isArray(recipe.equipment)) continue;
    let touched = false;
    for (const item of recipe.equipment) {
      if (isRecord(item) && isRecord(item.snapshot) && isRecord(item.snapshot.image)) {
        const before = JSON.stringify(item.snapshot.image);
        const after = toCanonicalEquipmentImage(item.snapshot.image);
        if (JSON.stringify(after) !== before) { item.snapshot.image = after; touched = true; }
      }
    }
    if (!touched) continue;
    console.log(`article #${row.id} ${row.slug}: equipment snapshot images migrated`);
    changed += 1;
    if (APPLY) db.prepare("UPDATE articles SET recipe_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(JSON.stringify(recipe), row.id);
  }
  return changed;
}

function main(): void {
  const db = findDb();
  try {
    const eq = migrateEquipmentTable(db);
    const arts = migrateArticleSnapshots(db);
    console.log(APPLY
      ? `\nApplied: ${eq} equipment row(s), ${arts} article(s).`
      : `\nDry-run: ${eq} equipment row(s) + ${arts} article(s) would change. Re-run with --apply.`);
  } finally {
    db.close();
  }
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('migrate-equipment-image.mts');
if (invokedDirectly) main();
