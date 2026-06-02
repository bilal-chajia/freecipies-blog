import { describe, expect, it } from 'vitest';
import { migrateNutrition, migrateRecipeJson } from '../recipes.types';

describe('migrateNutrition', () => {
    it('returns null when there is no nutrition data', () => {
        expect(migrateNutrition(null, undefined, null)).toBeNull();
        expect(migrateNutrition({}, undefined, 4)).toBeNull();
    });

    it('maps legacy camelCase keys to the canonical contract shape', () => {
        const result = migrateNutrition(
            {
                servingSize: '1 bowl',
                calories: 320,
                fatContent: 12,
                saturatedFatContent: 3,
                carbohydrateContent: 42,
                fiberContent: 5,
                sugarContent: 6,
                proteinContent: 14,
                sodiumContent: 520,
                cholesterolContent: 20,
            },
            undefined,
            4,
        );

        expect(result).toMatchObject({
            basis: 'per_serving',
            status: 'validated',
            serving_size: { label: '1 bowl', grams: 0 },
            servings_per_recipe: 4,
            calories: 320,
            total_fat_g: 12,
            saturated_fat_g: 3,
            total_carbohydrate_g: 42,
            dietary_fiber_g: 5,
            total_sugars_g: 6,
            protein_g: 14,
            sodium_mg: 520,
            cholesterol_mg: 20,
        });
    });

    it('passes through canonical snake_case data (save→reload round-trip)', () => {
        const canonical = {
            basis: 'per_serving',
            serving_size: { label: '1 cup', grams: 240 },
            servings_per_recipe: 6,
            calories: 200,
            total_fat_g: 8,
            sodium_mg: 300,
            total_carbohydrate_g: 24,
            protein_g: 9,
            iron_mg: 2.1,
            status: 'validated',
        };
        expect(migrateNutrition(canonical, undefined, 6)).toMatchObject(canonical);
    });

    it('omits optional fields that are absent', () => {
        const result = migrateNutrition({ calories: 100 }, undefined, 2);
        expect(result).not.toHaveProperty('iron_mg');
        expect(result).not.toHaveProperty('added_sugars_g');
        // required fields default to 0
        expect(result).toMatchObject({ total_fat_g: 0, protein_g: 0, sodium_mg: 0 });
    });

    it('migrates the old top-level calories field via migrateRecipeJson', () => {
        const migrated = migrateRecipeJson({ calories: 250, servings: 3 });
        expect(migrated.nutrition).toMatchObject({
            calories: 250,
            servings_per_recipe: 3,
            basis: 'per_serving',
            status: 'validated',
        });
    });
});
