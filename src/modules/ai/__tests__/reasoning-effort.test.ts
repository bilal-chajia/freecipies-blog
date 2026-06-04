import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnthropicProvider } from '../providers/anthropic.provider';
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

describe('AnthropicProvider reasoning_effort', () => {
    it('sets max_tokens above the thinking budget', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({
                content: [{ type: 'text', text: '{"label":"x","short_description":"y"}' }],
                usage: { input_tokens: 1, output_tokens: 2 },
            }), { status: 200 }),
        );

        const provider = new AnthropicProvider('sk-test');
        await provider.generateContent({
            prompt: 'make recipe',
            content_type: 'recipe',
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            reasoning_effort: 'high',
        });

        const [, init] = vi.mocked(fetch).mock.calls[0];
        const body = JSON.parse(String(init?.body)) as {
            max_tokens: number;
            thinking?: { budget_tokens: number };
        };

        expect(body.thinking?.budget_tokens).toBe(16384);
        expect(body.max_tokens).toBeGreaterThan(body.thinking?.budget_tokens ?? 0);
    });
});
