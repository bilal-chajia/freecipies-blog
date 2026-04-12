import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addRecipeVote } from '@modules/articles';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

/**
 * POST /api/recipes/rate
 * Submit a rating for a recipe
 * 
 * Body:
 * - id: number (article ID)
 * - rating: number (1-5)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, rating } = body;

    if (!id || !rating || rating < 0.5 || rating > 5) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid recipe ID and rating (0.5-5) are required', 400);
    }


    const db = env.DB;
    if (!db) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const result = await addRecipeVote(db, id, rating);

    if (!result) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Recipe not found or could not be updated', 404);
    }

    const { body: responseBody, status, headers } = formatSuccessResponse({
      id,
      ...result
    });

    return new Response(responseBody, { status, headers });
  } catch (error) {
    console.error('Error submitting rating:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(
            ErrorCodes.DATABASE_ERROR,
            'Failed to submit rating',
            500,
            { originalError: error instanceof Error ? error.message : 'Unknown error' }
          )
    );
    return new Response(body, { status, headers });
  }
};
