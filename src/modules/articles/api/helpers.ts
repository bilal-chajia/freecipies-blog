/**
 * Articles Module - API Helpers
 * =============================
 * Normalization and transformation logic for article request data.
 */

import { safeParseJson } from '../../../shared/utils/hydration';

/**
 * Transform article request body into a standardized database format
 * Handles legacy flat image fields and ensures JSON fields are objects where expected.
 */
export function transformArticleRequestBody(body: any): any {
    const transformed = { ...body };

    // JSON fields that should be objects
    const jsonFields = [
        'imagesJson', 'contentJson', 'recipeJson', 'roundupJson',
        'faqsJson', 'seoJson', 'configJson', 'jsonldJson',
        'cachedTagsJson', 'cachedCategoryJson',
        'cachedAuthorJson', 'cachedEquipmentJson', 'cachedRecipeJson',
        'cachedCardJson'
    ];

    // Ensure they are properly parsed if they come as strings (though the client should send objects)
    for (const field of jsonFields) {
        if (body[field] !== undefined) {
            transformed[field] = safeParseJson(body[field]);
        }
    }

    // Handle legacy flat image fields if imagesJson is not provided
    if (!body.imagesJson) {
        const images: any = {};

        if (body.imageUrl) {
            images.thumbnail = {
                url: body.imageUrl,
                alt: body.imageAlt || '',
                width: body.imageWidth,
                height: body.imageHeight
            };
        }

        if (body.coverUrl) {
            images.cover = {
                url: body.coverUrl,
                alt: body.coverAlt || '',
                width: body.coverWidth,
                height: body.coverHeight
            };
        }

        if (Object.keys(images).length > 0) {
            transformed.imagesJson = images;
        }
    }

    // Remove legacy flat fields to keep the database patch clean
    delete transformed.imageUrl;
    delete transformed.imageAlt;
    delete transformed.imageWidth;
    delete transformed.imageHeight;
    delete transformed.coverUrl;
    delete transformed.coverAlt;
    delete transformed.coverWidth;
    delete transformed.coverHeight;

    return transformed;
}
