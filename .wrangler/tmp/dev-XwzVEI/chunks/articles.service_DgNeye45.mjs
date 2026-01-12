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

import { a as articles, c as categories, b as authors } from './pinterest.schema_eG5oHE2g.mjs';
import { c as createDb, i as isNull, e as eq, o as or, l as like, a as and, b as asc, d as desc } from './drizzle_BakpoMbM.mjs';
import { h as hydrateArticles, a as hydrateArticle } from './hydration_PCOoIFzn.mjs';
import { g as getTableColumns, s as sql } from './templates.schema_DMbF8Dv3.mjs';

async function getArticles(db, options) {
  const drizzle = createDb(db);
  const conditions = [];
  conditions.push(isNull(articles.deletedAt));
  if (options?.isOnline === true) {
    conditions.push(eq(articles.isOnline, true));
  }
  if (options?.type) {
    conditions.push(eq(articles.type, options.type));
  }
  if (options?.categoryId) {
    conditions.push(eq(articles.categoryId, options.categoryId));
  }
  if (options?.authorId) {
    conditions.push(eq(articles.authorId, options.authorId));
  }
  if (options?.categorySlug && !options.categoryId) {
    conditions.push(eq(categories.slug, options.categorySlug));
  }
  if (options?.authorSlug && !options.authorId) {
    conditions.push(eq(authors.slug, options.authorSlug));
  }
  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(articles.headline, searchPattern),
        like(articles.shortDescription, searchPattern)
      )
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
  const sortColumn = options?.sortBy === "title" ? articles.headline : options?.sortBy === "viewCount" ? articles.viewCount : articles.publishedAt;
  const orderByClause = options?.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const items = await drizzle.select({
    ...getTableColumns(articles),
    categoryLabel: categories.label,
    categorySlug: categories.slug,
    categoryColor: categories.color,
    authorName: authors.name,
    authorSlug: authors.slug,
    authorImagesJson: authors.imagesJson
  }).from(articles).leftJoin(categories, eq(articles.categoryId, categories.id)).leftJoin(authors, eq(articles.authorId, authors.id)).where(whereClause).orderBy(orderByClause).limit(options?.limit || 100).offset(options?.offset || 0);
  const [{ count: total }] = await drizzle.select({ count: sql`count(*)` }).from(articles).leftJoin(categories, eq(articles.categoryId, categories.id)).leftJoin(authors, eq(articles.authorId, authors.id)).where(whereClause);
  return {
    items: hydrateArticles(items),
    total: Number(total)
  };
}
async function getArticleBySlug(db, slug, type) {
  const drizzle = createDb(db);
  const conditions = [eq(articles.slug, slug), isNull(articles.deletedAt)];
  if (type) {
    conditions.push(eq(articles.type, type));
  }
  const result = await drizzle.query.articles.findFirst({
    where: and(...conditions)
  });
  return result ? hydrateArticle(result) : null;
}
async function createArticle(db, article) {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(articles).values(article).returning();
  return inserted || null;
}
async function incrementViewCount(db, slug) {
  const drizzle = createDb(db);
  await drizzle.update(articles).set({ viewCount: sql`${articles.viewCount} + 1` }).where(eq(articles.slug, slug));
  return true;
}
async function getArticleById(db, id) {
  const drizzle = createDb(db);
  const result = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, id), isNull(articles.deletedAt))
  });
  return result ? hydrateArticle(result) : null;
}
async function updateArticleById(db, id, patch) {
  const drizzle = createDb(db);
  const processedPatch = { ...patch };
  const jsonFields = [
    "imagesJson",
    "contentJson",
    "recipeJson",
    "roundupJson",
    "faqsJson",
    "seoJson",
    "configJson",
    "jsonldJson",
    "relatedArticlesJson",
    "cachedTagsJson",
    "cachedCategoryJson",
    "cachedAuthorJson",
    "cachedEquipmentJson",
    "cachedRatingJson",
    "cachedTocJson",
    "cachedRecipeJson",
    "cachedCardJson"
  ];
  for (const field of jsonFields) {
    if (field in processedPatch && processedPatch[field] !== void 0) {
      const value = processedPatch[field];
      if (typeof value === "object" && value !== null) {
        processedPatch[field] = JSON.stringify(value);
      }
    }
  }
  const updateData = {
    ...processedPatch,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const result = await drizzle.update(articles).set(updateData).where(and(eq(articles.id, id), isNull(articles.deletedAt))).returning({ id: articles.id });
  return result.length > 0;
}
async function deleteArticleById(db, id) {
  const drizzle = createDb(db);
  const result = await drizzle.update(articles).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(and(eq(articles.id, id), isNull(articles.deletedAt))).returning({ id: articles.id });
  return result.length > 0;
}
async function toggleOnlineById(db, id) {
  const drizzle = createDb(db);
  const current = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, id), isNull(articles.deletedAt)),
    columns: { isOnline: true }
  });
  if (!current) return null;
  const newValue = !current.isOnline;
  await drizzle.update(articles).set({ isOnline: newValue, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(articles.id, id));
  return { isOnline: newValue };
}
async function toggleFavoriteById(db, id) {
  const drizzle = createDb(db);
  const current = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, id), isNull(articles.deletedAt)),
    columns: { isFavorite: true }
  });
  if (!current) return null;
  const newValue = !current.isFavorite;
  await drizzle.update(articles).set({ isFavorite: newValue, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(articles.id, id));
  return { isFavorite: newValue };
}
async function syncCachedFields(db, id) {
  const drizzle = createDb(db);
  const article = await drizzle.select({
    ...getTableColumns(articles),
    authorName: authors.name,
    authorSlug: authors.slug,
    authorAvatar: authors.imagesJson,
    categoryLabel: categories.label,
    categorySlug: categories.slug,
    categoryColor: categories.color
  }).from(articles).leftJoin(authors, eq(articles.authorId, authors.id)).leftJoin(categories, eq(articles.categoryId, categories.id)).where(eq(articles.id, id)).get();
  if (!article) return false;
  const updateData = {};
  if (article.authorId) {
    const hydrator = hydrateArticle(article);
    updateData.cachedAuthorJson = JSON.stringify({
      name: article.authorName,
      slug: article.authorSlug,
      avatar: hydrator.authorAvatar || null
    });
  }
  if (article.categoryId) {
    updateData.cachedCategoryJson = JSON.stringify({
      label: article.categoryLabel,
      slug: article.categorySlug,
      color: article.categoryColor
    });
  }
  await drizzle.update(articles).set(updateData).where(eq(articles.id, id));
  return true;
}

export { toggleFavoriteById as a, getArticleBySlug as b, getArticles as c, deleteArticleById as d, createArticle as e, getArticleById as g, incrementViewCount as i, syncCachedFields as s, toggleOnlineById as t, updateArticleById as u };
