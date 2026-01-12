globalThis.process ??= {}; globalThis.process.env ??= {};
import { a as articles, c as categories, b as authors } from './pinterest.schema_DDOHgYvi.mjs';
import { c as createDb, i as isNull, e as eq, o as or, l as like, a as and, d as desc } from './drizzle_DoAA6T5m.mjs';
import { g as getTableColumns, a as sql } from './templates.schema_DniFYo8s.mjs';

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
  const items = await drizzle.select({
    ...getTableColumns(articles),
    categoryLabel: categories.label,
    categorySlug: categories.slug,
    categoryColor: categories.color,
    authorName: authors.name,
    authorSlug: authors.slug
  }).from(articles).leftJoin(categories, eq(articles.categoryId, categories.id)).leftJoin(authors, eq(articles.authorId, authors.id)).where(whereClause).orderBy(desc(articles.publishedAt)).limit(options?.limit || 100).offset(options?.offset || 0);
  const [{ count: total }] = await drizzle.select({ count: sql`count(*)` }).from(articles).leftJoin(categories, eq(articles.categoryId, categories.id)).leftJoin(authors, eq(articles.authorId, authors.id)).where(whereClause);
  return {
    items,
    // Cast to Article compatibility (HydratedArticle expects these optional fields)
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
  return result || null;
}
async function createArticle(db, article) {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(articles).values(article).returning();
  return inserted || null;
}
async function updateArticle(db, slug, article) {
  const drizzle = createDb(db);
  const updateData = {
    ...article,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await drizzle.update(articles).set(updateData).where(eq(articles.slug, slug));
  return true;
}
async function deleteArticle(db, slug) {
  const drizzle = createDb(db);
  await drizzle.update(articles).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(articles.slug, slug));
  return true;
}
async function incrementViewCount(db, slug) {
  const drizzle = createDb(db);
  await drizzle.update(articles).set({ viewCount: sql`${articles.viewCount} + 1` }).where(eq(articles.slug, slug));
  return true;
}

export { getArticles as a, createArticle as c, deleteArticle as d, getArticleBySlug as g, incrementViewCount as i, updateArticle as u };
