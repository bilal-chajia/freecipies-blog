if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

import { s as siteSettings } from './pinterest.schema_eG5oHE2g.mjs';
import { c as createDb, e as eq } from './drizzle_BakpoMbM.mjs';

const IMAGE_UPLOAD_DEFAULTS = {
  webpQuality: 80,
  avifQuality: 70,
  maxFileSizeMB: 50,
  variantLg: 2048,
  variantMd: 1200,
  variantSm: 720,
  variantXs: 360,
  defaultFormat: "webp",
  defaultAspectRatio: "free",
  defaultCredit: ""
};
const IMAGE_SETTINGS_DB_KEY = "image_upload_settings";
const ASPECT_RATIO_OPTIONS = [
  { value: "free", label: "Free (no constraint)" },
  { value: "1:1", label: "1:1 Square" },
  { value: "16:9", label: "16:9 Widescreen" },
  { value: "4:3", label: "4:3 Standard" },
  { value: "2:3", label: "2:3 Portrait" },
  { value: "3:2", label: "3:2 Landscape" },
  { value: "9:16", label: "9:16 Vertical" },
  { value: "4:5", label: "4:5 Photo" }
];
({
  lg: IMAGE_UPLOAD_DEFAULTS.variantLg,
  md: IMAGE_UPLOAD_DEFAULTS.variantMd,
  sm: IMAGE_UPLOAD_DEFAULTS.variantSm,
  xs: IMAGE_UPLOAD_DEFAULTS.variantXs
});
({
  webp: IMAGE_UPLOAD_DEFAULTS.webpQuality,
  avif: IMAGE_UPLOAD_DEFAULTS.avifQuality});
({
  maxSizeBytes: IMAGE_UPLOAD_DEFAULTS.maxFileSizeMB * 1024 * 1024});
const parseAspectRatio = (value) => {
  if (value === "free") return null;
  const [w, h] = value.split(":").map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return null;
  return w / h;
};
ASPECT_RATIO_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = parseAspectRatio(option.value);
    return acc;
  },
  {}
);
ASPECT_RATIO_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {}
);

async function getSetting(db, key) {
  const drizzle = createDb(db);
  return await drizzle.query.siteSettings.findFirst({
    where: eq(siteSettings.key, key)
  }) || null;
}
async function getSettingValue(db, key) {
  const setting = await getSetting(db, key);
  if (!setting) return null;
  try {
    return JSON.parse(setting.value);
  } catch {
    return setting.value;
  }
}
async function upsertSetting(db, key, value, options) {
  const drizzle = createDb(db);
  const valueStr = typeof value === "object" ? JSON.stringify(value) : value;
  const existing = await getSetting(db, key);
  if (existing) {
    await drizzle.update(siteSettings).set({
      value: valueStr,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...options?.description && { description: options.description },
      ...options?.category && { category: options.category },
      ...options?.type && { type: options.type }
    }).where(eq(siteSettings.key, key));
  } else {
    await drizzle.insert(siteSettings).values({
      key,
      value: valueStr,
      description: options?.description,
      category: options?.category || "general",
      type: options?.type || "json"
    });
  }
  return true;
}
async function getDashboardStats(db) {
  const result = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL) as articles,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as categories,
      (SELECT COUNT(*) FROM authors WHERE deleted_at IS NULL) as authors,
      (SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL) as tags,
      (SELECT COALESCE(SUM(view_count), 0) FROM articles WHERE deleted_at IS NULL) as total_views
  `).first();
  return {
    articles: result?.articles || 0,
    categories: result?.categories || 0,
    authors: result?.authors || 0,
    tags: result?.tags || 0,
    totalViews: result?.total_views || 0
  };
}
const IMAGE_SETTINGS_KEY = IMAGE_SETTINGS_DB_KEY;
async function getImageUploadSettings(db) {
  const stored = await getSettingValue(db, IMAGE_SETTINGS_KEY);
  return { ...IMAGE_UPLOAD_DEFAULTS, ...stored };
}
async function updateImageUploadSettings(db, updates) {
  const current = await getImageUploadSettings(db);
  const newSettings = { ...current, ...updates };
  await upsertSetting(db, IMAGE_SETTINGS_KEY, newSettings, {
    description: "Image upload module configuration",
    category: "media",
    type: "json"
  });
  return newSettings;
}
async function resetImageUploadSettings(db) {
  await upsertSetting(db, IMAGE_SETTINGS_KEY, IMAGE_UPLOAD_DEFAULTS, {
    description: "Image upload module configuration",
    category: "media",
    type: "json"
  });
  return IMAGE_UPLOAD_DEFAULTS;
}

export { IMAGE_UPLOAD_DEFAULTS as I, getDashboardStats as a, getImageUploadSettings as g, resetImageUploadSettings as r, updateImageUploadSettings as u };
