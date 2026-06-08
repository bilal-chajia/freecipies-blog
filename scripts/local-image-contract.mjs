import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DB_NAME = 'freecipies-db';
const R2_BUCKET = 'saas-blog-images';
const IMAGE_VARIANT_KEYS = ['xs', 'sm', 'md', 'lg', 'original'];
const SNAPSHOT_VARIANT_KEYS = ['xs', 'sm', 'md', 'lg'];
const HERO_VARIANTS = ['sm', 'md', 'lg'];
const SMALL_VARIANTS = ['xs', 'sm'];
const INLINE_VARIANTS = ['sm', 'md', 'lg'];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonRecord(value) {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseLooseMediaVariantsRecord(value) {
  if (typeof value !== 'string' || !value.startsWith('{variants:{')) return null;

  const variants = {};
  for (const key of IMAGE_VARIANT_KEYS) {
    const pattern = new RegExp(`${key}:\\{r2_key:([^,]+),width:(\\d+),height:(\\d+)(?:,size_bytes:(\\d+))?\\}`);
    const match = value.match(pattern);
    if (!match) return null;

    variants[key] = {
      r2_key: match[1],
      width: Number(match[2]),
      height: Number(match[3]),
      ...(match[4] ? { size_bytes: Number(match[4]) } : {}),
    };
  }

  const placeholderMatch = value.match(/,placeholder:(.*)\}$/s);
  if (!placeholderMatch?.[1]) return null;

  return {
    variants,
    placeholder: placeholderMatch[1],
  };
}

function readNumber(record, key) {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readString(record, key) {
  return typeof record[key] === 'string' ? record[key] : undefined;
}

function readRecord(record, key) {
  return isRecord(record[key]) ? record[key] : null;
}

function extractR2KeyFromUrl(url) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, 'https://local.invalid');
    for (const prefix of ['/api/images/', '/images/']) {
      if (parsed.pathname.startsWith(prefix)) {
        return decodeURIComponent(parsed.pathname.slice(prefix.length));
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizeStorageVariant(input, label) {
  if (!isRecord(input)) throw new Error(`Invalid image variant "${label}"`);

  const r2Key = readString(input, 'r2_key')
    ?? readString(input, 'r2Key')
    ?? extractR2KeyFromUrl(readString(input, 'url'));
  const width = readNumber(input, 'width');
  const height = readNumber(input, 'height');
  const sizeBytes = readNumber(input, 'size_bytes') ?? readNumber(input, 'sizeBytes');

  if (!r2Key) throw new Error(`Image variant "${label}" is missing r2_key`);
  if (typeof width !== 'number') throw new Error(`Image variant "${label}" is missing width`);
  if (typeof height !== 'number') throw new Error(`Image variant "${label}" is missing height`);

  const result = { r2_key: r2Key, width, height };
  if (typeof sizeBytes === 'number') result.size_bytes = sizeBytes;
  return result;
}

function normalizeMediaVariantsJson(input) {
  const root = parseJsonRecord(input) ?? parseLooseMediaVariantsRecord(input);
  if (!root) throw new Error('media.variants_json must be a JSON object');

  const variantsSource = readRecord(root, 'variants') ?? root;
  const placeholder = readString(root, 'placeholder');
  if (!placeholder) throw new Error('media.variants_json.placeholder is required');

  const variants = {};
  for (const key of IMAGE_VARIANT_KEYS) {
    if (!variantsSource[key]) {
      throw new Error(`media.variants_json.variants.${key} is required`);
    }
    variants[key] = normalizeStorageVariant(variantsSource[key], key);
  }

  return { variants, placeholder };
}

function normalizeSnapshotVariant(input, label) {
  try {
    return normalizeStorageVariant(input, label);
  } catch {
    return null;
  }
}

function normalizeSnapshotVariants(input, allowedKeys) {
  const source = parseJsonRecord(input);
  const variants = {};
  if (!source) return variants;

  for (const key of allowedKeys) {
    const normalized = normalizeSnapshotVariant(source[key], key);
    if (normalized) variants[key] = normalized;
  }

  return variants;
}

function readFocalPoint(record) {
  const source = readRecord(record, 'focal_point') ?? readRecord(record, 'focalPoint');
  if (!source) return undefined;
  const x = readNumber(source, 'x');
  const y = readNumber(source, 'y');
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
}

function normalizeSnapshotSlot(input, allowedVariantKeys) {
  const source = parseJsonRecord(input);
  if (!source) return null;

  const variants = normalizeSnapshotVariants(source.variants, allowedVariantKeys);
  if (!Object.keys(variants).length) return null;

  const slot = { variants };
  const mediaId = readNumber(source, 'media_id') ?? readNumber(source, 'mediaId');
  if (typeof mediaId === 'number') slot.media_id = mediaId;

  const alt = readString(source, 'alt');
  if (alt !== undefined) slot.alt = alt;

  const caption = readString(source, 'caption');
  if (caption !== undefined) slot.caption = caption;

  if ('credit' in source) slot.credit = source.credit;

  const placeholder = readString(source, 'placeholder');
  if (placeholder !== undefined) slot.placeholder = placeholder;

  const focalPoint = readFocalPoint(source);
  if (focalPoint) slot.focal_point = focalPoint;

  const aspectRatio = readString(source, 'aspect_ratio') ?? readString(source, 'aspectRatio');
  if (aspectRatio !== undefined) slot.aspect_ratio = aspectRatio;

  return slot;
}

function normalizeImageSnapshotContainer(kind, input) {
  const source = parseJsonRecord(input);
  if (!source) return {};

  const result = {};
  const heroSource = source.hero;
  const hero = normalizeSnapshotSlot(heroSource, HERO_VARIANTS);
  if (hero) result.hero = hero;

  const thumbnail = normalizeSnapshotSlot(source.thumbnail, SMALL_VARIANTS);
  if (thumbnail) result.thumbnail = thumbnail;

  if (kind === 'author') {
    const avatar = normalizeSnapshotSlot(source.avatar, SMALL_VARIANTS);
    if (avatar) result.avatar = avatar;
  }

  if (kind === 'article') {
    const recipeStepsSource = readRecord(source, 'recipe_steps') ?? readRecord(source, 'recipeSteps');
    if (recipeStepsSource) {
      const recipeSteps = {};
      for (const [stepKey, stepValue] of Object.entries(recipeStepsSource)) {
        const slot = normalizeSnapshotSlot(stepValue, INLINE_VARIANTS);
        if (slot) recipeSteps[stepKey] = slot;
      }
      if (Object.keys(recipeSteps).length) result.recipe_steps = recipeSteps;
    }
  }

  return result;
}

function toMigrationResult(original, nextValue, issues = []) {
  return {
    changed: original !== nextValue,
    value: nextValue,
    issues,
  };
}

export function migrateMediaVariantsJsonText(jsonText) {
  const issues = [];
  try {
    const normalized = normalizeMediaVariantsJson(jsonText);
    return toMigrationResult(jsonText, JSON.stringify(normalized), issues);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
    return { changed: false, value: jsonText, issues };
  }
}

export function migrateImagesJsonText(kind, jsonText) {
  const issues = [];
  try {
    const normalized = normalizeImageSnapshotContainer(kind, jsonText);
    return toMigrationResult(jsonText, JSON.stringify(normalized), issues);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
    return { changed: false, value: jsonText, issues };
  }
}

export function buildMigrationPlan(rows, migrator) {
  const changed = [];
  const unchanged = [];
  const invalid = [];

  for (const row of rows) {
    const result = migrator(row.json ?? '');
    if (result.issues?.length) {
      invalid.push({ id: row.id, issues: result.issues });
    } else if (result.changed) {
      changed.push({ id: row.id, value: result.value });
    } else {
      unchanged.push({ id: row.id });
    }
  }

  return { changed, unchanged, invalid };
}

function assertLocalOnly(args) {
  if (args.includes('--remote')) {
    throw new Error('Remote access is forbidden for this phase. Remove --remote.');
  }
}

function runWrangler(args, options = {}) {
  assertLocalOnly(args);
  const result = spawnLocalCommand(['pnpm', 'exec', 'wrangler', ...args], options);

  if (result.status !== 0) {
    if (result.error) {
      throw result.error;
    }
    const stderr = result.stderr ? String(result.stderr).trim() : '';
    const stdout = result.stdout ? String(result.stdout).trim() : '';
    throw new Error(stderr || stdout || `wrangler exited with status ${result.status}`);
  }

  return result.stdout ? String(result.stdout) : '';
}

function parseD1Json(stdout) {
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => Array.isArray(entry.results) ? entry.results : []);
}

function d1Query(sql) {
  const stdout = runWrangler(['d1', 'execute', DB_NAME, '--local', '--json', '--command', sql.replace(/\s+/g, ' ').trim()]);
  return parseD1Json(stdout);
}

function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function d1Exec(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), 'saas-blog-image-contract-'));
  const filePath = join(tempDir, 'migration.sql');
  writeFileSync(filePath, sql, 'utf8');

  try {
    runWrangler(['d1', 'execute', DB_NAME, '--local', '--file', filePath]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function getRows(table, column) {
  return d1Query(`SELECT id, ${column} AS json FROM ${table} WHERE deleted_at IS NULL AND ${column} IS NOT NULL;`);
}

function getCounts() {
  return d1Query(`
    SELECT 'media' AS table_name, COUNT(*) AS total, SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active FROM media
    UNION ALL
    SELECT 'articles' AS table_name, COUNT(*) AS total, SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active FROM articles
    UNION ALL
    SELECT 'authors' AS table_name, COUNT(*) AS total, SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active FROM authors
    UNION ALL
    SELECT 'categories' AS table_name, COUNT(*) AS total, SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active FROM categories;
  `);
}

function countText(rows, pattern) {
  return rows.filter((row) => typeof row.json === 'string' && pattern.test(row.json)).length;
}

function auditMediaRows(rows) {
  const stats = {
    rows: rows.length,
    valid_json: 0,
    with_placeholder: 0,
    with_required_variants: 0,
    with_sizeBytes: countText(rows, /"sizeBytes"\s*:/),
    with_size_bytes: countText(rows, /"size_bytes"\s*:/),
    with_url: countText(rows, /"url"\s*:/),
    invalid: [],
  };

  for (const row of rows) {
    try {
      const normalized = normalizeMediaVariantsJson(row.json);
      stats.valid_json += 1;
      if (normalized.placeholder) stats.with_placeholder += 1;
      if (IMAGE_VARIANT_KEYS.every((key) => normalized.variants[key])) {
        stats.with_required_variants += 1;
      }
    } catch (error) {
      stats.invalid.push({ id: row.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return stats;
}

function auditSnapshotRows(rows) {
  const stats = {
    rows: rows.length,
    valid_json: 0,
    with_hero: countText(rows, /"hero"\s*:/),
    with_cover: countText(rows, /"cover"\s*:/),
    with_banner: countText(rows, /"banner"\s*:/),
    with_pinterest: countText(rows, /"pinterest"\s*:/),
    with_sizeBytes: countText(rows, /"sizeBytes"\s*:/),
    with_size_bytes: countText(rows, /"size_bytes"\s*:/),
    with_url: countText(rows, /"url"\s*:/),
    invalid: [],
  };

  for (const row of rows) {
    const parsed = parseJsonRecord(row.json);
    if (parsed) {
      stats.valid_json += 1;
    } else {
      stats.invalid.push({ id: row.id, error: 'Invalid JSON' });
    }
  }

  return stats;
}

function extractR2KeysFromRows(rows) {
  const keys = new Set();
  for (const row of rows) {
    try {
      const normalized = normalizeMediaVariantsJson(row.json);
      for (const key of IMAGE_VARIANT_KEYS) {
        keys.add(normalized.variants[key].r2_key);
      }
    } catch {
      // Invalid rows are reported by the JSON audit.
    }
  }
  return [...keys].sort();
}

function r2ObjectExists(key) {
  const result = spawnLocalCommand(['pnpm', 'exec', 'wrangler', 'r2', 'object', 'get', `${R2_BUCKET}/${key}`, '--local', '--pipe'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function powerShellQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function spawnLocalCommand(commandParts, options = {}) {
  if (process.platform === 'win32') {
    const command = `& ${commandParts.map(powerShellQuote).join(' ')}`;
    return spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
      cwd: process.cwd(),
      encoding: options.encoding ?? 'utf8',
      stdio: options.stdio,
    });
  }

  return spawnSync(commandParts[0], commandParts.slice(1), {
    cwd: process.cwd(),
    encoding: options.encoding ?? 'utf8',
    stdio: options.stdio,
  });
}

function parseR2Limit(args) {
  const sampleArg = args.find((arg) => arg.startsWith('--r2-sample='));
  if (!sampleArg) return undefined;
  const value = Number(sampleArg.split('=')[1]);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function applyPlan(table, column, plan) {
  if (!plan.changed.length) return;

  const statements = [
    'BEGIN TRANSACTION;',
    ...plan.changed.map((row) => (
      `UPDATE ${table} SET ${column} = ${sqlString(row.value)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${Number(row.id)};`
    )),
    'COMMIT;',
  ];

  d1Exec(statements.join('\n'));
}

async function audit(args) {
  const mediaRows = getRows('media', 'variants_json');
  const articleRows = getRows('articles', 'images_json');
  const authorRows = getRows('authors', 'images_json');
  const categoryRows = getRows('categories', 'images_json');

  const r2Limit = parseR2Limit(args);
  const skipR2 = args.includes('--skip-r2');
  const r2Keys = extractR2KeysFromRows(mediaRows);
  const r2KeysToCheck = skipR2 ? [] : r2Keys.slice(0, r2Limit ?? r2Keys.length);
  const missingR2Keys = [];
  for (const key of r2KeysToCheck) {
    if (!r2ObjectExists(key)) missingR2Keys.push(key);
  }

  const report = {
    mode: 'audit',
    local_only: true,
    d1: {
      database: DB_NAME,
      counts: getCounts(),
    },
    media_variants_json: auditMediaRows(mediaRows),
    snapshots: {
      articles: auditSnapshotRows(articleRows),
      authors: auditSnapshotRows(authorRows),
      categories: auditSnapshotRows(categoryRows),
    },
    r2: {
      bucket: R2_BUCKET,
      referenced_keys: r2Keys.length,
      checked_keys: r2KeysToCheck.length,
      missing_keys: missingR2Keys,
      skipped: skipR2,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

async function migrate(args) {
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run');
  if (apply === dryRun) {
    throw new Error('Use exactly one migration mode: --dry-run or --apply.');
  }

  const mediaPlan = buildMigrationPlan(getRows('media', 'variants_json'), migrateMediaVariantsJsonText);
  const articlePlan = buildMigrationPlan(getRows('articles', 'images_json'), (json) => migrateImagesJsonText('article', json));
  const authorPlan = buildMigrationPlan(getRows('authors', 'images_json'), (json) => migrateImagesJsonText('author', json));
  const categoryPlan = buildMigrationPlan(getRows('categories', 'images_json'), (json) => migrateImagesJsonText('category', json));

  if (apply) {
    applyPlan('media', 'variants_json', mediaPlan);
    applyPlan('articles', 'images_json', articlePlan);
    applyPlan('authors', 'images_json', authorPlan);
    applyPlan('categories', 'images_json', categoryPlan);
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    local_only: true,
    changed: {
      media: mediaPlan.changed.length,
      articles: articlePlan.changed.length,
      authors: authorPlan.changed.length,
      categories: categoryPlan.changed.length,
    },
    invalid: {
      media: mediaPlan.invalid,
      articles: articlePlan.invalid,
      authors: authorPlan.invalid,
      categories: categoryPlan.invalid,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  assertLocalOnly(args);

  const command = args[0] ?? 'audit';
  if (command === 'audit') {
    await audit(args.slice(1));
    return;
  }
  if (command === 'migrate') {
    await migrate(args.slice(1));
    return;
  }

  throw new Error(`Unknown command "${command}". Use "audit" or "migrate".`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
