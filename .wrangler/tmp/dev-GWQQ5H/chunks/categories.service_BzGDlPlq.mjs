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

import { c as categories } from './pinterest.schema_eG5oHE2g.mjs';
import { c as createDb, i as isNull, e as eq, a as and, b as asc } from './drizzle_BakpoMbM.mjs';

async function getCategories(db, options) {
  const drizzle = createDb(db);
  const conditions = [isNull(categories.deletedAt)];
  if (options?.isOnline !== void 0) {
    conditions.push(eq(categories.isOnline, options.isOnline));
  }
  if (options?.parentId !== void 0) {
    if (options.parentId === null) {
      conditions.push(isNull(categories.parentId));
    } else {
      conditions.push(eq(categories.parentId, options.parentId));
    }
  }
  return await drizzle.select().from(categories).where(and(...conditions)).orderBy(asc(categories.sortOrder), asc(categories.label));
}
async function getCategoryBySlug(db, slug) {
  const drizzle = createDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.slug, slug), isNull(categories.deletedAt))
  }) || null;
}
async function getCategoryById(db, id) {
  const drizzle = createDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.id, id), isNull(categories.deletedAt))
  }) || null;
}
async function calculateDepth(db, parentId) {
  if (!parentId) return 0;
  const parent = await getCategoryById(db, parentId);
  if (!parent) return 0;
  return (parent.depth || 0) + 1;
}
async function createCategory(db, category) {
  const drizzle = createDb(db);
  const depth = await calculateDepth(db, category.parentId);
  const [inserted] = await drizzle.insert(categories).values({
    ...category,
    depth
  }).returning();
  return inserted || null;
}
async function updateCategory(db, slug, category) {
  const drizzle = createDb(db);
  const depth = category.parentId !== void 0 ? await calculateDepth(db, category.parentId) : void 0;
  const updateData = {
    ...category,
    ...depth !== void 0 ? { depth } : {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await drizzle.update(categories).set(updateData).where(eq(categories.slug, slug));
  return getCategoryBySlug(db, slug);
}
async function updateCategoryById(db, id, category) {
  const drizzle = createDb(db);
  const depth = category.parentId !== void 0 ? await calculateDepth(db, category.parentId) : void 0;
  const updateData = {
    ...category,
    ...depth !== void 0 ? { depth } : {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await drizzle.update(categories).set(updateData).where(eq(categories.id, id));
  return getCategoryById(db, id);
}
async function deleteCategory(db, slug) {
  const drizzle = createDb(db);
  const result = await drizzle.update(categories).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(categories.slug, slug));
  return (result.rowsAffected ?? 0) > 0;
}
async function deleteCategoryById(db, id) {
  const drizzle = createDb(db);
  const result = await drizzle.update(categories).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(categories.id, id));
  return (result.rowsAffected ?? 0) > 0;
}

export { getCategoryBySlug as a, updateCategory as b, deleteCategory as c, deleteCategoryById as d, getCategories as e, createCategory as f, getCategoryById as g, updateCategoryById as u };
