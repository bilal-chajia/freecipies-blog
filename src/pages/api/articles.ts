import type { APIRoute } from 'astro';
import { getArticles, getArticleBySlug, createArticle } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, validatePaginationParams, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const category = url.searchParams.get('category');
  const author = url.searchParams.get('author');
  const tag = url.searchParams.get('tag');
  const type = url.searchParams.get('type') as 'recipe' | 'article' | 'roundup' | null;
  const statusFilter = url.searchParams.get('status'); // 'online', 'offline', or 'all'
  const search = url.searchParams.get('search');

  // Validate pagination parameters
  const paginationValidation = validatePaginationParams(
    url.searchParams.get('limit'),
    url.searchParams.get('page')
  );

  const { limit, page, offset } = paginationValidation;

  try {
    const env = (locals as any).runtime?.env as Env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }
    const db = env.DB;

    if (slug) {
      const article = await getArticleBySlug(db, slug, type || undefined);

      if (!article) {
        const { body, status, headers } = formatErrorResponse(
          new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
        );
        return new Response(body, { status, headers });
      }

      const { body, status, headers } = formatSuccessResponse(article, {
        cacheControl: 'public, max-age=3600'
      });
      return new Response(body, { status, headers });
    }

    // Determine isOnline filter based on status param
    // 'online' = only online (isOnline: true)
    // 'offline' = only offline (isOnline: false)
    // 'all' or undefined = show all articles (isOnline: undefined)
    let isOnlineFilter: boolean | undefined;
    if (statusFilter === 'online') {
      isOnlineFilter = true;
    } else if (statusFilter === 'offline') {
      isOnlineFilter = false;
    } else {
      // 'all' or not specified - show all articles
      isOnlineFilter = undefined;
    }

    const articles = await getArticles(db, {
      type: type || undefined,
      categorySlug: category || undefined,
      authorSlug: author || undefined,
      tagSlug: tag || undefined,
      isOnline: isOnlineFilter,
      search: search || undefined,
      limit,
      offset
    });

    const { body, status, headers } = formatSuccessResponse(articles.items, {
      pagination: {
        page,
        limit,
        total: articles.total,
        totalPages: Math.ceil(articles.total / limit)
      },
      cacheControl: 'public, max-age=3600'
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching articles:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(
          ErrorCodes.DATABASE_ERROR,
          'Failed to fetch articles',
          500,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        )
    );
    return new Response(body, { status, headers });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const reqBody = await request.json();
    const article = await createArticle(env.DB, reqBody);

    const { body, status, headers } = formatSuccessResponse(article);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error('Error creating article:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create article', 500)
    );
    return new Response(body, { status, headers });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const url = new URL(request.url);
    // Extract slug from URL path if possible, but Astro API routes usually use params or query
    // Here we expect slug in the URL like /api/articles?slug=xyz OR we can use dynamic route [slug].ts
    // But this file is articles.ts, so it handles /api/articles
    // The client likely sends PUT /api/articles/slug-here if we used [slug].ts
    // But if we use query param for GET, maybe we use query param for PUT too?
    // Or the client sends slug in body?
    // The admin panel client (api.js) does: api.put(`/articles/${slug}`, data)
    // So it expects /api/articles/:slug
    // But this file is `articles.ts`. It handles `/api/articles`.
    // To handle `/api/articles/:slug`, we need `src/pages/api/articles/[slug].ts`.

    // Wait, if I put PUT in `articles.ts`, it only handles `/api/articles`.
    // I should check if I need to create `[slug].ts`.
    // The `api.js` uses `/articles/${slug}`.
    // So I definitely need `src/pages/api/articles/[slug].ts`.

    // However, for now I will implement POST here.
    // I will create `[slug].ts` separately for PUT/DELETE.

    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, 'Method not allowed - use /api/articles/:slug for updates', 405)
    );
    return new Response(body, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Internal Error', 500)
    );
    return new Response(body, { status, headers });
  }
};
