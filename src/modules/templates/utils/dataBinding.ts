/**
 * Data Binding Utilities
 * ======================
 * Functions for resolving data bindings using dot notation paths.
 */

/**
 * Common data field suggestions for autocomplete
 */
export const DATA_FIELD_SUGGESTIONS = [
    // Article fields
    { path: 'title', label: 'Article Title', type: 'text' },
    { path: 'categoryLabel', label: 'Category', type: 'text' },
    { path: 'authorName', label: 'Author Name', type: 'text' },
    { path: 'image', label: 'Main Image', type: 'image' },

    // Recipe fields
    { path: 'recipe_json.prep', label: 'Prep Time (minutes)', type: 'text' },
    { path: 'recipe_json.cook', label: 'Cook Time (minutes)', type: 'text' },
    { path: 'recipe_json.total', label: 'Total Time (minutes)', type: 'text' },
    { path: 'recipe_json.servings', label: 'Servings', type: 'text' },
    { path: 'recipe_json.difficulty', label: 'Difficulty', type: 'text' },
    { path: 'recipe_json.recipeCategory', label: 'Recipe Category', type: 'text' },
    { path: 'recipe_json.recipeCuisine', label: 'Cuisine', type: 'text' },

    // Nutrition fields
    { path: 'recipe_json.nutrition.calories', label: 'Calories', type: 'text' },
    { path: 'recipe_json.nutrition.protein_g', label: 'Protein (g)', type: 'text' },
    { path: 'recipe_json.nutrition.total_carbohydrate_g', label: 'Carbs (g)', type: 'text' },
    { path: 'recipe_json.nutrition.total_fat_g', label: 'Fat (g)', type: 'text' },
];

/**
 * Get a value from an object using dot notation path
 * @param data - The source object
 * @param path - Dot notation path (e.g., "recipe_json.nutrition.calories")
 * @returns The value at the path, or undefined if not found
 * 
 * @example
 * getValue({ recipe_json: { prep: 15 } }, "recipe_json.prep") // returns 15
 * getValue({ title: "Hello" }, "title") // returns "Hello"
 * getValue({ a: { b: { c: 1 } } }, "a.b.c") // returns 1
 */
export function getValue<T = unknown>(data: Record<string, unknown>, path: string): T | undefined {
    if (!data || !path) return undefined;

    return path.split('.').reduce<unknown>((obj, key) => {
        if (obj && typeof obj === 'object' && key in obj) {
            return (obj as Record<string, unknown>)[key];
        }
        return undefined;
    }, data) as T | undefined;
}

/**
 * Resolve element binding to actual value
 * @param binding - The binding path (e.g., "recipe_json.prep")
 * @param articleData - The article data object
 * @param fallback - Fallback value if binding not found
 * @returns The resolved value or fallback
 */
export function resolveBinding(
    binding: string | undefined,
    articleData: Record<string, unknown> | null,
    fallback: string = ''
): string {
    if (!binding || !articleData) return fallback;

    const value = getValue(articleData, binding);

    if (value === undefined || value === null) return fallback;

    // Convert to string for display
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    // For arrays/objects, return JSON
    return JSON.stringify(value);
}

/**
 * Check if a binding path is valid (exists in data)
 */
export function isValidBinding(path: string, articleData: Record<string, unknown>): boolean {
    return getValue(articleData, path) !== undefined;
}
