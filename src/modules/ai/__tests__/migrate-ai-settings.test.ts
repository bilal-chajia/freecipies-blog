import { describe, expect, it } from 'vitest';
import { migrateAiSettingsBlob } from '../../../../scripts/migrate-ai-settings.mts';

describe('migrateAiSettingsBlob', () => {
    it('converts legacy camelCase blob to snake_case selection shape', () => {
        const legacy = {
            defaultProvider: 'openai',
            defaultModel: 'gpt-4o',
            temperature: 0.7,
            systemPrompt: 'sp',
            providers: {
                openai: {
                    apiKey: 'sk-1',
                    enabled: true,
                    availableModels: [
                        {
                            id: 'gpt-4o',
                            name: 'GPT-4o',
                            contextWindow: 131072,
                            maxTokens: 65536,
                            enabled: true,
                        },
                    ],
                },
            },
        };

        const out = migrateAiSettingsBlob(legacy);

        expect(out.default_provider).toBe('openai');
        expect(out.system_prompt).toBe('sp');
        expect(out.providers.openai?.api_key).toBe('sk-1');
        expect(out.providers.openai?.models[0]).toMatchObject({
            id: 'gpt-4o',
            context_window: 131072,
            max_tokens: 65536,
            modality: 'text',
            status: 'available',
            source: 'discovered',
            enabled: true,
        });
        expect(out.custom_providers).toEqual({});
    });
});
