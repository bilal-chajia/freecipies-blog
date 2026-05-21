/**
 * Articles Module - API Helpers
 * =============================
 * Normalization and transformation logic for article request data.
 */

import { safeParseJson } from '../../../shared/utils/hydration';
import { normalizeImageSnapshotContainer } from '@shared/images/image-contract';
import { normalizeContentDocument } from '../../content-blocks';
import { normalizeRecipeJson, normalizeRoundupJson } from '../utils/article-json-contract';

type StoredSeoJson = {
    meta_title?: string | null;
    meta_description?: string | null;
    no_index?: boolean;
    canonical?: string | null;
    og_image?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    twitter_card?: 'summary' | 'summary_large_image';
};

type StoredFaqsJson = {
    heading: string;
    intro: string | null;
    items: Array<{ question: string; answer: string }>;
};

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

const normalizeSeoJson = (value: any): StoredSeoJson => {
    if (!value || typeof value !== 'object') return {};

    return {
        meta_title: value.meta_title ?? value.metaTitle ?? null,
        meta_description: value.meta_description ?? value.metaDescription ?? null,
        no_index: Boolean(value.no_index ?? value.noIndex ?? false),
        canonical: value.canonical ?? value.canonicalUrl ?? null,
        og_image: value.og_image ?? value.ogImage ?? null,
        og_title: value.og_title ?? value.ogTitle ?? null,
        og_description: value.og_description ?? value.ogDescription ?? null,
        twitter_card: value.twitter_card ?? value.twitterCard ?? 'summary_large_image',
    };
};

const normalizeFaqsJson = (value: any): StoredFaqsJson => {
    const source = Array.isArray(value)
        ? { items: value }
        : value && typeof value === 'object'
            ? value
            : {};
    const items = Array.isArray(source.items) ? source.items : [];

    return {
        heading: typeof source.heading === 'string' && source.heading.trim()
            ? source.heading.trim()
            : 'Frequently Asked Questions',
        intro: typeof source.intro === 'string' && source.intro.trim() ? source.intro.trim() : null,
        items: items
            .map((item: any) => ({
                question: typeof item?.question === 'string' ? item.question : typeof item?.q === 'string' ? item.q : '',
                answer: typeof item?.answer === 'string' ? item.answer : typeof item?.a === 'string' ? item.a : '',
            }))
            .filter((item: { question: string; answer: string }) => item.question.trim() && item.answer.trim())
            .map((item: { question: string; answer: string }) => ({
                question: item.question.trim(),
                answer: item.answer.trim(),
            })),
    };
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
        'cachedAuthorJson', 'cachedRatingJson', 'cachedRecipeJson',
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

    if (body.recipeJson !== undefined) {
        transformed.recipeJson = normalizeRecipeJson(transformed.recipeJson);
    }

    if (body.roundupJson !== undefined) {
        transformed.roundupJson = normalizeRoundupJson(transformed.roundupJson);
    }

    if (body.faqsJson !== undefined) {
        transformed.faqsJson = normalizeFaqsJson(transformed.faqsJson);
    }

    if (body.imagesJson !== undefined) {
        transformed.imagesJson = normalizeImageSnapshotContainer('article', transformed.imagesJson);
    }

    if (body.seoJson !== undefined) {
        transformed.seoJson = normalizeSeoJson(transformed.seoJson);
    } else if (
        body.metaTitle ||
        body.metaDescription ||
        body.noIndex ||
        body.canonical ||
        body.canonicalUrl ||
        body.ogImage ||
        body.ogTitle ||
        body.ogDescription ||
        body.twitterCard
    ) {
        transformed.seoJson = normalizeSeoJson({
            metaTitle: body.metaTitle,
            metaDescription: body.metaDescription,
            noIndex: body.noIndex,
            canonical: body.canonical,
            canonicalUrl: body.canonicalUrl,
            ogImage: body.ogImage,
            ogTitle: body.ogTitle,
            ogDescription: body.ogDescription,
            twitterCard: body.twitterCard,
        });
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
    delete transformed.metaTitle;
    delete transformed.metaDescription;
    delete transformed.noIndex;
    delete transformed.canonical;
    delete transformed.canonicalUrl;
    delete transformed.ogImage;
    delete transformed.ogTitle;
    delete transformed.ogDescription;
    delete transformed.twitterCard;

    return transformed;
}
