/**
 * Google Recipe Rich Snippet JSON-LD Generator
 * =============================================
 * Generates Schema.org compliant Recipe structured data
 * Optimized for Google Search rich results
 * 
 * Aligned with schema.sql recipe_json structure
 * @see db/schema.sql lines 1344-1488
 * 
 * Usage:
 * ```astro
 * import { generateRecipeJsonLd } from '@lib/recipe-jsonld';
 * 
 * const jsonLd = generateRecipeJsonLd({
 *   article,      // Article from database
 *   recipeJson,   // Parsed RecipeJson
 *   author,       // Author | null
 *   category,     // Category | null
 *   siteUrl,      // "https://example.com"
 *   canonicalUrl  // Full article URL
 * });
 * ```
 */

// Article type not imported — article param uses Record<string, any> to accept\n// both raw DB rows and hydrated articles with computed fields (label, authorName, etc.)
import type { Author } from '@modules/authors/schema/authors.schema';
import type { Category } from '@modules/categories/schema/categories.schema';
import type { RecipeJson } from '@modules/articles/types';
import { extractImage } from '@shared/utils';
import {
    minutesToIsoDuration,
    formatIngredient,
    toSchemaOrgNutrition
} from '@modules/articles/types/recipes.types';

/**
 * Schema.org Recipe structured data
 * @see https://schema.org/Recipe
 */
export interface SchemaOrgRecipe {
    '@context': 'https://schema.org';
    '@type': 'Recipe';
    name: string;
    image: string[];
    author: {
        '@type': 'Person' | 'Organization';
        name: string;
        url?: string;
    };
    datePublished: string;
    dateModified?: string;
    description: string;
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    recipeYield: string;
    recipeCategory?: string;
    recipeCuisine?: string;
    keywords?: string;
    recipeIngredient: string[];
    recipeInstructions: Array<{
        '@type': 'HowToSection' | 'HowToStep';
        name?: string;
        position?: number;
        text?: string;
        image?: string;
        itemListElement?: Array<{
            '@type': 'HowToStep';
            position: number;
            name?: string;
            text: string;
            image?: string;
        }>;
    }>;
    nutrition?: {
        '@type': 'NutritionInformation';
        servingSize?: string;
        calories?: string;
        fatContent?: string;
        [key: string]: string | undefined;
    };
    aggregateRating?: {
        '@type': 'AggregateRating';
        ratingValue: number;
        ratingCount: number;
    };
    video?: {
        '@type': 'VideoObject';
        name: string;
        description?: string;
        thumbnailUrl: string[];
        contentUrl?: string;
        embedUrl?: string;
        uploadDate: string;
        duration: string;
    };
    suitableForDiet?: string[];
}

interface GenerateOptions {
    /** Accepts both raw Article and hydrated article (with label, authorName, etc.) */
    article: Record<string, any>;
    recipeJson: RecipeJson | null;
    author?: Author | null;
    category?: Category | null;
    siteUrl: string;
    canonicalUrl: string;
}

/**
 * Generate Schema.org Recipe JSON-LD
 * 
 * Required fields per Google:
 * - name (from article.headline)
 * - image (from images_json)
 * 
 * Recommended fields:
 * - author, datePublished, description
 * - prepTime, cookTime, totalTime (ISO 8601)
 * - recipeYield, recipeCategory, recipeCuisine
 * - recipeIngredient (array of strings)
 * - recipeInstructions (HowToStep/HowToSection)
 * - nutrition (with servingSize)
 * - aggregateRating
 * - video
 */
export function generateRecipeJsonLd(options: GenerateOptions): SchemaOrgRecipe | null {
    const { article, recipeJson, author, category, siteUrl, canonicalUrl } = options;

    if (!recipeJson) return null;

    // Extract images
    const images: string[] = [];
    const cover = extractImage(article.imagesJson, 'cover', 1200);
    const thumbnail = extractImage(article.imagesJson, 'thumbnail', 800);

    if (cover.imageUrl) images.push(new URL(cover.imageUrl, siteUrl).toString());
    if (thumbnail.imageUrl && thumbnail.imageUrl !== cover.imageUrl) {
        images.push(new URL(thumbnail.imageUrl, siteUrl).toString());
    }

    // Fallback to default if no images
    if (images.length === 0) {
        images.push(`${siteUrl}/og-image.jpg`);
    }

    // Build recipeYield
    const recipeYield = recipeJson.recipeYield ||
        (recipeJson.servings ? `Serves ${recipeJson.servings}` : '1 serving');

    // Build JSON-LD
    const jsonLd: SchemaOrgRecipe = {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: article.headline || article.label || 'Untitled Recipe',
        image: images,
        author: {
            '@type': 'Person',
            name: author?.name || article.authorName || 'Freecipies',
            url: author?.slug ? `${siteUrl}/authors/${author.slug}` : undefined
        },
        datePublished: article.publishedAt || new Date().toISOString().split('T')[0],
        dateModified: article.updatedAt || article.publishedAt || undefined,
        description: article.shortDescription || article.metaDescription || '',
        recipeYield,
        recipeIngredient: flattenIngredients(recipeJson.ingredients),
        recipeInstructions: convertInstructions(recipeJson.instructions)
    };

    // Convert numeric minutes → ISO-8601 for JSON-LD
    // minutesToIsoDuration() is null-safe: returns null for null/0 input
    const prepIso = minutesToIsoDuration(recipeJson.prep);
    const cookIso = minutesToIsoDuration(recipeJson.cook);
    const totalIso = minutesToIsoDuration(
        recipeJson.total ?? (((recipeJson.prep ?? 0) + (recipeJson.cook ?? 0)) || null)
    );
    if (prepIso) jsonLd.prepTime = prepIso;
    if (cookIso) jsonLd.cookTime = cookIso;
    if (totalIso) jsonLd.totalTime = totalIso;

    // Add optional fields
    if (recipeJson.recipeCategory || category?.label) {
        jsonLd.recipeCategory = recipeJson.recipeCategory || category?.label;
    }

    if (recipeJson.recipeCuisine) {
        jsonLd.recipeCuisine = recipeJson.recipeCuisine;
    }

    if (recipeJson.keywords?.length) {
        jsonLd.keywords = recipeJson.keywords.join(', ');
    }

    // Add nutrition (only if servingSize is available)
    if (recipeJson.nutrition?.servingSize) {
        jsonLd.nutrition = toSchemaOrgNutrition(recipeJson.nutrition) as any;
    }

    // Add ratings
    if (recipeJson.aggregateRating?.ratingValue && recipeJson.aggregateRating.ratingCount > 0) {
        jsonLd.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: recipeJson.aggregateRating.ratingValue,
            ratingCount: recipeJson.aggregateRating.ratingCount
        };
    }

    // Add video
    if (recipeJson.video) {
        jsonLd.video = {
            '@type': 'VideoObject',
            name: recipeJson.video.name,
            description: recipeJson.video.description || article.shortDescription || '',
            thumbnailUrl: recipeJson.video.thumbnailUrl
                ? [recipeJson.video.thumbnailUrl]
                : images.slice(0, 1),
            contentUrl: recipeJson.video.url,
            uploadDate: recipeJson.video.uploadDate || article.publishedAt || new Date().toISOString(),
            duration: recipeJson.video.duration
        };
    }

    // Add dietary info
    if (recipeJson.suitableForDiet?.length) {
        jsonLd.suitableForDiet = recipeJson.suitableForDiet.map(diet =>
            `https://schema.org/${diet}`
        );
    }

    return jsonLd;
}

/**
 * Flatten ingredients to string array for JSON-LD
 */
function flattenIngredients(ingredients: RecipeJson['ingredients']): string[] {
    if (!ingredients) return [];

    const result: string[] = [];
    for (const group of ingredients) {
        for (const item of group.items) {
            result.push(formatIngredient(item));
        }
    }
    return result;
}

/**
 * Convert instructions to HowToSection/HowToStep format
 */
function convertInstructions(instructions: RecipeJson['instructions']): SchemaOrgRecipe['recipeInstructions'] {
    if (!instructions) return [];

    const result: SchemaOrgRecipe['recipeInstructions'] = [];
    let globalStepNumber = 1;

    for (const section of instructions) {
        if (section.section_title && section.steps.length > 1) {
            // Multi-step section → HowToSection
            result.push({
                '@type': 'HowToSection',
                name: section.section_title,
                itemListElement: section.steps.map((step) => ({
                    '@type': 'HowToStep' as const,
                    position: globalStepNumber++,
                    name: step.name,
                    text: step.text,
                    image: step.image || undefined
                }))
            });
        } else {
            // Single step or no section → flat HowToStep
            for (const step of section.steps) {
                result.push({
                    '@type': 'HowToStep',
                    position: globalStepNumber++,
                    name: step.name,
                    text: step.text,
                    image: step.image || undefined
                });
            }
        }
    }

    return result;
}

export default generateRecipeJsonLd;
