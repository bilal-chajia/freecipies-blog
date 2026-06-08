import { describe, expect, it } from 'vitest';
import { maskApiKey, stripApiKeys } from '../api-key';

describe('maskApiKey', () => {
    it('masks all but the last 4 chars', () => {
        expect(maskApiKey('sk-abcdef1234')).toBe('••••1234');
    });

    it('returns empty string for empty/undefined', () => {
        expect(maskApiKey('')).toBe('');
        expect(maskApiKey(undefined)).toBe('');
    });
});

describe('stripApiKeys', () => {
    it('replaces api_key with has_api_key + masked across providers and custom_providers', () => {
        const out = stripApiKeys({
            default_provider: 'openai',
            default_model: 'm',
            temperature: 0.7,
            system_prompt: 's',
            providers: {
                openai: { enabled: true, api_key: 'sk-xxxx9999', models: [] },
            },
            custom_providers: {
                c1: { label: 'C', base_url: 'https://example.com/v1', enabled: true, api_key: 'k-1111', models: [] },
            },
        });

        expect(out.providers.openai).toMatchObject({ has_api_key: true, api_key_masked: '••••9999' });
        expect('api_key' in out.providers.openai).toBe(false);
        expect(out.custom_providers.c1).toMatchObject({ has_api_key: true, api_key_masked: '••••1111' });
        expect('api_key' in out.custom_providers.c1).toBe(false);
    });
});
