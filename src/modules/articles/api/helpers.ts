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
        meta_title: value.meta_title ?? null,
        meta_description: value.meta_description ?? null,
        no_index: Boolean(value.no_index ?? false),
        canonical: value.canonical ?? null,
        og_image: value.og_image ?? null,
        og_title: value.og_title ?? null,
        og_description: value.og_description ?? null,
        twitter_card: value.twitter_card ?? 'summary_large_image',
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
        'images_json', 'recipe_json', 'roundup_json',
        'faqs_json', 'seo_json', 'config_json', 'jsonld_json',
        'cached_tags_json', 'cached_category_json',
        'cached_author_json', 'cached_rating_json', 'cached_recipe_json',
        'cached_card_json'
    ];

    // Ensure they are properly parsed if they come as strings (though the client should send objects)
    for (const field of jsonFields) {
        if (body[field] !== undefined) {
            transformed[field] = safeParseJson(body[field]);
        }
    }

    if (body.content_json !== undefined) {
        transformed.content_json = normalizeContentDocument(body.content_json);
    }

    if (body.recipe_json !== undefined) {
        transformed.recipe_json = normalizeRecipeJson(transformed.recipe_json);
    }

    if (body.roundup_json !== undefined) {
        transformed.roundup_json = normalizeRoundupJson(transformed.roundup_json);
    }

    if (body.faqs_json !== undefined) {
        transformed.faqs_json = normalizeFaqsJson(transformed.faqs_json);
    }

    if (body.images_json !== undefined) {
        transformed.images_json = normalizeImageSnapshotContainer('article', transformed.images_json);
    }

    if (body.seo_json !== undefined) {
        transformed.seo_json = normalizeSeoJson(transformed.seo_json);
    } else if (
        body.metaTitle !== undefined ||
        body.metaDescription !== undefined ||
        body.noIndex !== undefined ||
        body.canonical !== undefined ||
        body.canonicalUrl !== undefined ||
        body.ogImage !== undefined ||
        body.ogTitle !== undefined ||
        body.ogDescription !== undefined ||
        body.twitterCard !== undefined
    ) {
        transformed.seo_json = normalizeSeoJson({
            meta_title: body.metaTitle,
            meta_description: body.metaDescription,
            no_index: body.noIndex,
            canonical: body.canonical ?? body.canonicalUrl,
            og_image: body.ogImage,
            og_title: body.ogTitle,
            og_description: body.ogDescription,
            twitter_card: body.twitterCard,
        });
    }

    // Handle legacy flat image fields if images_json is not provided
    if (!body.images_json) {
        const images: any = {};

        if (body.image_url) {
            const r2Key = extractR2KeyFromUrl(body.image_url);
            images.thumbnail = {
                ...(r2Key ? { r2_key: r2Key } : { url: body.image_url }),
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
            transformed.images_json = images;
        }
    }

    // Remove legacy flat fields to keep the database patch clean
    delete transformed.image_url;
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
