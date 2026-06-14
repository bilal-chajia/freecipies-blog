import { describe, expect, it } from 'vitest';
import { dedupeModelsById, dedupeSettingsModels, mergeAiSettings } from '../settings-store';
import { DEFAULT_AI_SETTINGS } from '../types';
import type { AiSettings, ModelSelection } from '../types';

const model = (id: string): ModelSelection => ({
    id,
    modality: 'text',
    enabled: true,
    order: 0,
    status: 'available',
    source: 'discovered',
});

describe('mergeAiSettings', () => {
    it('deep-merges one provider without dropping others', () => {
        const current = {
            ...DEFAULT_AI_SETTINGS,
            providers: {
                openai: { enabled: true, api_key: 'sk-1', models: [] },
                gemini: { enabled: true, api_key: 'g-1', models: [] },
            },
        };

        const merged = mergeAiSettings(current, { providers: { openai: { enabled: false } } });

        expect(merged.providers.gemini).toEqual({ enabled: true, api_key: 'g-1', models: [] });
        expect(merged.providers.openai).toMatchObject({ enabled: false, api_key: 'sk-1' });
    });

    it('keeps existing api_key when the patch omits it', () => {
        const current = {
            ...DEFAULT_AI_SETTINGS,
            providers: {
                openai: { enabled: true, api_key: 'sk-keep', models: [] },
            },
        };

        const merged = mergeAiSettings(current, { providers: { openai: { models: [] } } });

        expect(merged.providers.openai?.api_key).toBe('sk-keep');
    });
});

describe('dedupeModelsById', () => {
    it('keeps the first occurrence of each id and preserves order', () => {
        const out = dedupeModelsById([{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }]);
        expect(out.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array unchanged', () => {
        expect(dedupeModelsById([])).toEqual([]);
    });
});

describe('dedupeSettingsModels', () => {
    it('removes duplicate model ids within each built-in and custom provider', () => {
        const settings: AiSettings = {
            ...DEFAULT_AI_SETTINGS,
            providers: {
                openai: { enabled: true, api_key: 'k', models: [model('gpt-4o'), model('gpt-4o'), model('o3')] },
            },
            custom_providers: {
                mine: { label: 'Mine', base_url: 'https://x/v1', enabled: true, api_key: 'k', models: [model('m'), model('m')] },
            },
        };

        const out = dedupeSettingsModels(settings);

        expect(out.providers.openai?.models.map((m) => m.id)).toEqual(['gpt-4o', 'o3']);
        expect(out.custom_providers.mine.models.map((m) => m.id)).toEqual(['m']);
    });
});
