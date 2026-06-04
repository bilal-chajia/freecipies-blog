import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from '../providers/openai.provider';

afterEach(() => vi.restoreAllMocks());

describe('OpenAIProvider reasoning_effort', () => {
    it('sends reasoning_effort when requested', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({
                choices: [{ message: { content: '{"label":"x","short_description":"y"}' } }],
                usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
            }), { status: 200 }),
        );

        const provider = new OpenAIProvider('sk-test');
        await provider.generateContent({
            prompt: 'make recipe',
            content_type: 'recipe',
            provider: 'openai',
            model: 'o3-mini',
            reasoning_effort: 'high',
        });

        const [, init] = vi.mocked(fetch).mock.calls[0];
        const body = JSON.parse(String(init?.body)) as { reasoning_effort?: string };
        expect(body.reasoning_effort).toBe('high');
    });
});
