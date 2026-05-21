#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

const VARIANT_KEYS = ['xs', 'sm', 'md', 'lg', 'original'];
const CONTRACT_R2_KEY_PATTERN = /^media\/images\/[a-z0-9]+(?:-[a-z0-9]+)*-(xs|sm|md|lg|original)-[a-z0-9]{8}\.[a-z0-9]+$/;
const D1_DIR = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
const R2_DIR = join(process.cwd(), '.wrangler', 'state', 'v3', 'r2', 'miniflare-R2BucketObject');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const deleteOld = args.includes('--delete-old');

if (args.includes('--remote')) {
  throw new Error('Remote access is forbidden. This migration is local-only.');
}

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

function findD1DbPath() {
  for (const file of listSqliteFiles(D1_DIR)) {
    const db = openDb(file);
    try {
      if (tableExists(db, 'media')) return file;
    } finally {
      db.close();
    }
  }
  throw new Error(`Could not find local D1 sqlite with media table under ${D1_DIR}`);
}

function findR2DbPath(sampleOldKeys) {
  let best = null;
  for (const file of listSqliteFiles(R2_DIR)) {
    const db = openDb(file);
    try {
      if (!tableExists(db, '_mf_objects')) continue;
      const objectCount = db.prepare('SELECT count(*) AS count FROM _mf_objects').get().count;
      let matchCount = 0;
      const hasKey = db.prepare('SELECT 1 FROM _mf_objects WHERE key = ? LIMIT 1');
      for (const key of sampleOldKeys.slice(0, 20)) {
        if (hasKey.get(key)) matchCount += 1;
      }
      if (!best || matchCount > best.matchCount || (matchCount === best.matchCount && objectCount > best.objectCount)) {
        best = { file, matchCount, objectCount };
      }
    } finally {
      db.close();
    }
  }
  if (!best) {
    throw new Error(`Could not find local R2 sqlite under ${R2_DIR}`);
  }
  return best.file;
}

function parseJson(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSlugBase(input) {
  const normalized = (input || 'image')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80);

  return normalized || 'image';
}

function imageAssetId(row) {
  return createHash('sha1')
    .update(`${row.id}:${row.created_at || ''}:${row.name || ''}:${row.alt_text || ''}`)
    .digest('hex')
    .slice(0, 8);
}

function extensionFromKey(key) {
  const ext = String(key || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || 'webp';
}

function buildKey({ slugBase, variant, assetId, extension }) {
  return `media/images/${normalizeSlugBase(slugBase)}-${variant}-${assetId}.${extension}`;
}

function collectMediaMappings(d1) {
  const rows = d1.prepare(`
    SELECT id, name, alt_text, created_at, variants_json
    FROM media
    WHERE deleted_at IS NULL
    ORDER BY id
  `).all();

  const mappings = [];
  const nextMediaRows = [];

  for (const row of rows) {
    const parsed = parseJson(row.variants_json);
    if (!isRecord(parsed) || !isRecord(parsed.variants)) continue;

    const assetId = imageAssetId(row);
    const slugBase = row.name || row.alt_text || `media-${row.id}`;
    let changed = false;

    for (const variant of VARIANT_KEYS) {
      const variantValue = parsed.variants[variant];
      if (!isRecord(variantValue) || typeof variantValue.r2_key !== 'string') continue;
      const oldKey = variantValue.r2_key;
      const newKey = buildKey({
        slugBase,
        variant,
        assetId,
        extension: extensionFromKey(oldKey),
      });

      if (oldKey !== newKey) {
        if (!CONTRACT_R2_KEY_PATTERN.test(newKey)) {
          throw new Error(`Generated invalid R2 key: ${newKey}`);
        }
        mappings.push({ media_id: row.id, variant, old_key: oldKey, new_key: newKey });
        variantValue.r2_key = newKey;
        changed = true;
      }
    }

    if (changed) {
      nextMediaRows.push({ id: row.id, variants_json: JSON.stringify(parsed) });
    }
  }

  return { activeMediaRows: rows.length, mappings, nextMediaRows };
}

function replaceAllMappings(value, mappings) {
  if (typeof value !== 'string' || value === '') return value;
  let next = value;
  for (const mapping of mappings) {
    next = next.split(mapping.old_key).join(mapping.new_key);
  }
  return next;
}

function q(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function getAppTables(db) {
  return db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_cf_%'
      AND name NOT LIKE '%_fts%'
      AND name NOT LIKE '%_idx'
      AND name NOT LIKE '%_data'
      AND name NOT LIKE '%_docsize'
      AND name NOT LIKE '%_config'
    ORDER BY name
  `).all().map((row) => row.name);
}

function getTextColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${q(table)})`).all()
    .filter((column) => {
      const type = String(column.type || '').toUpperCase();
      return type.includes('TEXT') || column.name.endsWith('_json') || column.name === 'credit';
    })
    .map((column) => column.name);
}

function insertR2Aliases(r2, mappings) {
  const existing = r2.prepare('SELECT key FROM _mf_objects WHERE key = ?');
  const source = r2.prepare('SELECT * FROM _mf_objects WHERE key = ?');
  const insert = r2.prepare(`
    INSERT INTO _mf_objects (
      key, blob_id, version, size, etag, uploaded, checksums, http_metadata, custom_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const missing = [];

  for (const mapping of mappings) {
    if (existing.get(mapping.new_key)) continue;
    const sourceRow = source.get(mapping.old_key);
    if (!sourceRow) {
      missing.push(mapping.old_key);
      continue;
    }
    insert.run(
      mapping.new_key,
      sourceRow.blob_id,
      sourceRow.version,
      sourceRow.size,
      sourceRow.etag,
      sourceRow.uploaded,
      sourceRow.checksums,
      sourceRow.http_metadata,
      sourceRow.custom_metadata,
    );
    inserted += 1;
  }

  return { inserted, missing };
}

function updateD1References(d1, mappings, nextMediaRows) {
  const updateMedia = d1.prepare('UPDATE media SET variants_json = ? WHERE id = ?');
  for (const row of nextMediaRows) {
    updateMedia.run(row.variants_json, row.id);
  }

  let updatedCells = 0;
  for (const table of getAppTables(d1)) {
    const columns = getTextColumns(d1, table);
    if (!columns.length) continue;

    const rows = d1.prepare(`SELECT rowid AS __rowid, ${columns.map(q).join(', ')} FROM ${q(table)}`).all();
    for (const row of rows) {
      const setParts = [];
      const values = [];

      for (const column of columns) {
        const current = row[column];
        const next = replaceAllMappings(current, mappings);
        if (next !== current) {
          setParts.push(`${q(column)} = ?`);
          values.push(next);
          updatedCells += 1;
        }
      }

      if (setParts.length) {
        d1.prepare(`UPDATE ${q(table)} SET ${setParts.join(', ')} WHERE rowid = ?`).run(...values, row.__rowid);
      }
    }
  }

  return updatedCells;
}

function deleteOldR2Keys(r2, mappings) {
  const remove = r2.prepare('DELETE FROM _mf_objects WHERE key = ?');
  let deleted = 0;
  for (const mapping of mappings) {
    const result = remove.run(mapping.old_key);
    deleted += result.changes;
  }
  return deleted;
}

function validateState(d1, r2, mappings) {
  const oldKeys = new Set(mappings.map((mapping) => mapping.old_key));
  const missingNewKeys = [];
  const newKeyExists = r2.prepare('SELECT 1 FROM _mf_objects WHERE key = ? LIMIT 1');
  for (const mapping of mappings) {
    if (!newKeyExists.get(mapping.new_key)) missingNewKeys.push(mapping.new_key);
  }

  const referencedOldKeys = [];
  for (const table of getAppTables(d1)) {
    const columns = getTextColumns(d1, table);
    if (!columns.length) continue;
    const rows = d1.prepare(`SELECT rowid AS __rowid, ${columns.map(q).join(', ')} FROM ${q(table)}`).all();
    for (const row of rows) {
      for (const column of columns) {
        const value = row[column];
        if (typeof value !== 'string') continue;
        for (const oldKey of oldKeys) {
          if (value.includes(oldKey)) {
            referencedOldKeys.push({ table, rowid: row.__rowid, column, old_key: oldKey });
            if (referencedOldKeys.length >= 20) return { missingNewKeys, referencedOldKeys };
          }
        }
      }
    }
  }

  return { missingNewKeys, referencedOldKeys };
}

function main() {
  const d1Path = findD1DbPath();
  const d1 = openDb(d1Path);
  let r2;

  try {
    const mappingSet = collectMediaMappings(d1);
    const sampleOldKeys = mappingSet.mappings.map((mapping) => mapping.old_key);
    const r2Path = findR2DbPath(sampleOldKeys);
    r2 = openDb(r2Path);

    const report = {
      mode: apply ? 'apply-direct-state' : 'dry-run-direct-state',
      local_only: true,
      d1_path: d1Path,
      r2_path: r2Path,
      active_media_rows: mappingSet.activeMediaRows,
      media_rows_to_update: mappingSet.nextMediaRows.length,
      r2_aliases_to_insert: mappingSet.mappings.length,
      delete_old: apply && deleteOld,
      sample_mappings: mappingSet.mappings.slice(0, 10),
    };

    if (!apply) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    let insertedR2 = 0;
    let missingOldR2Keys = [];
    let updatedD1Cells = 0;
    let deletedOldR2Keys = 0;

    r2.exec('BEGIN IMMEDIATE');
    try {
      const r2Result = insertR2Aliases(r2, mappingSet.mappings);
      insertedR2 = r2Result.inserted;
      missingOldR2Keys = r2Result.missing;
      if (missingOldR2Keys.length) {
        throw new Error(`Missing old R2 keys: ${JSON.stringify(missingOldR2Keys.slice(0, 20))}`);
      }
      r2.exec('COMMIT');
    } catch (error) {
      r2.exec('ROLLBACK');
      throw error;
    }

    d1.exec('BEGIN IMMEDIATE');
    try {
      updatedD1Cells = updateD1References(d1, mappingSet.mappings, mappingSet.nextMediaRows);
      d1.exec('COMMIT');
    } catch (error) {
      d1.exec('ROLLBACK');
      throw error;
    }

    const validation = validateState(d1, r2, mappingSet.mappings);
    if (validation.missingNewKeys.length || validation.referencedOldKeys.length) {
      throw new Error(`Validation failed: ${JSON.stringify(validation)}`);
    }

    if (deleteOld) {
      r2.exec('BEGIN IMMEDIATE');
      try {
        deletedOldR2Keys = deleteOldR2Keys(r2, mappingSet.mappings);
        r2.exec('COMMIT');
      } catch (error) {
        r2.exec('ROLLBACK');
        throw error;
      }
    }

    console.log(JSON.stringify({
      ...report,
      inserted_r2_aliases: insertedR2,
      updated_d1_cells: updatedD1Cells,
      deleted_old_r2_keys: deletedOldR2Keys,
    }, null, 2));
  } finally {
    d1.close();
    if (r2) r2.close();
  }
}

main();
