import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticles, getArticleBySlug, createArticle, setArticleTagsById, syncCachedFields } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateBody, validateQuery, ArticleListQuery, CreateArticleSchema } from '@shared/validation';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { transformArticleRequestBody } from '../../modules/articles/api/helpers';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);

  // Validate all query params (pagination + filters) via Zod
  const { page, limit, offset, slug, category, author, tag, type, status, search, dateFrom, dateTo } = validateQuery(url.searchParams, ArticleListQuery);

  try {
    const db = env.DB;
    if (!db) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

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
    let isOnlineFilter: boolean | undefined;
    if (status === 'online') {
      isOnlineFilter = true;
    } else if (status === 'offline') {
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
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
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
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const reqBody = await validateBody(request, CreateArticleSchema);
    const { selectedTags, ...rest } = reqBody ?? {};

    // Normalization
    const transformedData = transformArticleRequestBody(rest);

    const article = await createArticle(env.DB, transformedData);

    if (article?.id) {
      if (selectedTags !== undefined) {
        const tagIds = Array.isArray(selectedTags)
          ? selectedTags
            .map((value: unknown) => Number(value))
            .filter((value: number) => Number.isFinite(value) && value > 0)
          : [];
        await setArticleTagsById(env.DB, article.id, tagIds);
      }

      // Sync cached fields immediately after creation
      await syncCachedFields(env.DB, article.id, env.SITE_URL);
    }

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
