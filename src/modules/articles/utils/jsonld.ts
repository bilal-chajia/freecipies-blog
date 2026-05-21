/**
 * JSON-LD Generation — Centralized Schema.org Output
 * ====================================================
 *
 * Single source of truth for generating Schema.org JSON-LD
 * for all article types. Called once at save time by
 * `refreshArticleCaches()` and stored in `articles.jsonld_json`.
 *
 * The frontend reads `jsonldJson` directly via SEO.astro —
 * no per-page reconstruction needed.
 *
 * Supported schemas:
 *   - Article (+ FAQPage)
 *   - Recipe  (+ FAQPage, VideoObject, AggregateRating)
 *   - ItemList (roundups)
 *   - BreadcrumbList (handled separately in page layouts)
 *
 * @see SEO.astro — frontend consumer
 * @see articles.service.ts refreshArticleCaches() — save-time hook
 */

import type { RecipeJson } from '../types/recipes.types';
import {
    minutesToIsoDuration,
    flattenIngredients,
    toSchemaOrgInstructions,
} from '../types/recipes.types';
import type { RoundupJson } from '../types/roundups.types';
import { toSchemaOrgItemList } from '../types/roundups.types';
import { resolveVariantUrl } from '@shared/types/images';
import { safeParseJson } from '@shared/utils/hydration';
import { normalizeRecipeJson } from './article-json-contract';

type JsonImageVariant = Record<string, unknown>;
type JsonImageSlot = {
    variants?: Record<string, JsonImageVariant | undefined>;
};
type JsonImages = Record<string, any>;

function resolveImageSlotUrl(slot: JsonImageSlot | undefined): string | null {
    if (!slot?.variants) return null;
    return resolveVariantUrl(slot.variants.lg)
        || resolveVariantUrl(slot.variants.md)
        || resolveVariantUrl(slot.variants.sm)
        || null;
}

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

/** Raw article row from DB (before hydration) */
interface ArticleRow {
    id: number;
    type: string;
    headline: string;
    slug: string;
    shortDescription?: string;
    publishedAt?: string;
    updatedAt?: string;
    recipeJson?: string | Record<string, unknown>;
    roundupJson?: string | Record<string, unknown>;
    imagesJson?: string | Record<string, unknown>;
    faqsJson?: string | unknown[] | Record<string, unknown>;
    cachedAuthorJson?: string | Record<string, unknown>;
    cachedCategoryJson?: string | Record<string, unknown>;
}

/** Output shape — array of JSON-LD objects */
export type JsonLdOutput = Record<string, unknown>[];


// ═══════════════════════════════════════════════
// Shared publisher
// ═══════════════════════════════════════════════

function makePublisher(siteUrl: string) {
    return {
        '@type': 'Organization',
        name: 'SaaS Blog',
        logo: {
            '@type': 'ImageObject',
            url: `${siteUrl}/logo.png`,
            width: 600,
            height: 60,
        },
    };
}

function schemaNutrition(nutrition: Record<string, unknown>): Record<string, unknown> {
    const servingSize = typeof nutrition.serving_size === 'object' && nutrition.serving_size !== null
        ? nutrition.serving_size as { label?: string }
        : null;

    return {
        '@type': 'NutritionInformation',
        ...(servingSize?.label && { servingSize: servingSize.label }),
        ...(nutrition.calories !== undefined && { calories: `${nutrition.calories} calories` }),
        ...(nutrition.total_fat_g !== undefined && { fatContent: `${nutrition.total_fat_g}g` }),
        ...(nutrition.saturated_fat_g !== undefined && { saturatedFatContent: `${nutrition.saturated_fat_g}g` }),
        ...(nutrition.trans_fat_g !== undefined && { transFatContent: `${nutrition.trans_fat_g}g` }),
        ...(nutrition.total_carbohydrate_g !== undefined && { carbohydrateContent: `${nutrition.total_carbohydrate_g}g` }),
        ...(nutrition.total_sugars_g !== undefined && { sugarContent: `${nutrition.total_sugars_g}g` }),
        ...(nutrition.dietary_fiber_g !== undefined && { fiberContent: `${nutrition.dietary_fiber_g}g` }),
        ...(nutrition.protein_g !== undefined && { proteinContent: `${nutrition.protein_g}g` }),
        ...(nutrition.sodium_mg !== undefined && { sodiumContent: `${nutrition.sodium_mg}mg` }),
        ...(nutrition.cholesterol_mg !== undefined && { cholesterolContent: `${nutrition.cholesterol_mg}mg` }),
    };
}


// ═══════════════════════════════════════════════
// FAQ Schema
// ═══════════════════════════════════════════════

/**
 * Build FAQPage schema from faqs array.
 * Returns null if no FAQs to emit.
 */
function normalizeFaqItems(input: ArticleRow['faqsJson']): Array<{ question: string; answer: string }> {
    const parsed = typeof input === 'string'
        ? safeParseJson<any>(input)
        : input;
    const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
            ? parsed.items
            : [];

    return items
        .map((faq: any) => ({
            question: typeof faq?.question === 'string' ? faq.question : typeof faq?.q === 'string' ? faq.q : '',
            answer: typeof faq?.answer === 'string' ? faq.answer : typeof faq?.a === 'string' ? faq.a : '',
        }))
        .filter((faq: { question: string; answer: string }) => faq.question.trim() && faq.answer.trim());
}

function buildFaqSchema(faqsInput: ArticleRow['faqsJson']): Record<string, unknown> | null {
    const faqs = normalizeFaqItems(faqsInput);
    if (faqs.length === 0) return null;

    return {
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}


// ═══════════════════════════════════════════════
// Article JSON-LD
// ═══════════════════════════════════════════════

/**
 * Generate JSON-LD for a standard article.
 * Emits Article schema + optional FAQPage.
 */
function generateArticleJsonLd(article: ArticleRow, siteUrl: string): JsonLdOutput {
    const schemas: JsonLdOutput = [];
    const author = safeParseJson<Record<string, unknown>>(article.cachedAuthorJson as string);
    const publisher = makePublisher(siteUrl);
    const canonicalUrl = `${siteUrl}/articles/${article.slug}`;

    // Main Article schema
    schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.headline,
        description: article.shortDescription || undefined,
        datePublished: article.publishedAt || undefined,
        dateModified: article.updatedAt || article.publishedAt || undefined,
        author: {
            '@type': 'Person',
            name: (author?.name as string) || 'SaaS Blog Team',
            ...(typeof author?.slug === 'string' ? { url: `${siteUrl}/authors/${author.slug}` } : {}),
        },
        publisher,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
    });

    // FAQ overlay — merge into Article or emit separately
    const faqSchema = buildFaqSchema(article.faqsJson);
    if (faqSchema) {
        // Google supports FAQPage as standalone or merged into Article
        // We merge mainEntity into the Article schema
        schemas[0]!.mainEntity = faqSchema.mainEntity;
    }

    return schemas;
}


// ═══════════════════════════════════════════════
// Recipe JSON-LD
// ═══════════════════════════════════════════════

/**
 * Generate JSON-LD for a recipe article.
 * Emits Recipe schema with full structured data
 * (ingredients, instructions, nutrition, rating, video)
 * + optional FAQPage as subjectOf.
 */
function generateRecipeJsonLd(article: ArticleRow, siteUrl: string): JsonLdOutput {
    const schemas: JsonLdOutput = [];

    const recipeData = normalizeRecipeJson(safeParseJson<RecipeJson>(article.recipeJson as string) || {});
    const imagesData = safeParseJson<JsonImages>(article.imagesJson as string) || {};
    const author = safeParseJson<Record<string, unknown>>(article.cachedAuthorJson as string);
    const publisher = makePublisher(siteUrl);
    const canonicalUrl = `${siteUrl}/recipes/${article.slug}`;

    // Build image array from variants
    const images: string[] = [];
    const heroVariants = imagesData?.hero?.variants;
    if (heroVariants) {
        const lgUrl = resolveVariantUrl(heroVariants.lg);
        const mdUrl = resolveVariantUrl(heroVariants.md);
        const smUrl = resolveVariantUrl(heroVariants.sm);
        if (lgUrl) images.push(lgUrl);
        if (mdUrl) images.push(mdUrl);
        if (smUrl) images.push(smUrl);
    }

    // Use shared utilities for consistent formatting
    const recipeIngredient = flattenIngredients((recipeData.ingredients || []) as any);
    const recipeInstructions = toSchemaOrgInstructions(
        (recipeData.instructions || []) as any,
        (imageRef) => resolveImageSlotUrl(imagesData.recipe_steps?.[imageRef])
    );

    // Nutrition
    let nutrition: Record<string, unknown> | undefined;
    if (recipeData.nutrition && Object.keys(recipeData.nutrition).length > 0) {
        nutrition = schemaNutrition(recipeData.nutrition);
    }

    // Aggregate rating
    let aggregateRating: Record<string, unknown> | undefined;
    if (recipeData.aggregate_rating?.rating_value) {
        aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: recipeData.aggregate_rating.rating_value,
            ratingCount: recipeData.aggregate_rating.rating_count || 0,
        };
    }

    // Video
    let video: Record<string, unknown> | undefined;
    if (recipeData.video?.content_url || recipeData.video?.embed_url) {
        video = {
            '@type': 'VideoObject',
            name: recipeData.video.name,
            description: recipeData.video.description,
            thumbnailUrl: resolveImageSlotUrl(recipeData.video.thumbnail as any) || undefined,
            contentUrl: recipeData.video.content_url,
            embedUrl: recipeData.video.embed_url,
            duration: recipeData.video.duration,
            uploadDate: recipeData.video.upload_date,
        };
    }

    // Main Recipe schema
    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: article.headline,
        description: article.shortDescription || undefined,
        image: images.length > 0 ? images : undefined,
        author: {
            '@type': 'Person',
            name: (author?.name as string) || 'SaaS Blog Team',
            ...(typeof author?.slug === 'string' ? { url: `${siteUrl}/authors/${author.slug}` } : {}),
        },
        datePublished: article.publishedAt || undefined,
        dateModified: article.updatedAt || article.publishedAt || undefined,
        prepTime: minutesToIsoDuration(recipeData.prep) || undefined,
        cookTime: minutesToIsoDuration(recipeData.cook) || undefined,
        totalTime: minutesToIsoDuration(
            recipeData.total ?? (((recipeData.prep ?? 0) + (recipeData.cook ?? 0)) || null)
        ) || undefined,
        recipeYield: recipeData.recipe_yield || (recipeData.servings ? `${recipeData.servings} servings` : undefined),
        recipeCategory: recipeData.recipe_category || undefined,
        recipeCuisine: recipeData.recipe_cuisine || undefined,
        keywords: recipeData.keywords?.join(', ') || undefined,
        recipeIngredient: recipeIngredient.length > 0 ? recipeIngredient : undefined,
        recipeInstructions: recipeInstructions.length > 0 ? recipeInstructions : undefined,
        nutrition,
        aggregateRating,
        video,
        suitableForDiet: recipeData.suitable_for_diet?.map(d => `https://schema.org/${d}`) || undefined,
        publisher,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
    };

    // FAQ as subjectOf (Google Recipe spec)
    const faqSchema = buildFaqSchema(article.faqsJson);
    if (faqSchema) {
        schema.subjectOf = faqSchema;
    }

    schemas.push(schema);
    return schemas;
}


// ═══════════════════════════════════════════════
// Roundup (ItemList) JSON-LD
// ═══════════════════════════════════════════════

/**
 * Generate JSON-LD for a roundup article.
 * Emits ItemList schema + optional Article wrapper.
 */
function generateRoundupJsonLd(article: ArticleRow, siteUrl: string): JsonLdOutput {
    const schemas: JsonLdOutput = [];

    const roundupData = safeParseJson<RoundupJson>(article.roundupJson as string)
        || { items: [], list_type: 'ItemList' };
    const imagesData = safeParseJson<JsonImages>(article.imagesJson as string) || {};
    const author = safeParseJson<Record<string, unknown>>(article.cachedAuthorJson as string);

    // Main image
    const hero = imagesData?.hero;
    const mainImage = resolveVariantUrl(hero?.variants?.lg) ||
        resolveVariantUrl(hero?.variants?.md);

    // Use shared toSchemaOrgItemList
    const itemList = toSchemaOrgItemList(roundupData, siteUrl);

    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: article.headline,
        description: article.shortDescription || undefined,
        image: mainImage || undefined,
        numberOfItems: roundupData.items?.length || 0,
        itemListElement: itemList.itemListElement,
        author: {
            '@type': 'Person',
            name: (author?.name as string) || 'SaaS Blog Team',
            ...(typeof author?.slug === 'string' ? { url: `${siteUrl}/authors/${author.slug}` } : {}),
        },
        datePublished: article.publishedAt || undefined,
        dateModified: article.updatedAt || article.publishedAt || undefined,
    };

    schemas.push(schema);

    // FAQ overlay for roundups
    const faqSchema = buildFaqSchema(article.faqsJson);
    if (faqSchema) {
        schemas.push({
            '@context': 'https://schema.org',
            ...faqSchema,
        });
    }

    return schemas;
}


// ═══════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════

/**
 * Generate all JSON-LD schemas for an article.
 * Dispatches to the correct generator based on article type.
 *
 * Called at save time by `refreshArticleCaches()`.
 * Result is stored in `articles.jsonld_json` as a JSON string.
 *
 * @param article - Raw article row from DB
 * @param siteUrl - Base URL of the site (e.g. "https://saas-blog.com")
 * @returns Array of Schema.org JSON-LD objects
 *
 * @example
 * const schemas = generateJsonLd(article, 'https://saas-blog.com');
 * // Store as JSON string in DB
 * updateData.jsonldJson = JSON.stringify(schemas);
 */
export function generateJsonLd(article: ArticleRow, siteUrl: string): JsonLdOutput {
    switch (article.type) {
        case 'recipe':
            return generateRecipeJsonLd(article, siteUrl);
        case 'roundup':
            return generateRoundupJsonLd(article, siteUrl);
        case 'article':
        default:
            return generateArticleJsonLd(article, siteUrl);
    }
}
