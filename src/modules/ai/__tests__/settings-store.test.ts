import { describe, expect, it } from 'vitest';
import { mergeAiSettings } from '../settings-store';
import { DEFAULT_AI_SETTINGS } from '../types';

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
