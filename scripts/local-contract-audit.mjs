#!/usr/bin/env node
import { spawnSync, execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

const DB_NAME = 'freecipies-db';
const MEDIA_R2_KEY_PATTERN = /^media\/images\/[a-z0-9]+(?:-[a-z0-9]+)*-(xs|sm|md|lg|original)-[a-z0-9]{8}\.[a-z0-9]+$/;

const args = process.argv.slice(2);
const failOnViolations = args.includes('--fail-on-violations');
const summaryOnly = args.includes('--summary');

function assertLocalOnly() {
  if (args.includes('--remote')) {
    throw new Error('Remote access is forbidden for contract audits. Remove --remote.');
  }
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function run(commandParts, options = {}) {
  if (process.platform === 'win32') {
    const cmdString = commandParts.map(part => {
      if (/[ &()\[\]{}^=;!'+,`~%]/.test(part)) {
        return `"${part.replace(/"/g, '""')}"`;
      }
      return part;
    }).join(' ');

    try {
      const stdout = execSync(cmdString, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
        ...options,
      });
      return { status: 0, stdout, stderr: '' };
    } catch (error) {
      return {
        status: error.status ?? 1,
        stdout: error.stdout ? String(error.stdout) : '',
        stderr: error.stderr ? String(error.stderr) : '',
        error,
      };
    }
  }

  const result = spawnSync(commandParts[0], commandParts.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    ...options,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ? String(result.stdout) : '',
    stderr: result.stderr ? String(result.stderr) : '',
    error: result.error,
  };
}

const D1_DIR = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

function listSqliteFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite')
    .map((name) => join(dir, name));
}

function openDb(path) {
  return new DatabaseSync(path);
}

function tableExists(db, tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

let cachedDbPath = null;
function getD1DbPath() {
  if (cachedDbPath) return cachedDbPath;
  for (const file of listSqliteFiles(D1_DIR)) {
    const db = openDb(file);
    try {
      if (tableExists(db, 'media')) {
        cachedDbPath = file;
        return file;
      }
    } finally {
      db.close();
    }
  }
  throw new Error(`Could not find local D1 sqlite with media table under ${D1_DIR}`);
}

function runWranglerD1(sql) {
  const dbPath = getD1DbPath();
  const db = openDb(dbPath);
  try {
    return db.prepare(sql).all();
  } finally {
    db.close();
  }
}

function runRg(pattern, paths, extraGlobs = []) {
  const result = run([
    'rg',
    '-n',
    pattern,
    ...paths,
    '-g',
    '!**/__tests__/**',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*.test.tsx',
    '-g',
    '!src/modules/content-blocks/normalize/**',
    '-g',
    '!src/shared/images/image-contract.ts',
    ...extraGlobs.flatMap((glob) => ['-g', glob]),
  ]);
  if (result.status !== 0 && !result.stdout.trim()) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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

function walk(value, visitor, path = '$') {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${path}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      walk(child, visitor, `${path}.${key}`);
    }
  }
}

function hasKeyDeep(value, keyName) {
  let found = false;
  walk(value, (node) => {
    if (isRecord(node) && Object.prototype.hasOwnProperty.call(node, keyName)) {
      found = true;
    }
  });
  return found;
}

/**
 * Like hasKeyDeep('url') but ignores the `url` of equipment external affiliate
 * images (`{ source: 'external', url }`), which are a documented exception
 * (EQUIPMENT_TABLE_CONTRACT / IMAGE_JSON_CONTRACT "Allowed Exceptions").
 */
function hasUrlExcludingExternalImages(value) {
  let found = false;
  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;
    if (node.source === 'external') return; // allowed external image subtree
    if (Object.prototype.hasOwnProperty.call(node, 'url')) found = true;
    for (const child of Object.values(node)) visit(child);
  };
  visit(value);
  return found;
}

function collectKeysDeep(value, predicate) {
  const matches = [];
  walk(value, (node, path) => {
    if (!isRecord(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (predicate(key, child)) matches.push(`${path}.${key}`);
    }
  });
  return matches;
}

function isCamelCaseKey(key) {
  return /^[a-z][a-z0-9]*[A-Z]/.test(key);
}

function addViolation(report, area, message, detail = undefined) {
  report.violations.push({ area, message, ...(detail === undefined ? {} : { detail }) });
}

function summarizeRows(rows, column) {
  return rows.map((row) => ({ id: row.id, value: row[column] }));
}

function auditSchema(report) {
  const tables = {
    articles: runWranglerD1('PRAGMA table_info(articles);'),
    equipment: runWranglerD1('PRAGMA table_info(equipment);'),
    media: runWranglerD1('PRAGMA table_info(media);'),
  };

  const columnNames = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [table, rows.map((row) => row.name)])
  );

  report.d1.schema = columnNames;

  const forbiddenColumns = [
    ['articles', 'total_time_minutes'],
    ['articles', 'difficulty_label'],
    ['articles', 'cached_equipment_json'],
    ['categories', 'icon_svg'],
    ['categories', 'i18n_json'],
    ['tags', 'filter_groups_json'],
    ['equipment', 'price_display'],
  ];

  for (const [table, column] of forbiddenColumns) {
    if (columnNames[table]?.includes(column)) {
      addViolation(report, 'schema', `Forbidden column still exists: ${table}.${column}`);
    }
  }

  for (const required of ['caption', 'credit', 'variants_json']) {
    if (!columnNames.media?.includes(required)) {
      addViolation(report, 'schema', `Required media column is missing: media.${required}`);
    }
  }
}

function auditMedia(report) {
  const rows = runWranglerD1(`
    SELECT id, variants_json, credit, caption
    FROM media
    WHERE deleted_at IS NULL;
  `);

  const stats = {
    active_rows: rows.length,
    invalid_variants_json: [],
    missing_required_variant_rows: [],
    missing_placeholder_rows: [],
    variants_with_url_rows: [],
    variants_with_sizeBytes_rows: [],
    variants_with_noncanonical_r2_key_rows: [],
    invalid_credit_rows: [],
    missing_caption_rows: [],
  };

  for (const row of rows) {
    const variantsJson = parseJson(row.variants_json);
    if (!isRecord(variantsJson)) {
      stats.invalid_variants_json.push(row.id);
    } else {
      const variants = isRecord(variantsJson.variants) ? variantsJson.variants : variantsJson;
      const required = ['xs', 'sm', 'md', 'lg', 'original'];
      if (!required.every((key) => isRecord(variants[key]))) {
        stats.missing_required_variant_rows.push(row.id);
      }
      if (typeof variantsJson.placeholder !== 'string' || variantsJson.placeholder.length === 0) {
        stats.missing_placeholder_rows.push(row.id);
      }
      const hasNoncanonicalR2Key = required.some((key) => (
        isRecord(variants[key])
        && typeof variants[key].r2_key === 'string'
        && !MEDIA_R2_KEY_PATTERN.test(variants[key].r2_key)
      ));
      if (hasNoncanonicalR2Key) stats.variants_with_noncanonical_r2_key_rows.push(row.id);
      if (hasKeyDeep(variantsJson, 'url')) stats.variants_with_url_rows.push(row.id);
      if (hasKeyDeep(variantsJson, 'sizeBytes')) stats.variants_with_sizeBytes_rows.push(row.id);
    }

    const credit = parseJson(row.credit);
    if (!isRecord(credit) || credit.type !== 'author' || typeof credit.id !== 'number' || typeof credit.name !== 'string' || typeof credit.slug !== 'string') {
      stats.invalid_credit_rows.push(row.id);
    }

    if (typeof row.caption !== 'string' || row.caption.trim() === '') {
      stats.missing_caption_rows.push(row.id);
    }
  }

  report.d1.media = stats;
  for (const [key, value] of Object.entries(stats)) {
    if (Array.isArray(value) && value.length > 0) {
      addViolation(report, 'media', key, value.slice(0, 25));
    }
  }
}

function auditJsonRows(report, table, column, area, options = {}) {
  const rows = runWranglerD1(`
    SELECT id, ${column} AS json_value
    FROM ${table}
    WHERE deleted_at IS NULL
      AND ${column} IS NOT NULL
      AND ${column} != '';
  `);

  const stats = {
    rows: rows.length,
    invalid_json: [],
    camel_case_rows: [],
    url_rows: [],
    r2_key_rows: [],
    legacy_key_rows: [],
  };

  for (const row of rows) {
    const parsed = parseJson(row.json_value);
    if (parsed === null) {
      stats.invalid_json.push(row.id);
      continue;
    }

    const camelKeys = collectKeysDeep(parsed, isCamelCaseKey);
    if (camelKeys.length > 0) stats.camel_case_rows.push({ id: row.id, keys: camelKeys.slice(0, 10) });
    const hasUrl = options.allowExternalImageUrls
      ? hasUrlExcludingExternalImages(parsed)
      : hasKeyDeep(parsed, 'url');
    if (hasUrl) stats.url_rows.push(row.id);
    if (hasKeyDeep(parsed, 'r2_key')) stats.r2_key_rows.push(row.id);

    const legacyKeys = collectKeysDeep(parsed, (key) => (options.legacyKeys ?? []).includes(key));
    if (legacyKeys.length > 0) stats.legacy_key_rows.push({ id: row.id, keys: legacyKeys.slice(0, 10) });
  }

  report.d1[area] = stats;

  if (stats.invalid_json.length) addViolation(report, area, `${table}.${column} contains invalid JSON`, stats.invalid_json.slice(0, 25));
  if (options.forbidCamelCase && stats.camel_case_rows.length) addViolation(report, area, `${table}.${column} contains camelCase keys`, stats.camel_case_rows.slice(0, 10));
  if (options.forbidUrl && stats.url_rows.length) addViolation(report, area, `${table}.${column} stores url keys`, stats.url_rows.slice(0, 25));
  if (options.forbidR2Key && stats.r2_key_rows.length) addViolation(report, area, `${table}.${column} exposes r2_key where resolved payload is expected`, stats.r2_key_rows.slice(0, 25));
  if (stats.legacy_key_rows.length) addViolation(report, area, `${table}.${column} contains legacy keys`, stats.legacy_key_rows.slice(0, 10));
}

function auditArticleContent(report) {
  auditJsonRows(report, 'articles', 'content_json', 'content_json', {
    forbidCamelCase: true,
    legacyKeys: ['faqSection', 'roundupList', 'mainRecipe', 'customImage', 'relatedContent', 'contentImages'],
  });
  auditJsonRows(report, 'articles', 'images_json', 'article_images_json', {
    forbidCamelCase: true,
    forbidUrl: true,
    legacyKeys: ['cover', 'banner', 'pinterest', 'contentImages', 'recipeSteps', 'sizeBytes', 'aspectRatio'],
  });
  auditJsonRows(report, 'authors', 'images_json', 'author_images_json', {
    forbidCamelCase: true,
    forbidUrl: true,
    legacyKeys: ['cover', 'banner', 'sizeBytes', 'aspectRatio'],
  });
  auditJsonRows(report, 'categories', 'images_json', 'category_images_json', {
    forbidCamelCase: true,
    forbidUrl: true,
    legacyKeys: ['cover', 'banner', 'sizeBytes', 'aspectRatio'],
  });
  auditJsonRows(report, 'articles', 'recipe_json', 'recipe_json', {
    forbidCamelCase: true,
    forbidUrl: true,
    // Equipment external affiliate images legitimately carry `url`
    // (source: "external") — see EQUIPMENT_TABLE_CONTRACT / IMAGE_JSON_CONTRACT.
    allowExternalImageUrls: true,
    legacyKeys: ['aggregateRating', 'recipeCategory', 'recipeCuisine', 'suitableForDiet', 'recipeYield', 'totalTimeMinutes', 'difficultyLabel'],
  });
  auditJsonRows(report, 'articles', 'roundup_json', 'roundup_json', {
    forbidCamelCase: true,
    forbidUrl: true,
    legacyKeys: ['sourceType', 'articleId', 'externalUrl', 'canonicalUrl'],
  });
  auditJsonRows(report, 'articles', 'seo_json', 'article_seo_json', {
    forbidCamelCase: true,
    legacyKeys: ['metaTitle', 'metaDescription', 'noIndex', 'ogImage', 'ogTitle', 'ogDescription', 'twitterCard', 'canonicalUrl'],
  });
  auditJsonRows(report, 'authors', 'seo_json', 'author_seo_json', {
    forbidCamelCase: true,
    legacyKeys: ['metaTitle', 'metaDescription', 'noIndex', 'ogImage', 'ogTitle', 'ogDescription', 'twitterCard', 'canonicalUrl'],
  });
  auditJsonRows(report, 'categories', 'seo_json', 'category_seo_json', {
    forbidCamelCase: true,
    legacyKeys: ['metaTitle', 'metaDescription', 'noIndex', 'ogImage', 'ogTitle', 'ogDescription', 'twitterCard', 'canonicalUrl'],
  });
  auditFaqsJson(report);
  auditArticleRelationshipCaches(report);
  auditCardAndTocCaches(report);
  auditRecipeStepImages(report);
  auditRecipeEquipment(report);
}

function auditFaqsJson(report) {
  const rows = runWranglerD1(`
    SELECT id, faqs_json
    FROM articles
    WHERE deleted_at IS NULL
      AND faqs_json IS NOT NULL
      AND faqs_json != '';
  `);
  const stats = {
    rows: rows.length,
    invalid_json: [],
    non_object_rows: [],
    missing_items_rows: [],
    legacy_item_key_rows: [],
  };
  for (const row of rows) {
    const parsed = parseJson(row.faqs_json);
    if (!parsed) {
      stats.invalid_json.push(row.id);
      continue;
    }
    if (!isRecord(parsed)) {
      stats.non_object_rows.push(row.id);
      continue;
    }
    if (!Array.isArray(parsed.items)) stats.missing_items_rows.push(row.id);
    if (Array.isArray(parsed.items) && parsed.items.some((item) => isRecord(item) && (item.q !== undefined || item.a !== undefined))) {
      stats.legacy_item_key_rows.push(row.id);
    }
  }
  report.d1.faqs_json = stats;
  if (stats.invalid_json.length) addViolation(report, 'faqs_json', 'articles.faqs_json contains invalid JSON', stats.invalid_json.slice(0, 25));
  if (stats.non_object_rows.length) addViolation(report, 'faqs_json', 'articles.faqs_json must be an object source, not an array', stats.non_object_rows.slice(0, 25));
  if (stats.missing_items_rows.length) addViolation(report, 'faqs_json', 'articles.faqs_json is missing items[]', stats.missing_items_rows.slice(0, 25));
  if (stats.legacy_item_key_rows.length) addViolation(report, 'faqs_json', 'articles.faqs_json contains q/a legacy item keys', stats.legacy_item_key_rows.slice(0, 25));
}

function auditArticleRelationshipCaches(report) {
  const rows = runWranglerD1(`
    SELECT id, cached_author_json, cached_category_json, cached_tags_json
    FROM articles
    WHERE deleted_at IS NULL;
  `);
  const stats = {
    rows: rows.length,
    author_with_role_rows: [],
    author_missing_required_rows: [],
    category_missing_id_rows: [],
    tag_string_array_rows: [],
    tag_missing_required_rows: [],
  };
  for (const row of rows) {
    const author = parseJson(row.cached_author_json);
    if (isRecord(author) && Object.keys(author).length > 0) {
      if (author.role !== undefined) stats.author_with_role_rows.push(row.id);
      for (const key of ['id', 'slug', 'name', 'job_title', 'bio', 'avatar', 'social_links']) {
        if (!Object.prototype.hasOwnProperty.call(author, key)) {
          stats.author_missing_required_rows.push({ id: row.id, key });
          break;
        }
      }
    }
    const category = parseJson(row.cached_category_json);
    if (isRecord(category) && Object.keys(category).length > 0 && category.id === undefined) {
      stats.category_missing_id_rows.push(row.id);
    }
    const tags = parseJson(row.cached_tags_json);
    if (Array.isArray(tags)) {
      if (tags.some((tag) => typeof tag === 'string')) stats.tag_string_array_rows.push(row.id);
      if (tags.some((tag) => !isRecord(tag) || tag.id === undefined || tag.label === undefined || tag.slug === undefined || !Object.prototype.hasOwnProperty.call(tag, 'color'))) {
        stats.tag_missing_required_rows.push(row.id);
      }
    }
  }
  report.d1.article_relationship_caches = stats;
  if (stats.author_with_role_rows.length) addViolation(report, 'article_relationship_caches', 'cached_author_json stores forbidden role', stats.author_with_role_rows.slice(0, 25));
  if (stats.author_missing_required_rows.length) addViolation(report, 'article_relationship_caches', 'cached_author_json missing required keys', stats.author_missing_required_rows.slice(0, 10));
  if (stats.category_missing_id_rows.length) addViolation(report, 'article_relationship_caches', 'cached_category_json missing id', stats.category_missing_id_rows.slice(0, 25));
  if (stats.tag_string_array_rows.length) addViolation(report, 'article_relationship_caches', 'cached_tags_json still stores string labels', stats.tag_string_array_rows.slice(0, 25));
  if (stats.tag_missing_required_rows.length) addViolation(report, 'article_relationship_caches', 'cached_tags_json missing required tag snapshot keys', stats.tag_missing_required_rows.slice(0, 25));
}

function auditCardAndTocCaches(report) {
  const rows = runWranglerD1(`
    SELECT id, cached_card_json, cached_toc_json
    FROM articles
    WHERE deleted_at IS NULL;
  `);
  const stats = {
    rows: rows.length,
    card_invalid_rows: [],
    card_legacy_thumbnail_rows: [],
    card_missing_required_rows: [],
    card_with_url_rows: [],
    toc_invalid_rows: [],
    toc_missing_required_rows: [],
  };
  for (const row of rows) {
    const card = parseJson(row.cached_card_json);
    if (!isRecord(card)) {
      stats.card_invalid_rows.push(row.id);
    } else {
      if (card.thumbnail !== undefined) stats.card_legacy_thumbnail_rows.push(row.id);
      for (const key of ['id', 'type', 'slug', 'headline', 'short_description', 'image', 'category', 'author', 'tags']) {
        if (!Object.prototype.hasOwnProperty.call(card, key)) {
          stats.card_missing_required_rows.push({ id: row.id, key });
          break;
        }
      }
      if (hasKeyDeep(card, 'url')) stats.card_with_url_rows.push(row.id);
    }

    const toc = parseJson(row.cached_toc_json);
    if (!Array.isArray(toc)) {
      stats.toc_invalid_rows.push(row.id);
    } else if (toc.some((item) => !isRecord(item) || item.number === undefined || item.parent_id === undefined || item.source_type === undefined)) {
      stats.toc_missing_required_rows.push(row.id);
    }
  }
  report.d1.card_and_toc_caches = stats;
  if (stats.card_invalid_rows.length) addViolation(report, 'card_and_toc_caches', 'cached_card_json is not an object', stats.card_invalid_rows.slice(0, 25));
  if (stats.card_legacy_thumbnail_rows.length) addViolation(report, 'card_and_toc_caches', 'cached_card_json stores legacy thumbnail key', stats.card_legacy_thumbnail_rows.slice(0, 25));
  if (stats.card_missing_required_rows.length) addViolation(report, 'card_and_toc_caches', 'cached_card_json missing required keys', stats.card_missing_required_rows.slice(0, 10));
  if (stats.card_with_url_rows.length) addViolation(report, 'card_and_toc_caches', 'cached_card_json stores url keys', stats.card_with_url_rows.slice(0, 25));
  if (stats.toc_invalid_rows.length) addViolation(report, 'card_and_toc_caches', 'cached_toc_json is not an array', stats.toc_invalid_rows.slice(0, 25));
  if (stats.toc_missing_required_rows.length) addViolation(report, 'card_and_toc_caches', 'cached_toc_json missing number/parent_id/source_type', stats.toc_missing_required_rows.slice(0, 25));
}

function auditRecipeEquipment(report) {
  const rows = runWranglerD1(`
    SELECT id, recipe_json
    FROM articles
    WHERE deleted_at IS NULL
      AND type = 'recipe'
      AND recipe_json IS NOT NULL
      AND recipe_json != '';
  `);

  const stats = {
    rows: rows.length,
    invalid_recipe_json: [],
    catalog_without_snapshot_rows: [],
    catalog_without_equipment_id_rows: [],
    manual_with_snapshot_rows: [],
    manual_with_equipment_id_rows: [],
    snapshot_with_price_display_rows: [],
  };

  for (const row of rows) {
    const recipe = parseJson(row.recipe_json);
    if (!isRecord(recipe)) {
      stats.invalid_recipe_json.push(row.id);
      continue;
    }

    const equipmentList = Array.isArray(recipe.equipment) ? recipe.equipment : [];
    const catalogWithoutSnapshot = [];
    const catalogWithoutEquipmentId = [];
    const manualWithSnapshot = [];
    const manualWithEquipmentId = [];
    const snapshotWithPriceDisplay = [];

    equipmentList.forEach((item, index) => {
      if (!isRecord(item)) return;
      const sourceType = item.source_type;
      const equipmentId = item.equipment_id;
      const snapshot = item.snapshot;

      if (sourceType === 'catalog') {
        if (typeof equipmentId !== 'number') catalogWithoutEquipmentId.push(index);
        if (!isRecord(snapshot)) catalogWithoutSnapshot.push(index);
      }

      if (sourceType === 'manual') {
        if (equipmentId !== null) manualWithEquipmentId.push(index);
        if (snapshot !== null) manualWithSnapshot.push(index);
      }

      if (isRecord(snapshot) && Object.prototype.hasOwnProperty.call(snapshot, 'price_display')) {
        snapshotWithPriceDisplay.push(index);
      }
    });

    if (catalogWithoutSnapshot.length) stats.catalog_without_snapshot_rows.push({ id: row.id, items: catalogWithoutSnapshot.slice(0, 10) });
    if (catalogWithoutEquipmentId.length) stats.catalog_without_equipment_id_rows.push({ id: row.id, items: catalogWithoutEquipmentId.slice(0, 10) });
    if (manualWithSnapshot.length) stats.manual_with_snapshot_rows.push({ id: row.id, items: manualWithSnapshot.slice(0, 10) });
    if (manualWithEquipmentId.length) stats.manual_with_equipment_id_rows.push({ id: row.id, items: manualWithEquipmentId.slice(0, 10) });
    if (snapshotWithPriceDisplay.length) stats.snapshot_with_price_display_rows.push({ id: row.id, items: snapshotWithPriceDisplay.slice(0, 10) });
  }

  report.d1.recipe_equipment = stats;
  if (stats.invalid_recipe_json.length) addViolation(report, 'recipe_equipment', 'articles.recipe_json contains invalid JSON', stats.invalid_recipe_json.slice(0, 25));
  if (stats.catalog_without_snapshot_rows.length) addViolation(report, 'recipe_equipment', 'catalog equipment items require snapshot', stats.catalog_without_snapshot_rows.slice(0, 10));
  if (stats.catalog_without_equipment_id_rows.length) addViolation(report, 'recipe_equipment', 'catalog equipment items require equipment_id', stats.catalog_without_equipment_id_rows.slice(0, 10));
  if (stats.manual_with_snapshot_rows.length) addViolation(report, 'recipe_equipment', 'manual equipment items must not store snapshot', stats.manual_with_snapshot_rows.slice(0, 10));
  if (stats.manual_with_equipment_id_rows.length) addViolation(report, 'recipe_equipment', 'manual equipment items must use equipment_id null', stats.manual_with_equipment_id_rows.slice(0, 10));
  if (stats.snapshot_with_price_display_rows.length) addViolation(report, 'recipe_equipment', 'equipment snapshots must not contain price_display', stats.snapshot_with_price_display_rows.slice(0, 10));
}

function auditRecipeStepImages(report) {
  const rows = runWranglerD1(`
    SELECT id, recipe_json, images_json
    FROM articles
    WHERE deleted_at IS NULL
      AND type = 'recipe'
      AND recipe_json IS NOT NULL
      AND recipe_json != '';
  `);

  const stats = {
    rows: rows.length,
    invalid_recipe_json: [],
    invalid_images_json: [],
    direct_step_image_rows: [],
    missing_recipe_step_snapshot_rows: [],
  };

  for (const row of rows) {
    const recipe = parseJson(row.recipe_json);
    if (!isRecord(recipe)) {
      stats.invalid_recipe_json.push(row.id);
      continue;
    }

    const images = row.images_json ? parseJson(row.images_json) : {};
    if (row.images_json && !isRecord(images)) {
      stats.invalid_images_json.push(row.id);
    }
    const recipeSteps = isRecord(images?.recipe_steps) ? images.recipe_steps : {};
    const directStepImageKeys = [];
    const missingRefs = [];

    const sections = Array.isArray(recipe.instructions) ? recipe.instructions : [];
    sections.forEach((section, sectionIndex) => {
      const steps = isRecord(section) && Array.isArray(section.steps) ? section.steps : [];
      steps.forEach((step, stepIndex) => {
        if (!isRecord(step)) return;
        for (const key of ['image', 'image_url', 'imageUrl']) {
          if (Object.prototype.hasOwnProperty.call(step, key)) {
            directStepImageKeys.push(`instructions[${sectionIndex}].steps[${stepIndex}].${key}`);
          }
        }
        if (typeof step.image_ref === 'string' && step.image_ref.trim() && !isRecord(recipeSteps[step.image_ref])) {
          missingRefs.push(step.image_ref);
        }
      });
    });

    if (directStepImageKeys.length) {
      stats.direct_step_image_rows.push({ id: row.id, keys: directStepImageKeys.slice(0, 10) });
    }
    if (missingRefs.length) {
      stats.missing_recipe_step_snapshot_rows.push({ id: row.id, refs: Array.from(new Set(missingRefs)).slice(0, 10) });
    }
  }

  report.d1.recipe_step_images = stats;
  if (stats.invalid_recipe_json.length) addViolation(report, 'recipe_step_images', 'articles.recipe_json contains invalid JSON', stats.invalid_recipe_json.slice(0, 25));
  if (stats.invalid_images_json.length) addViolation(report, 'recipe_step_images', 'articles.images_json contains invalid JSON', stats.invalid_images_json.slice(0, 25));
  if (stats.direct_step_image_rows.length) addViolation(report, 'recipe_step_images', 'recipe steps store direct image keys', stats.direct_step_image_rows.slice(0, 10));
  if (stats.missing_recipe_step_snapshot_rows.length) addViolation(report, 'recipe_step_images', 'recipe step image_ref missing images_json.recipe_steps snapshot', stats.missing_recipe_step_snapshot_rows.slice(0, 10));
}

function auditCaches(report) {
  const cacheColumns = [
    ['cached_tags_json', 'cached_tags_json'],
    ['cached_category_json', 'cached_category_json'],
    ['cached_author_json', 'cached_author_json'],
    ['cached_rating_json', 'cached_rating_json'],
    ['cached_toc_json', 'cached_toc_json'],
    ['cached_recipe_json', 'cached_recipe_json'],
    ['cached_card_json', 'cached_card_json'],
    ['jsonld_json', 'jsonld_json'],
  ];

  for (const [column, area] of cacheColumns) {
    auditJsonRows(report, 'articles', column, area, {
      forbidCamelCase: column !== 'jsonld_json',
      forbidUrl: column !== 'jsonld_json',
    });
  }
}

function auditSettings(report) {
  const rows = runWranglerD1(`
    SELECT key, value
    FROM site_settings
    WHERE key = 'toc_settings'
    LIMIT 1;
  `);

  const stats = {
    has_toc_settings: rows.length > 0,
    invalid_json: false,
    camel_case_keys: [],
    missing_required_keys: [],
    invalid_max_depth: false,
  };

  if (rows.length) {
    const parsed = parseJson(rows[0].value);
    if (!isRecord(parsed)) {
      stats.invalid_json = true;
    } else {
      const allowed = ['enabled', 'numbering', 'collapsible', 'default_open', 'show_jump_button', 'accent_color', 'max_depth'];
      stats.camel_case_keys = collectKeysDeep(parsed, isCamelCaseKey);
      stats.missing_required_keys = allowed.filter((key) => !Object.prototype.hasOwnProperty.call(parsed, key));
      stats.invalid_max_depth = typeof parsed.max_depth !== 'number' || parsed.max_depth < 2 || parsed.max_depth > 6;
    }
  }

  report.d1.toc_settings = stats;
  if (!stats.has_toc_settings) addViolation(report, 'toc_settings', 'site_settings.toc_settings is missing');
  if (stats.invalid_json) addViolation(report, 'toc_settings', 'site_settings.toc_settings contains invalid JSON');
  if (stats.camel_case_keys.length) addViolation(report, 'toc_settings', 'site_settings.toc_settings contains camelCase keys', stats.camel_case_keys.slice(0, 10));
  if (stats.missing_required_keys.length) addViolation(report, 'toc_settings', 'site_settings.toc_settings is missing required keys', stats.missing_required_keys);
  if (stats.invalid_max_depth) addViolation(report, 'toc_settings', 'site_settings.toc_settings has invalid max_depth');

  const menuRows = runWranglerD1(`
    SELECT key, value
    FROM site_settings
    WHERE key IN ('menu_header', 'menu_footer', 'menu_mobile', 'menu_sidebar')
    ORDER BY key;
  `);

  const menuStats = {
    present_keys: menuRows.map((row) => row.key),
    missing_keys: ['menu_header', 'menu_footer', 'menu_mobile', 'menu_sidebar'].filter((key) => !menuRows.some((row) => row.key === key)),
    invalid_json: [],
    invalid_documents: [],
    camel_case_keys: [],
    url_keys: [],
    r2_key_public_urls: [],
  };

  for (const row of menuRows) {
    const location = row.key.replace('menu_', '');
    const parsed = parseJson(row.value);
    if (!isRecord(parsed)) {
      menuStats.invalid_json.push(row.key);
      continue;
    }

    const requiredShape =
      parsed.location === location &&
      typeof parsed.is_enabled === 'boolean' &&
      (parsed.fallback_to === null || (location === 'mobile' && parsed.fallback_to === 'header')) &&
      Array.isArray(parsed.items);

    if (!requiredShape) menuStats.invalid_documents.push(row.key);

    const camelKeys = collectKeysDeep(parsed, isCamelCaseKey);
    if (camelKeys.length) menuStats.camel_case_keys.push({ key: row.key, keys: camelKeys.slice(0, 10) });

    const urlKeys = collectKeysDeep(parsed, (key) => key === 'url' || key === 'openInNewTab' || key === 'featured');
    if (urlKeys.length) menuStats.url_keys.push({ key: row.key, keys: urlKeys.slice(0, 10) });

    const publicUrlImageKeys = collectKeysDeep(parsed, (key, value) => key === 'url' && typeof value === 'string' && value.includes('/api/images/'));
    if (publicUrlImageKeys.length) menuStats.r2_key_public_urls.push({ key: row.key, keys: publicUrlImageKeys.slice(0, 10) });
  }

  report.d1.menu_settings = menuStats;
  if (menuStats.missing_keys.length) addViolation(report, 'menu_settings', 'canonical menu_* settings are missing', menuStats.missing_keys);
  if (menuStats.invalid_json.length) addViolation(report, 'menu_settings', 'menu_* settings contain invalid JSON', menuStats.invalid_json);
  if (menuStats.invalid_documents.length) addViolation(report, 'menu_settings', 'menu_* settings are not canonical menu documents', menuStats.invalid_documents);
  if (menuStats.camel_case_keys.length) addViolation(report, 'menu_settings', 'menu_* settings contain camelCase keys', menuStats.camel_case_keys.slice(0, 10));
  if (menuStats.url_keys.length) addViolation(report, 'menu_settings', 'menu_* settings contain legacy url/openInNewTab/featured keys', menuStats.url_keys.slice(0, 10));
  if (menuStats.r2_key_public_urls.length) addViolation(report, 'menu_settings', 'menu_* image snapshots contain public URLs', menuStats.r2_key_public_urls.slice(0, 10));
}

function auditCode(report) {
  const scans = [
    {
      area: 'code_legacy_blocks',
      pattern: '\\b(faqSection|roundupList|mainRecipe|customImage|relatedContent)\\b',
      paths: ['src'],
      extraGlobs: [
        '!src/admin/components/BlockEditor/**',
        '!src/admin/features/articles/pages/shared/useGutenbergCanvasHandlers.ts',
      ],
    },
    {
      area: 'code_legacy_fields',
      pattern: '\\b(cachedEquipmentJson|priceDisplay|defaultCreditAuthorId)\\b',
      paths: ['src'],
    },
    {
      area: 'code_obsolete_sql_names',
      pattern: '\\b(cached_equipment_json|price_display|difficulty_label)\\b',
      paths: ['src', 'db/schema.sql'],
    },
  ];

  for (const scan of scans) {
    const matches = runRg(scan.pattern, scan.paths, scan.extraGlobs ?? []);
    report.code[scan.area] = matches;
    if (matches.length) {
      addViolation(report, 'code', scan.area, matches.slice(0, 50));
    }
  }
}

function buildReport() {
  const report = {
    mode: 'contract-audit',
    local_only: true,
    database: DB_NAME,
    generated_at: new Date().toISOString(),
    d1: {},
    code: {},
    violations: [],
  };

  auditSchema(report);
  auditMedia(report);
  auditArticleContent(report);
  auditCaches(report);
  auditSettings(report);
  auditCode(report);

  report.summary = {
    violations: report.violations.length,
  };

  return report;
}

function main() {
  assertLocalOnly();
  const report = buildReport();
  if (summaryOnly) {
    console.log(JSON.stringify({
      mode: report.mode,
      local_only: report.local_only,
      database: report.database,
      generated_at: report.generated_at,
      summary: report.summary,
      violations: report.violations.map(({ area, message }) => ({ area, message })),
    }, null, 2));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  if (failOnViolations && report.violations.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
