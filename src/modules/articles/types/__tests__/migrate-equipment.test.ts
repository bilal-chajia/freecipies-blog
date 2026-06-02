import { describe, expect, it } from 'vitest';
import { migrateEquipment, migrateRecipeJson } from '../recipes.types';

describe('migrateEquipment', () => {
    it('returns [] for non-array input', () => {
        expect(migrateEquipment(undefined)).toEqual([]);
        expect(migrateEquipment(null)).toEqual([]);
        expect(migrateEquipment('nope')).toEqual([]);
    });

    it('maps bare strings to manual items', () => {
        expect(migrateEquipment(['Large bowl'])).toEqual([
            { id: 'eq-1', equipment_id: null, label: 'Large bowl', required: true, notes: null, source_type: 'manual', snapshot: null },
        ]);
    });

    it('maps legacy { name, affiliateUrl } items to canonical manual items', () => {
        const result = migrateEquipment([{ name: 'Whisk', required: false, notes: 'optional', affiliateUrl: 'https://x' }]);
        expect(result[0]).toMatchObject({
            equipment_id: null,
            label: 'Whisk',
            required: false,
            notes: 'optional',
            source_type: 'manual',
            snapshot: null,
        });
    });

    it('derives catalog source_type from a numeric equipment_id', () => {
        const result = migrateEquipment([
            { id: 'eq-stand-mixer', equipment_id: 12, label: 'Stand mixer', required: true, notes: null, source_type: 'catalog', snapshot: { slug: 'stand-mixer', name: 'Stand Mixer' } },
        ]);
        expect(result[0]).toMatchObject({
            id: 'eq-stand-mixer',
            equipment_id: 12,
            label: 'Stand mixer',
            source_type: 'catalog',
            snapshot: { slug: 'stand-mixer', name: 'Stand Mixer' },
        });
    });

    it('drops snapshot for manual items', () => {
        const result = migrateEquipment([{ label: 'Spoon', snapshot: { slug: 'x', name: 'x' } }]);
        expect(result[0].source_type).toBe('manual');
        expect(result[0].snapshot).toBeNull();
    });

    it('migrateRecipeJson normalizes the equipment array', () => {
        const migrated = migrateRecipeJson({ equipment: ['Knife', { equipment_id: 3, name: 'Blender' }] });
        expect(migrated.equipment).toHaveLength(2);
        expect(migrated.equipment[0]).toMatchObject({ label: 'Knife', source_type: 'manual' });
        expect(migrated.equipment[1]).toMatchObject({ equipment_id: 3, label: 'Blender', source_type: 'catalog' });
    });
});
