import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnthropicCompatibleProvider } from '../providers/anthropic-compatible.provider';

afterEach(() => vi.restoreAllMocks());

describe('AnthropicCompatibleProvider', () => {
    it('lists models from {base}/v1/models with x-api-key', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ data: [{ id: 'claude-x' }, { id: 'tts-y' }] }), { status: 200 }),
        );
        const out = await new AnthropicCompatibleProvider('zen', 'https://opencode.ai/anthropic', 'k').listModels('k');
        expect(spy.mock.calls[0][0]).toBe('https://opencode.ai/anthropic/v1/models');
        const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
        expect(headers['x-api-key']).toBe('k');
        expect(out.models.map((m) => m.id)).toEqual(['claude-x']);
    });
});
