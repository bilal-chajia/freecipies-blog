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
    toSchemaOrgNutrition,
    minutesToIsoDuration,
    flattenIngredients,
    toSchemaOrgInstructions,
} from '../types/recipes.types';
import type { RoundupJson } from '../types/roundups.types';
import { toSchemaOrgItemList } from '../types/roundups.types';
import { resolveVariantUrl } from '@shared/types/images';
import { safeParseJson } from '@shared/utils/hydration';


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
    faqsJson?: string | unknown[];
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


// ═══════════════════════════════════════════════
// FAQ Schema
// ═══════════════════════════════════════════════

/**
 * Build FAQPage schema from faqs array.
 * Returns null if no FAQs to emit.
 */
function buildFaqSchema(faqs: Array<{ q: string; a: string }>): Record<string, unknown> | null {
    if (!faqs || faqs.length === 0) return null;

    return {
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
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
            ...(author?.slug && { url: `${siteUrl}/authors/${author.slug}` }),
        },
        publisher,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
    });

    // FAQ overlay — merge into Article or emit separately
    const faqs = safeParseJson<Array<{ q: string; a: string }>>(article.faqsJson as string);
    const faqSchema = buildFaqSchema(faqs || []);
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

    const recipeData = safeParseJson<RecipeJson>(article.recipeJson as string) || {} as RecipeJson;
    const imagesData = safeParseJson<Record<string, any>>(article.imagesJson as string) || {};
    const author = safeParseJson<Record<string, unknown>>(article.cachedAuthorJson as string);
    const publisher = makePublisher(siteUrl);
    const canonicalUrl = `${siteUrl}/recipes/${article.slug}`;

    // Build image array from variants
    const images: string[] = [];
    const heroVariants = imagesData?.hero?.variants;
    if (heroVariants) {
        if (heroVariants.lg?.url) images.push(heroVariants.lg.url);
        if (heroVariants.md?.url) images.push(heroVariants.md.url);
        if (heroVariants.sm?.url) images.push(heroVariants.sm.url);
    }

    // Use shared utilities for consistent formatting
    const recipeIngredient = flattenIngredients(recipeData.ingredients || []);
    const recipeInstructions = toSchemaOrgInstructions(recipeData.instructions || []);

    // Nutrition
    let nutrition: Record<string, unknown> | undefined;
    if (recipeData.nutrition && Object.keys(recipeData.nutrition).length > 0) {
        nutrition = toSchemaOrgNutrition(recipeData.nutrition);
    }

    // Aggregate rating
    let aggregateRating: Record<string, unknown> | undefined;
    if (recipeData.aggregateRating?.ratingValue) {
        aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: recipeData.aggregateRating.ratingValue,
            ratingCount: recipeData.aggregateRating.ratingCount || 0,
        };
    }

    // Video
    let video: Record<string, unknown> | undefined;
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
            ...(author?.slug && { url: `${siteUrl}/authors/${author.slug}` }),
        },
        datePublished: article.publishedAt || undefined,
        dateModified: article.updatedAt || article.publishedAt || undefined,
        prepTime: minutesToIsoDuration(recipeData.prep) || undefined,
        cookTime: minutesToIsoDuration(recipeData.cook) || undefined,
        totalTime: minutesToIsoDuration(
            recipeData.total ?? (((recipeData.prep ?? 0) + (recipeData.cook ?? 0)) || null)
        ) || undefined,
        recipeYield: recipeData.recipeYield || (recipeData.servings ? `${recipeData.servings} servings` : undefined),
        recipeCategory: recipeData.recipeCategory || undefined,
        recipeCuisine: recipeData.recipeCuisine || undefined,
        keywords: recipeData.keywords?.join(', ') || undefined,
        recipeIngredient: recipeIngredient.length > 0 ? recipeIngredient : undefined,
        recipeInstructions: recipeInstructions.length > 0 ? recipeInstructions : undefined,
        nutrition,
        aggregateRating,
        video,
        suitableForDiet: recipeData.suitableForDiet?.map(d => `https://schema.org/${d}`) || undefined,
        publisher,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
    };

    // FAQ as subjectOf (Google Recipe spec)
    const faqs = safeParseJson<Array<{ q: string; a: string }>>(article.faqsJson as string);
    const faqSchema = buildFaqSchema(faqs || []);
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
        || { items: [], listType: 'ItemList' };
    const imagesData = safeParseJson<Record<string, any>>(article.imagesJson as string) || {};
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
            ...(author?.slug && { url: `${siteUrl}/authors/${author.slug}` }),
        },
        datePublished: article.publishedAt || undefined,
        dateModified: article.updatedAt || article.publishedAt || undefined,
    };

    schemas.push(schema);

    // FAQ overlay for roundups
    const faqs = safeParseJson<Array<{ q: string; a: string }>>(article.faqsJson as string);
    const faqSchema = buildFaqSchema(faqs || []);
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
