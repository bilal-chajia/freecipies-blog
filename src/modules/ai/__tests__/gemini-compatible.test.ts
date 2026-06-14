import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeminiCompatibleProvider } from '../providers/gemini-compatible.provider';

afterEach(() => vi.restoreAllMocks());

describe('GeminiCompatibleProvider', () => {
  it('lists models from {base}/v1beta/models?key= and strips the models/ prefix', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: 'models/gemini-3-flash' }, { name: 'models/dall-e' }] }), { status: 200 }),
    );
    const out = await new GeminiCompatibleProvider('g', 'https://generativelanguage.googleapis.com', 'k').listModels('k');
    expect(spy.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models?key=k');
    expect(out.models.map((m) => m.id)).toEqual(['gemini-3-flash']);
  });
});
