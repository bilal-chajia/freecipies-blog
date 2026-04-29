import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addRecipeVote } from '@modules/articles';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateBody, z } from '@shared/validation';

export const prerender = false;

/** POST /api/recipes/rate body schema */
const RateRecipeSchema = z.object({
  id: z.number().int().positive('Valid recipe ID is required'),
  rating: z.number().min(0.5, 'Rating must be at least 0.5').max(5, 'Rating must be at most 5'),
});

/**
 * POST /api/recipes/rate
 * Submit a rating for a recipe
 * 
 * Body:
 * - id: number (article ID)
 * - rating: number (0.5-5)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, rating } = await validateBody(request, RateRecipeSchema);


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
