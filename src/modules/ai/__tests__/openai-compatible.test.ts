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
