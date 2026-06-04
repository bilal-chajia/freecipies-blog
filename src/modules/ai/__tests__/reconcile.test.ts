import { describe, expect, it } from 'vitest';
import { reconcileSelection } from '../discovery/reconcile';

describe('reconcileSelection', () => {
    const discovered = [
        { id: 'a', modality: 'text' as const },
        { id: 'b', modality: 'text' as const, deprecated: true },
    ];

    it('marks selected, deprecated, and unavailable', () => {
        const stored = [
            {
                id: 'a',
                enabled: true,
                order: 0,
                modality: 'text' as const,
                status: 'available' as const,
                source: 'discovered' as const,
            },
            {
                id: 'gone',
                enabled: true,
                order: 1,
                modality: 'text' as const,
                status: 'available' as const,
                source: 'discovered' as const,
            },
        ];

        const reconciled = reconcileSelection(stored, discovered);

        expect(reconciled.find((m) => m.id === 'a')).toMatchObject({ enabled: true, status: 'available' });
        expect(reconciled.find((m) => m.id === 'b')).toMatchObject({
            enabled: false,
            status: 'deprecated',
            deprecated: true,
        });
        expect(reconciled.find((m) => m.id === 'gone')).toMatchObject({
            enabled: true,
            status: 'unavailable',
        });
    });
});
