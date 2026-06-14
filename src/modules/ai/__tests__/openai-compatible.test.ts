import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.provider';

afterEach(() => vi.restoreAllMocks());

describe('OpenAICompatibleProvider.listModels', () => {
    it('lists text models from a custom base_url', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ data: [{ id: 'custom-chat' }, { id: 'tts-x' }] }), {
                status: 200,
            }),
        );

        const provider = new OpenAICompatibleProvider('my-endpoint', 'https://api.example.com/v1', 'k');
        const out = await provider.listModels('k');

        expect(out.supported).toBe(true);
        expect(out.models.map((model) => model.id)).toEqual(['custom-chat']);
    });
});

describe('OpenAICompatibleProvider auth style', () => {
    it('sends Authorization: Bearer by default', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 }),
        );
        await new OpenAICompatibleProvider('p', 'https://api.example.com/v1', 'k').listModels('k');
        const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer k');
        expect(headers['api-key']).toBeUndefined();
    });

    it('sends the api-key header when auth_style is api_key', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ data: [] }), { status: 200 }),
        );
        await new OpenAICompatibleProvider('p', 'https://x.openai.azure.com/openai/v1', 'k', 'api_key').listModels('k');
        const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
        expect(headers['api-key']).toBe('k');
        expect(headers.Authorization).toBeUndefined();
    });
});
