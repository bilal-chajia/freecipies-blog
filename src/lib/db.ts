import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { Article, Category, Author, Tag, Media } from '../types';

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  R2_PUBLIC_URL: string;
  JWT_SECRET: string;
}

export interface PaginatedArticles {
  items: Article[];
  total: number;
}
/**
 * Fetches a paginated list of articles from the database.
 * Leverages the v_articles_full view for rich data.
 */
export async function getArticles(
  db: D1Database,
  options?: {
    categorySlug?: string;
    authorSlug?: string;
    tagSlug?: string;
    limit?: number;
    offset?: number;
    type?: 'recipe' | 'blog';
    publishedAfter?: Date;
    isOnline?: boolean; // true = online only, false = offline only, undefined = all
    search?: string;
  }
): Promise<PaginatedArticles> {
  const whereClauses: string[] = [];
  const params: any[] = [];

  // Handle isOnline filter
  // true = only online, false = only offline, undefined = all articles
  if (options?.isOnline === true) {
    whereClauses.push('r.is_online = 1');
  } else if (options?.isOnline === false) {
    whereClauses.push('r.is_online = 0');
  }
  // If undefined, no filter is applied (show all)

  if (options?.type) {
    whereClauses.push(`r.type = ?${params.length + 1}`);
    params.push(options.type);
  }

  if (options?.categorySlug) {
    whereClauses.push(`r.category_slug = ?${params.length + 1}`);
    params.push(options.categorySlug);
  }

  if (options?.authorSlug) {
    whereClauses.push(`r.author_slug = ?${params.length + 1}`);
    params.push(options.authorSlug);
  }

  if (options?.tagSlug) {
    // This requires a subquery or a join on the tags_json field
    whereClauses.push(`EXISTS (
      SELECT 1 FROM json_each(r.tags_json)
      WHERE json_extract(value, '$.slug') = ?${params.length + 1}
    )`);
    params.push(options.tagSlug);
  }

  if (options?.publishedAfter) {
    whereClauses.push(`r.published_at > ?${params.length + 1}`);
    params.push(options.publishedAfter.toISOString());
  }

  if (options?.search) {
    // Search in label, short_description, and author_name
    const searchParam = `%${options.search}%`;
    const p1 = params.length + 1;
    const p2 = params.length + 2;
    const p3 = params.length + 3;
    whereClauses.push(`(r.label LIKE ?${p1} OR r.short_description LIKE ?${p2} OR r.author_name LIKE ?${p3})`);
    params.push(searchParam, searchParam, searchParam);
  }

  const whereString = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';

  // Main query to get the paginated items
  let query = `SELECT * FROM v_articles_full r WHERE ${whereString} ORDER BY r.published_at DESC`;
  const queryParams = [...params];

  if (options?.limit) {
    query += ` LIMIT ?${queryParams.length + 1}`;
    queryParams.push(options.limit);
  }

  if (options?.offset) {
    query += ` OFFSET ?${queryParams.length + 1}`;
    queryParams.push(options.offset);
  }

  // Separate query to get the total count with the same filters
  const countQuery = `SELECT COUNT(*) as total FROM v_articles_full r WHERE ${whereString}`;

  // Run both queries in parallel for efficiency
  const [articlesPromise, countPromise] = await db.batch([
    db.prepare(query).bind(...queryParams),
    db.prepare(countQuery).bind(...params)
  ]);

  const results = articlesPromise.results ?? [];
  const totalItems = ((countPromise.results?.[0] as any)?.total as number) ?? 0;

  return {
    items: results.map(row => mapRowToArticle(row)),
    total: totalItems,
  };
}

/**
 * Fetches a single article by its slug using the v_articles_full view.
 */
export async function getArticleBySlug(
  db: D1Database,
  slug: string,
  type?: 'recipe' | 'blog'
): Promise<Article | null> {
  let query = `SELECT * FROM v_articles_full WHERE slug = ?1`;
  const params: any[] = [slug];

  if (type) {
    query += ` AND type = ?2`;
    params.push(type);
  }

  const { results } = await db
    .prepare(query)
    .bind(...params)
    .all();

  if (results.length === 0) return null;

  return mapRowToArticle(results[0]);
}

export async function createArticle(
  db: D1Database,
  article: Partial<Article> & { tags?: string[] } // tags as slugs
): Promise<Article | null> {
  const {
    slug, type, categorySlug, authorSlug, label, headline,
    metaTitle, metaDescription, canonicalUrl,
    shortDescription, tldr, introduction, summary,
    image, cover,
    contentJson, recipeJson, faqsJson, keywords, referencesJson, mediaJson,
    isOnline, isFavorite, publishedAt, tags
  } = article;

  if (!slug || !categorySlug || !authorSlug || !label || !headline) {
    throw new Error('Missing required fields');
  }

  const result = await db.prepare(`
    INSERT INTO articles (
      slug, type, category_slug, author_slug, label, headline,
      meta_title, meta_description, canonical_url,
      short_description, tldr, introduction, summary,
      image_url, image_alt, image_width, image_height,
      cover_url, cover_alt, cover_width, cover_height,
      content_json, recipe_json, faqs_json, keywords_json, references_json, media_json,
      is_online, is_favorite, published_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).bind(
    slug, type || 'article', categorySlug, authorSlug, label, headline,
    metaTitle || headline, metaDescription || shortDescription, canonicalUrl,
    shortDescription, tldr, introduction, summary,
    image?.url, image?.alt, image?.width, image?.height,
    cover?.url, cover?.alt, cover?.width, cover?.height,
    contentJson ? JSON.stringify(contentJson) : null,
    recipeJson ? JSON.stringify(recipeJson) : null,
    faqsJson ? JSON.stringify(faqsJson) : null,
    keywords ? JSON.stringify(keywords) : null,
    referencesJson ? JSON.stringify(referencesJson) : null,
    mediaJson ? JSON.stringify(mediaJson) : null,
    isOnline ? 1 : 0, isFavorite ? 1 : 0, publishedAt || new Date().toISOString()
  ).run();

  if (!result.success) {
    throw new Error('Failed to create article');
  }

  // Handle tags
  if (tags && tags.length > 0) {
    const articleId = result.meta.last_row_id;

    // Get tag IDs
    const placeholders = tags.map(() => '?').join(',');
    const tagResults = await db.prepare(`SELECT id FROM tags WHERE slug IN (${placeholders})`)
      .bind(...tags)
      .all();

    if (tagResults.results.length > 0) {
      const stmt = db.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)');
      const batch = tagResults.results.map((tag: any) => stmt.bind(articleId, tag.id));
      await db.batch(batch);
    }
  }

  return getArticleBySlug(db, slug);
}

export async function updateArticle(
  db: D1Database,
  slug: string,
  article: Partial<Article> & { tags?: string[] }
): Promise<Article | null> {
  const existing = await getArticleBySlug(db, slug);
  if (!existing) return null;

  const updates: string[] = [];
  const params: any[] = [];

  const fields: Record<string, any> = {
    type: article.type,
    category_slug: article.categorySlug,
    author_slug: article.authorSlug,
    label: article.label,
    headline: article.headline,
    meta_title: article.metaTitle,
    meta_description: article.metaDescription,
    canonical_url: article.canonicalUrl,
    short_description: article.shortDescription,
    tldr: article.tldr,
    introduction: article.introduction,
    summary: article.summary,
    image_url: article.image?.url,
    image_alt: article.image?.alt,
    image_width: article.image?.width,
    image_height: article.image?.height,
    cover_url: article.cover?.url,
    cover_alt: article.cover?.alt,
    cover_width: article.cover?.width,
    cover_height: article.cover?.height,
    content_json: article.contentJson ? JSON.stringify(article.contentJson) : undefined,
    recipe_json: article.recipeJson ? JSON.stringify(article.recipeJson) : undefined,
    faqs_json: article.faqsJson ? JSON.stringify(article.faqsJson) : undefined,
    keywords_json: article.keywords ? JSON.stringify(article.keywords) : undefined,
    references_json: article.referencesJson ? JSON.stringify(article.referencesJson) : undefined,
    media_json: article.mediaJson ? JSON.stringify(article.mediaJson) : undefined,
    is_online: article.isOnline !== undefined ? (article.isOnline ? 1 : 0) : undefined,
    is_favorite: article.isFavorite !== undefined ? (article.isFavorite ? 1 : 0) : undefined,
    published_at: article.publishedAt
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (updates.length > 0) {
    params.push(slug); // for WHERE clause
    await db.prepare(`UPDATE articles SET ${updates.join(', ')} WHERE slug = ?`).bind(...params).run();
  }

  // Update tags if provided
  if (article.tags) {
    // Get article ID (we need it for junction table)
    // We can get it from existing article if we had it, but existing is the object, not raw row.
    // But we can query it.
    const { results } = await db.prepare('SELECT id FROM articles WHERE slug = ?').bind(slug).all();
    const articleId = results[0].id;

    // Delete existing tags
    await db.prepare('DELETE FROM article_tags WHERE article_id = ?').bind(articleId).run();

    if (article.tags.length > 0) {
      // Get tag IDs
      const placeholders = article.tags.map(() => '?').join(',');
      const tagResults = await db.prepare(`SELECT id FROM tags WHERE slug IN (${placeholders})`)
        .bind(...article.tags)
        .all();

      if (tagResults.results.length > 0) {
        const stmt = db.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)');
        const batch = tagResults.results.map((tag: any) => stmt.bind(articleId, tag.id));
        await db.batch(batch);
      }
    }
  }

  return getArticleBySlug(db, slug);
}

export async function deleteArticle(
  db: D1Database,
  slug: string
): Promise<boolean> {
  const result = await db.prepare('DELETE FROM articles WHERE slug = ?').bind(slug).run();
  return result.success;
}

export async function incrementViewCount(
  db: D1Database,
  slug: string
): Promise<boolean> {
  const result = await db.prepare(
    'UPDATE articles SET view_count = COALESCE(view_count, 0) + 1 WHERE slug = ?'
  ).bind(slug).run();
  return result.success;
}

// Tag Database Operations (Simplified)
export async function createTag(
  db: D1Database,
  tag: Partial<Tag>
): Promise<Tag | null> {
  const { slug, label, color, isOnline } = tag;

  if (!slug || !label) throw new Error('Missing required fields');

  await db.prepare(`
    INSERT INTO tags (slug, label, color, is_online)
    VALUES (?, ?, ?, ?)
  `).bind(
    slug, label, color || '#ff6600', isOnline ? 1 : 1
  ).run();

  const { results } = await db.prepare('SELECT * FROM tags WHERE slug = ?').bind(slug).all();
  if (results.length === 0) return null;
  return mapRowToTag(results[0]);
}

export async function updateTag(
  db: D1Database,
  slug: string,
  tag: Partial<Tag>
): Promise<Tag | null> {
  const updates: string[] = [];
  const params: any[] = [];

  const fields: Record<string, any> = {
    label: tag.label,
    color: tag.color,
    is_online: tag.isOnline !== undefined ? (tag.isOnline ? 1 : 0) : undefined
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (updates.length > 0) {
    params.push(slug);
    await db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE slug = ?`).bind(...params).run();
  }

  const { results } = await db.prepare('SELECT * FROM tags WHERE slug = ?').bind(slug).all();
  if (results.length === 0) return null;
  return mapRowToTag(results[0]);
}

export async function deleteTag(
  db: D1Database,
  slug: string
): Promise<boolean> {
  const result = await db.prepare('DELETE FROM tags WHERE slug = ?').bind(slug).run();
  return result.success;
}

export async function getTags(
  db: D1Database,
  options?: { isOnline?: boolean }
): Promise<Tag[]> {
  let query = 'SELECT * FROM tags';
  const params: any[] = [];

  if (options?.isOnline !== undefined) {
    query += ' WHERE is_online = ?';
    params.push(options.isOnline ? 1 : 0);
  }

  query += ' ORDER BY label ASC';

  const { results } = await db.prepare(query).bind(...params).all();

  return results.map(row => mapRowToTag(row));
}

export async function getDashboardStats(db: D1Database) {
  const [articles, categories, authors, tags] = await db.batch([
    db.prepare('SELECT COUNT(*) as count FROM articles'),
    db.prepare('SELECT COUNT(*) as count FROM categories'),
    db.prepare('SELECT COUNT(*) as count FROM authors'),
    db.prepare('SELECT COUNT(*) as count FROM tags')
  ]);

  return {
    articles: (articles.results?.[0] as any)?.count || 0,
    categories: (categories.results?.[0] as any)?.count || 0,
    authors: (authors.results?.[0] as any)?.count || 0,
    tags: (tags.results?.[0] as any)?.count || 0
  };
}



// Category Database Operations
export async function createCategory(
  db: D1Database,
  category: Partial<Category>
): Promise<Category | null> {
  const {
    slug, label, headline, metaTitle, metaDescription,
    shortDescription, tldr, image, collectionTitle,
    numEntriesPerPage, isOnline, isFavorite, sortOrder, color
  } = category;

  if (!slug || !label) throw new Error('Missing required fields');

  await db.prepare(`
    INSERT INTO categories (
      slug, label, headline, meta_title, meta_description,
      short_description, tldr, image_url, image_alt, image_width, image_height,
      collection_title, num_entries_per_page, is_online, is_favorite, sort_order, color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    slug, label, headline || label, metaTitle || label, metaDescription || '',
    shortDescription || '', tldr || '',
    image?.url, image?.alt, image?.width, image?.height,
    collectionTitle || label, numEntriesPerPage || 12,
    isOnline ? 1 : 0, isFavorite ? 1 : 0, sortOrder || 0, color || '#ff6600'
  ).run();

  return getCategoryBySlug(db, slug);
}

export async function updateCategory(
  db: D1Database,
  slug: string,
  category: Partial<Category>
): Promise<Category | null> {
  const updates: string[] = [];
  const params: any[] = [];

  const fields: Record<string, any> = {
    label: category.label,
    headline: category.headline,
    meta_title: category.metaTitle,
    meta_description: category.metaDescription,
    short_description: category.shortDescription,
    tldr: category.tldr,
    // Handle image fields: if image is explicitly null, set all to null
    // If image is undefined, don't update. If image exists, use its values.
    image_url: category.image === null ? null : category.image?.url,
    image_alt: category.image === null ? null : category.image?.alt,
    image_width: category.image === null ? null : category.image?.width,
    image_height: category.image === null ? null : category.image?.height,
    collection_title: category.collectionTitle,
    num_entries_per_page: category.numEntriesPerPage,
    is_online: category.isOnline !== undefined ? (category.isOnline ? 1 : 0) : undefined,
    is_favorite: category.isFavorite !== undefined ? (category.isFavorite ? 1 : 0) : undefined,
    sort_order: category.sortOrder,
    color: category.color
  };

  for (const [key, value] of Object.entries(fields)) {
    // Include null values (to clear fields) but skip undefined (to not update)
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (updates.length > 0) {
    params.push(slug);
    await db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE slug = ?`).bind(...params).run();
  }

  return getCategoryBySlug(db, slug);
}

export async function deleteCategory(
  db: D1Database,
  slug: string
): Promise<boolean> {
  const result = await db.prepare('DELETE FROM categories WHERE slug = ?').bind(slug).run();
  return result.success;
}

export async function getCategories(
  db: D1Database,
  options?: { isOnline?: boolean }
): Promise<Category[]> {
  let query = 'SELECT * FROM categories';
  const params: any[] = [];

  if (options?.isOnline !== undefined) {
    query += ' WHERE is_online = ?';
    params.push(options.isOnline ? 1 : 0);
  }

  query += ' ORDER BY sort_order ASC, label ASC';

  const { results } = await db.prepare(query).bind(...params).all();

  return results.map(row => mapRowToCategory(row));
}

export async function getCategoryBySlug(
  db: D1Database,
  slug: string
): Promise<Category | null> {
  const { results } = await db
    .prepare('SELECT * FROM categories WHERE slug = ?')
    .bind(slug)
    .all();

  if (results.length === 0) return null;

  return mapRowToCategory(results[0]);
}

// Author Database Operations
export async function createAuthor(
  db: D1Database,
  author: Partial<Author>
): Promise<Author | null> {
  const {
    slug, name, email, job, metaTitle, metaDescription,
    shortDescription, tldr, image, bio, isOnline, isFavorite
  } = author;

  if (!slug || !name || !email) throw new Error('Missing required fields');

  await db.prepare(`
    INSERT INTO authors (
      slug, name, email, job, meta_title, meta_description,
      short_description, tldr, image_url, image_alt, image_width, image_height,
      bio_json, is_online, is_favorite
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    slug, name, email, job, metaTitle || name, metaDescription || '',
    shortDescription || '', tldr || '',
    image?.url, image?.alt, image?.width, image?.height,
    bio ? JSON.stringify(bio) : null,
    isOnline ? 1 : 0, isFavorite ? 1 : 0
  ).run();

  return getAuthorBySlug(db, slug);
}

export async function updateAuthor(
  db: D1Database,
  slug: string,
  author: Partial<Author>
): Promise<Author | null> {
  const updates: string[] = [];
  const params: any[] = [];

  const fields: Record<string, any> = {
    name: author.name,
    email: author.email,
    job: author.job,
    meta_title: author.metaTitle,
    meta_description: author.metaDescription,
    short_description: author.shortDescription,
    tldr: author.tldr,
    image_url: author.image?.url,
    image_alt: author.image?.alt,
    image_width: author.image?.width,
    image_height: author.image?.height,
    bio_json: author.bio ? JSON.stringify(author.bio) : undefined,
    is_online: author.isOnline !== undefined ? (author.isOnline ? 1 : 0) : undefined,
    is_favorite: author.isFavorite !== undefined ? (author.isFavorite ? 1 : 0) : undefined
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (updates.length > 0) {
    params.push(slug);
    await db.prepare(`UPDATE authors SET ${updates.join(', ')} WHERE slug = ?`).bind(...params).run();
  }

  return getAuthorBySlug(db, slug);
}

export async function deleteAuthor(
  db: D1Database,
  slug: string
): Promise<boolean> {
  const result = await db.prepare('DELETE FROM authors WHERE slug = ?').bind(slug).run();
  return result.success;
}

export async function getAuthors(
  db: D1Database,
  options?: { isOnline?: boolean }
): Promise<Author[]> {
  let query = 'SELECT * FROM authors';
  const params: any[] = [];

  if (options?.isOnline !== undefined) {
    query += ' WHERE is_online = ?';
    params.push(options.isOnline ? 1 : 0);
  }

  query += ' ORDER BY name ASC';

  const { results } = await db.prepare(query).bind(...params).all();

  return results.map(row => mapRowToAuthor(row));
}

export async function getAuthorBySlug(
  db: D1Database,
  slug: string
): Promise<Author | null> {
  const { results } = await db
    .prepare('SELECT * FROM authors WHERE slug = ?')
    .bind(slug)
    .all();

  if (results.length === 0) return null;

  return mapRowToAuthor(results[0]);
}

// Media Database Operations
export async function getMedia(
  db: D1Database,
  options?: {
    type?: string; // 'image', 'video', etc. or specific mime type
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<Media[]> {
  let query = 'SELECT * FROM media';
  const params: any[] = [];
  const clauses: string[] = [];

  if (options?.type) {
    if (options.type === 'image') {
      clauses.push("mime_type LIKE 'image/%'");
    } else if (options.type === 'video') {
      clauses.push("mime_type LIKE 'video/%'");
    } else if (options.type === 'audio') {
      clauses.push("mime_type LIKE 'audio/%'");
    } else if (options.type === 'document') {
      clauses.push("(mime_type = 'application/pdf' OR mime_type LIKE 'application/msword%' OR mime_type LIKE 'application/vnd%')");
    } else if (options.type !== 'all') {
      clauses.push("mime_type = ?");
      params.push(options.type);
    }
  }

  if (options?.search) {
    clauses.push("(filename LIKE ? OR alt_text LIKE ?)");
    params.push(`%${options.search}%`);
    params.push(`%${options.search}%`);
  }

  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(' AND ')}`;
  }

  // Sorting
  const allowedSortCols = ['filename', 'size_bytes', 'uploaded_at'];
  let orderBy = 'uploaded_at';

  if (options?.sortBy) {
    if (options.sortBy === 'created_at' || options.sortBy === 'uploaded_at') {
      orderBy = 'uploaded_at';
    } else if (options.sortBy === 'size' || options.sortBy === 'size_bytes') {
      orderBy = 'size_bytes';
    } else if (options.sortBy === 'name' || options.sortBy === 'filename') {
      orderBy = 'filename';
    }
  }

  const order = options?.order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${orderBy} ${order}`;

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const { results } = await db.prepare(query).bind(...params).all();

  return results.map(row => mapRowToMedia(row));
}

export async function getMediaById(
  db: D1Database,
  id: number
): Promise<Media | null> {
  const { results } = await db.prepare('SELECT * FROM media WHERE id = ?').bind(id).all();
  if (results.length === 0) return null;
  return mapRowToMedia(results[0]);
}

export async function deleteMedia(
  db: D1Database,
  id: number
): Promise<boolean> {
  const result = await db.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
  return result.success;
}

export async function updateMedia(
  db: D1Database,
  id: number,
  updates: {
    r2Key?: string;
    url?: string;
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
  }
): Promise<boolean> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.r2Key !== undefined) {
    setClauses.push('r2_key = ?');
    params.push(updates.r2Key);
  }
  if (updates.url !== undefined) {
    setClauses.push('url = ?');
    params.push(updates.url);
  }
  if (updates.filename !== undefined) {
    setClauses.push('filename = ?');
    params.push(updates.filename);
  }
  if (updates.mimeType !== undefined) {
    setClauses.push('mime_type = ?');
    params.push(updates.mimeType);
  }
  if (updates.sizeBytes !== undefined) {
    setClauses.push('size_bytes = ?');
    params.push(updates.sizeBytes);
  }

  if (setClauses.length === 0) return true;

  params.push(id);
  const result = await db.prepare(
    `UPDATE media SET ${setClauses.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return result.success;
}

// Helper functions to map database rows to TypeScript types
function mapRowToArticle(row: any): Article {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    categorySlug: row.category_slug,
    authorSlug: row.author_slug,
    label: row.label,
    headline: row.headline,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    shortDescription: row.short_description,
    tldr: row.tldr,
    introduction: row.introduction,
    summary: row.summary,
    image: row.image_url ? {
      url: row.image_url,
      alt: row.image_alt,
      width: row.image_width,
      height: row.image_height,
    } : undefined,
    cover: row.cover_url ? {
      url: row.cover_url,
      alt: row.cover_alt,
      width: row.cover_width,
      height: row.cover_height,
    } : undefined,
    contentJson: row.content_json ? JSON.parse(row.content_json) : undefined,
    recipeJson: row.recipe_json ? (JSON.parse(row.recipe_json) as import('../types').RecipeDetails) : undefined,
    faqsJson: row.faqs_json ? (JSON.parse(row.faqs_json) as import('../types').FaqItem[]) : undefined,
    keywords: row.keywords_json ? (JSON.parse(row.keywords_json) as string[]) : undefined,
    referencesJson: row.references_json ? JSON.parse(row.references_json) : undefined,
    mediaJson: row.media_json ? JSON.parse(row.media_json) : undefined,
    isOnline: Boolean(row.is_online),
    viewCount: row.view_count || 0,
    isFavorite: Boolean(row.is_favorite),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryLabel: row.category_label,
    authorName: row.author_name,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as import('../types').Tag[]) : [],
    route: `/${row.type === 'recipe' ? 'recipes' : 'blog'}/${row.slug}`
  };
}

function mapRowToCategory(row: any): Category {
  return {
    id: row.id,
    isOnline: Boolean(row.is_online),
    isFavorite: Boolean(row.is_favorite),
    slug: row.slug,
    label: row.label,
    headline: row.headline,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    shortDescription: row.short_description,
    tldr: row.tldr,
    image: row.image_url ? {
      url: row.image_url,
      alt: row.image_alt,
      width: row.image_width,
      height: row.image_height,
    } : undefined,
    collectionTitle: row.collection_title,
    numEntriesPerPage: row.num_entries_per_page,
    createdAt: row.created_at,
    sortOrder: row.sort_order,
    color: row.color || '#ff6600',
    updatedAt: row.updated_at,
    route: `/categories/${row.slug}`
  };
}

function mapRowToAuthor(row: any): Author {
  return {
    id: row.id,
    isOnline: Boolean(row.is_online),
    isFavorite: Boolean(row.is_favorite),
    slug: row.slug,
    name: row.name,
    email: row.email,
    job: row.job,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    shortDescription: row.short_description,
    tldr: row.tldr,
    image: row.image_url ? {
      url: row.image_url,
      alt: row.image_alt,
      width: row.image_width,
      height: row.image_height,
    } : undefined,
    bio: row.bio_json ? (JSON.parse(row.bio_json) as import('../types').AuthorBio) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    route: `/authors/${row.slug}`
  };
}

function mapRowToTag(row: any): Tag {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    color: row.color || '#ff6600',
    isOnline: Boolean(row.is_online),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    route: `/tags/${row.slug}`
  };
}

function mapRowToMedia(row: any): Media {
  return {
    id: row.id,
    filename: row.filename,
    r2Key: row.r2_key,
    url: row.url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    altText: row.alt_text,
    attribution: row.attribution,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at
  };
}
