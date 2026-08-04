import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticles, getArticleBySlug, createArticle, setArticleTagsById, syncCachedFields, checkPublishTransition } from '@modules/articles';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateBody, validateQuery, ArticleListQuery, CreateArticleSchema } from '@shared/validation';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { transformArticleRequestBody } from '@modules/articles/api/helpers';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  // Validate all query params (pagination + filters) via Zod
  const { page, limit, offset, slug, category, author, tag, type, workflow_status, search, dateFrom, dateTo } = validateQuery(url.searchParams, ArticleListQuery);

  try {
    const db = env.DB;
    if (!db) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    if (slug) {
      const article = await getArticleBySlug(db, slug, type || undefined, { workflow_status: 'published' });

      if (!article) {
        const { body, status: httpStatus, headers } = formatErrorResponse(
          new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
        );
        return new Response(body, { status: httpStatus, headers });
      }

      const { body, status: httpStatus, headers } = formatSuccessResponse(article, {
        cacheControl: 'public, max-age=3600'
      });
      return new Response(body, { status: httpStatus, headers });
    }

    const articles = await getArticles(db, {
      type: type || undefined,
      categorySlug: category || undefined,
      authorSlug: author || undefined,
      tagSlug: tag || undefined,
      workflow_status: workflow_status || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit,
      offset
    });

    const { body, status: httpStatus, headers } = formatSuccessResponse(articles.items, {
      pagination: {
        page,
        limit,
        total: articles.total,
        total_pages: Math.ceil(articles.total / limit)
      },
      cacheControl: 'public, max-age=3600'
    });
    return new Response(body, { status: httpStatus, headers });
  } catch (error) {
    console.error('Error fetching articles:', error);
    const { body, status: httpStatus, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(
          ErrorCodes.DATABASE_ERROR,
          'Failed to fetch articles',
          500,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        )
    );
    return new Response(body, { status: httpStatus, headers });
  }
};

export const POST: APIRoute = async ({ request }) => {
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

    // Completeness guard: a new article created directly as published must
    // satisfy the publish criteria (the create payload is the full article).
    if (transformedData.workflow_status === 'published') {
      const issues = checkPublishTransition({ targetStatus: 'published', patch: transformedData });
      if (issues.length > 0) {
        const { body, status: httpStatus, headers } = formatErrorResponse(
          new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot publish: ${issues.join(' ')}`, 422)
        );
        return new Response(body, { status: httpStatus, headers });
      }
    }

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

    const { body, status: httpStatus, headers } = formatSuccessResponse(article);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error('Error creating article:', error);
    const { body, status: httpStatus, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create article', 500)
    );
    return new Response(body, { status: httpStatus, headers });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const { body, status: httpStatus, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, 'Method not allowed - use /api/articles/:slug for updates', 405)
    );
    return new Response(body, { status: httpStatus, headers });
  } catch (error) {
    const { body, status: errorHttpStatus, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Internal Error', 500)
    );
    return new Response(body, { status: errorHttpStatus, headers });
  }
};
