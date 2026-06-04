/**
 * One-shot migration: convert stored `categories.config_json` from the legacy
 * camelCase shape to the canonical snake_case `CategoryConfigJson` shape.
 *
 * This is required by the JSON dual-handling cleanup: the read path
 * (`hydrateCategory`, `normalizeConfigJsonObject`) now reads ONLY snake_case
 * keys, and several are key renames (not just casing) plus one value remap:
 *   layout      -> layout_mode
 *   layoutMode  -> layout_mode
 *   cardStyle   -> card_style
 *   sortBy      -> article_sort_by   (value: publishedAt->published_at, viewCount->view_count)
 *   sortOrder   -> article_sort_order
 *   featuredArticleId -> featured_article_id
 *   showInNav/showInFooter/showSidebar/showFilters/showBreadcrumb/showPagination
 *   showFeaturedRecipe/showHeroCta -> show_*
 *   heroCtaText/heroCtaLink -> hero_cta_text/hero_cta_link
 *   headerStyle -> header_style
 *   postsPerPage -> posts_per_page
 *
 * Idempotent: already-snake_case blobs pass through unchanged.
 * Local D1 only. Dry-run by default; pass --apply to write.
 *
 *   pnpm exec tsx scripts/migrate-category-config.mts          # dry-run
 *   pnpm exec tsx scripts/migrate-category-config.mts --apply  # write
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const APPLY = process.argv.includes('--apply');

/** camelCase key -> canonical snake_case key */
const KEY_MAP: Record<string, string> = {
  postsPerPage: 'posts_per_page',
  showInNav: 'show_in_nav',
  showInFooter: 'show_in_footer',
  layout: 'layout_mode',
  layoutMode: 'layout_mode',
  cardStyle: 'card_style',
  showSidebar: 'show_sidebar',
  showFilters: 'show_filters',
  showBreadcrumb: 'show_breadcrumb',
  showPagination: 'show_pagination',
  sortBy: 'article_sort_by',
  sortOrder: 'article_sort_order',
  headerStyle: 'header_style',
  featuredArticleId: 'featured_article_id',
  showFeaturedRecipe: 'show_featured_recipe',
  showHeroCta: 'show_hero_cta',
  heroCtaText: 'hero_cta_text',
  heroCtaLink: 'hero_cta_link',
};

/** value remap for article_sort_by */
const SORT_BY_VALUE: Record<string, string> = {
  publishedAt: 'published_at',
  viewCount: 'view_count',
  title: 'title',
  published_at: 'published_at',
  view_count: 'view_count',
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function migrateCategoryConfig(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const canonical = KEY_MAP[key] ?? key;
    let next = value;
    if (canonical === 'article_sort_by' && typeof value === 'string') {
      next = SORT_BY_VALUE[value] ?? value;
    }
    // If both a camel alias and its snake target exist, prefer an explicit snake value.
    if (out[canonical] === undefined || KEY_MAP[key] === undefined) {
      out[canonical] = next;
    }
  }
  return out;
}

function findDb(): DatabaseSync {
  const dir = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!existsSync(dir)) throw new Error(`D1 dir not found: ${dir}`);
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue;
    const db = new DatabaseSync(join(dir, name));
    if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get()) return db;
    db.close();
  }
  throw new Error('Could not find local D1 sqlite with a categories table');
}

function main(): void {
  const db = findDb();
  try {
    const rows = db.prepare("SELECT id, slug, config_json FROM categories WHERE config_json IS NOT NULL AND config_json != ''").all() as
      Array<{ id: number; slug: string; config_json: string }>;
    let changed = 0;
    for (const row of rows) {
      let parsed: unknown;
      try { parsed = JSON.parse(row.config_json); } catch { console.log(`#${row.id} ${row.slug}: invalid JSON — skipped`); continue; }
      const migrated = migrateCategoryConfig(parsed);
      const next = JSON.stringify(migrated);
      const isChanged = next !== JSON.stringify(parsed);
      console.log(`#${row.id} ${row.slug}: ${isChanged ? 'WOULD CHANGE' : 'no change'} -> ${next}`);
      if (isChanged) {
        changed += 1;
        if (APPLY) {
          db.prepare("UPDATE categories SET config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(next, row.id);
        }
      }
    }
    console.log(APPLY ? `\nApplied ${changed} update(s).` : `\nDry-run: ${changed} row(s) would change. Re-run with --apply.`);
  } finally {
    db.close();
  }
}

// Run only when executed directly (not when imported by tests).
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('migrate-category-config.mts');
if (invokedDirectly) main();
