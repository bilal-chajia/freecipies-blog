/**
 * Articles Module - API Helpers
 * =============================
 * Normalization and transformation logic for article request data.
 */

import { safeParseJson } from '../../../shared/utils/hydration';
import { normalizeContentDocument } from '../../content-blocks';

const extractR2KeyFromUrl = (url: string): string | null => {
    if (!url) return null;
    const proxyMatch = url.match(/^\/api\/images\/(.+)$/);
    if (proxyMatch) return proxyMatch[1];
    const r2Match = url.match(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/i);
    if (r2Match) return r2Match[1];
    const localMatch = url.match(/^https?:\/\/[^\/]+\/api\/images\/(.+)$/);
    if (localMatch) return localMatch[1];
    return null;
};

/**
 * Transform article request body into a standardized database format
 * Handles legacy flat image fields and ensures JSON fields are objects where expected.
 */
export function transformArticleRequestBody(body: any): any {
    const transformed = { ...body };

    // JSON fields that should be objects
    const jsonFields = [
        'imagesJson', 'recipeJson', 'roundupJson',
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

    if (body.contentJson !== undefined) {
        transformed.contentJson = normalizeContentDocument(body.contentJson);
    }

    // Handle legacy flat image fields if imagesJson is not provided
    if (!body.imagesJson) {
        const images: any = {};

        if (body.imageUrl) {
            const r2Key = extractR2KeyFromUrl(body.imageUrl);
            images.thumbnail = {
                ...(r2Key ? { r2_key: r2Key } : { url: body.imageUrl }),
                alt: body.imageAlt || '',
                width: body.imageWidth,
                height: body.imageHeight
            };
        }

        if (body.heroUrl) {
            const r2Key = extractR2KeyFromUrl(body.heroUrl);
            images.hero = {
                ...(r2Key ? { r2_key: r2Key } : { url: body.heroUrl }),
                alt: body.heroAlt || '',
                width: body.heroWidth,
                height: body.heroHeight
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
    delete transformed.heroUrl;
    delete transformed.heroAlt;
    delete transformed.heroWidth;
    delete transformed.heroHeight;

    return transformed;
}
