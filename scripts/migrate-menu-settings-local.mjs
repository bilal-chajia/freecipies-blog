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

function detectD1Path() {
  const root = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!existsSync(root)) fail(`Local D1 state directory not found: ${root}`);

  for (const name of readdirSync(root)) {
    if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue;
    const candidate = join(root, name);
    const db = new DatabaseSync(candidate);
    try {
      const hasSiteSettings = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'site_settings'").get();
      if (hasSiteSettings) return candidate;
    } finally {
      db.close();
    }
  }

  fail('No local D1 sqlite file with site_settings table was found.');
}

function parseJson(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function targetFromUrl(url) {
  const href = typeof url === 'string' && url.trim() ? url.trim() : '#';
  return {
    type: href.startsWith('http') ? 'external_url' : 'internal_route',
    href,
  };
}

function normalizeMenuItem(item, location) {
  if (!item || typeof item !== 'object') return null;
  const type = ['link', 'group', 'mega', 'separator'].includes(item.type) ? item.type : 'link';
  const normalized = {
    id: typeof item.id === 'string' && item.id ? item.id : `menu-${Math.random().toString(36).slice(2, 10)}`,
    type,
    is_enabled: item.is_enabled !== undefined ? Boolean(item.is_enabled) : true,
    visibility: ['all', 'desktop', 'mobile'].includes(item.visibility) ? item.visibility : 'all',
    highlight: Boolean(item.highlight),
  };

  if (typeof item.label === 'string' && type !== 'separator') normalized.label = item.label;
  if (type === 'link') {
    normalized.target = item.target && typeof item.target === 'object'
      ? item.target
      : targetFromUrl(item.url);
    if (item.open_in_new_tab !== undefined || item.openInNewTab !== undefined) {
      normalized.open_in_new_tab = Boolean(item.open_in_new_tab ?? item.openInNewTab);
    }
  }

  if (type === 'group') {
    const children = Array.isArray(item.items) ? item.items : Array.isArray(item.children) ? item.children : [];
    normalized.items = children.map((child) => normalizeMenuItem(child, location)).filter(Boolean);
  }

  if (type === 'mega') {
    normalized.overview_target = item.overview_target && typeof item.overview_target === 'object'
      ? item.overview_target
      : (item.url ? targetFromUrl(item.url) : undefined);
    normalized.layout = ['columns', 'columns_with_featured_carousel', 'featured_left'].includes(item.layout)
      ? item.layout
      : item.featured?.enabled ? 'featured_left' : 'columns';
    normalized.columns = (Array.isArray(item.columns) ? item.columns : []).map((column) => ({
      id: typeof column.id === 'string' ? column.id : `column-${Math.random().toString(36).slice(2, 10)}`,
      title: typeof column.title === 'string' ? column.title : '',
      items: (Array.isArray(column.items) ? column.items : Array.isArray(column.links) ? column.links : [])
        .map((link) => normalizeMenuItem({ type: 'link', ...link }, location))
        .filter(Boolean),
    }));
    normalized.featured_items = Array.isArray(item.featured_items) ? item.featured_items : [];
    if (item.featured?.enabled) {
      normalized.featured_items.push({
        id: `${normalized.id}-featured`,
        type: 'featured_item',
        label: item.featured.title || 'Featured',
        description: item.featured.description,
        target: targetFromUrl(item.featured.url || '#'),
      });
    }
  }

  if (type === 'separator') {
    delete normalized.label;
  }

  return normalized;
}

function normalizeMenuDocument(raw, location) {
  if (Array.isArray(raw)) {
    return {
      location,
      is_enabled: true,
      fallback_to: location === 'mobile' ? 'header' : null,
      items: raw.map((item) => normalizeMenuItem(item, location)).filter(Boolean),
    };
  }

  if (raw && typeof raw === 'object' && Array.isArray(raw.items)) {
    return {
      location,
      is_enabled: raw.is_enabled !== undefined ? Boolean(raw.is_enabled) : true,
      fallback_to: location === 'mobile' && raw.fallback_to === 'header' ? 'header' : null,
      items: raw.items.map((item) => normalizeMenuItem(item, location)).filter(Boolean),
    };
  }

  return {
    location,
    is_enabled: true,
    fallback_to: location === 'mobile' ? 'header' : null,
    items: [],
  };
}

function migrate(db) {
  const rows = db.prepare("SELECT key, value FROM site_settings WHERE key IN ('menu_header', 'menu_footer', 'menu_mobile', 'menu_sidebar')").all();
  const updates = [];

  for (const row of rows) {
    const location = row.key.replace('menu_', '');
    const parsed = parseJson(row.value);
    const normalized = normalizeMenuDocument(parsed, location);
    const serialized = JSON.stringify(normalized);
    if (serialized !== row.value) updates.push({ key: row.key, value: serialized });
  }

  for (const key of ['menu_header', 'menu_footer', 'menu_mobile', 'menu_sidebar']) {
    if (!rows.some((row) => row.key === key)) {
      const location = key.replace('menu_', '');
      updates.push({ key, value: JSON.stringify(normalizeMenuDocument([], location)) });
    }
  }

  if (apply && updates.length) {
    const update = db.prepare(`
      INSERT INTO site_settings (key, value, description, category, type)
      VALUES (?, ?, ?, 'menus', 'json')
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        description = excluded.description,
        category = excluded.category,
        type = excluded.type
    `);
    for (const row of updates) {
      const location = row.key.replace('menu_', '');
      update.run(row.key, row.value, `${location.charAt(0).toUpperCase() + location.slice(1)} navigation menu configuration`);
    }
  }

  return {
    rows_scanned: rows.length,
    rows_to_update: updates.length,
    updates: updates.map((row) => ({ key: row.key })),
  };
}

function main() {
  if (args.includes('--remote')) fail('Remote access is forbidden. This migration only edits local Miniflare D1 state.');
  const d1Path = detectD1Path();
  const db = new DatabaseSync(d1Path);
  try {
    if (apply) db.exec('BEGIN');
    try {
      const result = migrate(db);
      if (apply) db.exec('COMMIT');
      console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', local_only: true, d1_path: d1Path, result }, null, 2));
    } catch (error) {
      if (apply) db.exec('ROLLBACK');
      throw error;
    }
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
