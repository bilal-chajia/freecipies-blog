import type { APIRoute } from 'astro';
import { getArticleBySlug } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import type { RecipeJson } from '@modules/articles/types';
import { toSchemaOrgNutrition, minutesToIsoDuration } from '@modules/articles/types/recipes.types';

export const prerender = false;

/**
 * Generate Schema.org Recipe JSON-LD
 */
function generateRecipeJsonLd(article: any, baseUrl: string): object {
    const recipeData: RecipeJson = typeof article.recipeJson === 'string'
        ? JSON.parse(article.recipeJson || '{}')
        : article.recipeJson || {};

    const imagesData = typeof article.imagesJson === 'string'
        ? JSON.parse(article.imagesJson || '{}')
        : article.imagesJson || {};

    // Build image array from variants
    const images: string[] = [];
    if (imagesData.cover?.variants) {
        const v = imagesData.cover.variants;
        if (v.lg?.url) images.push(v.lg.url);
        if (v.md?.url) images.push(v.md.url);
        if (v.sm?.url) images.push(v.sm.url);
    }

    // Build ingredients list for JSON-LD (flattened)
    const recipeIngredient: string[] = [];
    for (const group of recipeData.ingredients || []) {
        for (const item of group.items || []) {
            const parts = [];
            if (item.amount) parts.push(item.amount.toString());
            if (item.unit) parts.push(item.unit);
            parts.push(item.name);
            if (item.notes) parts.push(`(${item.notes})`);
            recipeIngredient.push(parts.join(' '));
        }
    }

    // Build instructions for JSON-LD
    const recipeInstructions: object[] = [];
    for (const section of recipeData.instructions || []) {
        // Add section as HowToSection if title exists
        if (section.section_title) {
            recipeInstructions.push({
                '@type': 'HowToSection',
                name: section.section_title,
                itemListElement: (section.steps || []).map((step, idx) => ({
                    '@type': 'HowToStep',
                    position: idx + 1,
                    name: step.name || undefined,
                    text: step.text,
                    image: step.image || undefined,
                })),
            });
        } else {
            // Flat steps
            for (const step of section.steps || []) {
                recipeInstructions.push({
                    '@type': 'HowToStep',
                    name: step.name || undefined,
                    text: step.text,
                    image: step.image || undefined,
                });
            }
        }
    }

    // Build nutrition if present
    let nutrition: object | undefined;
    if (recipeData.nutrition && Object.keys(recipeData.nutrition).length > 0) {
        nutrition = toSchemaOrgNutrition(recipeData.nutrition);
    }

    // Build aggregate rating if present
    let aggregateRating: object | undefined;
    if (recipeData.aggregateRating?.ratingValue) {
        aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: recipeData.aggregateRating.ratingValue,
            ratingCount: recipeData.aggregateRating.ratingCount || 0,
        };
    }

    // Build video if present
    let video: object | undefined;
    if (recipeData.video?.url) {
        video = {
            '@type': 'VideoObject',
            name: recipeData.video.name,
            description: recipeData.video.description,
            thumbnailUrl: recipeData.video.thumbnailUrl,
            contentUrl: recipeData.video.url,
            duration: recipeData.video.duration,
        };
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: article.headline,
        description: article.shortDescription,
        image: images,
        author: {
            '@type': 'Person',
            name: article.authorName || article.cachedAuthorJson?.name,
        },
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        prepTime: recipeData.prepTime || (recipeData.prep ? minutesToIsoDuration(recipeData.prep) : undefined),
        cookTime: recipeData.cookTime || (recipeData.cook ? minutesToIsoDuration(recipeData.cook) : undefined),
        totalTime: recipeData.totalTime || (recipeData.total ? minutesToIsoDuration(recipeData.total) : undefined),
        recipeYield: recipeData.recipeYield || (recipeData.servings ? `${recipeData.servings} servings` : undefined),
        recipeCategory: recipeData.recipeCategory,
        recipeCuisine: recipeData.recipeCuisine,
        keywords: recipeData.keywords?.join(', '),
        recipeIngredient,
        recipeInstructions,
        nutrition,
        aggregateRating,
        video,
        suitableForDiet: recipeData.suitableForDiet?.map(d => `https://schema.org/${d}`),
    };
}

/**
 * GET /api/recipes/:slug
 * Public endpoint to get recipe by slug with JSON-LD
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
    const { slug } = params;

    if (!slug) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = (locals as any).runtime?.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        // Get recipe specifically
        const article = await getArticleBySlug(db, slug, 'recipe');

        if (!article) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Recipe not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // Generate JSON-LD
        const baseUrl = `${url.protocol}//${url.host}`;
        const jsonLd = generateRecipeJsonLd(article, baseUrl);

        // Include JSON-LD in response
        const responseData = {
            ...article,
            jsonLd,
        };

        const { body, status, headers } = formatSuccessResponse(responseData, {
            cacheControl: 'public, max-age=3600',
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching recipe:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch recipe',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};
