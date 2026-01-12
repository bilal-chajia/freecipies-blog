globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as categories } from './pinterest.schema_DDOHgYvi.mjs';
import { c as createDb, a as and, i as isNull, e as eq, b as asc } from './drizzle_DoAA6T5m.mjs';

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
async function createCategory(db, category) {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(categories).values(category).returning();
  return inserted || null;
}
async function updateCategory(db, slug, category) {
  const drizzle = createDb(db);
  const updateData = {
    ...category,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await drizzle.update(categories).set(updateData).where(eq(categories.slug, slug));
  return getCategoryBySlug(db, slug);
}
async function deleteCategory(db, slug) {
  const drizzle = createDb(db);
  await drizzle.update(categories).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(categories.slug, slug));
  return true;
}

export { getCategories as a, getCategoryById as b, createCategory as c, deleteCategory as d, getCategoryBySlug as g, updateCategory as u };
