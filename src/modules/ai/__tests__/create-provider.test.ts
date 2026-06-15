import { describe, it, expect } from 'vitest';
import { createProvider } from '../ai.service';
import type { AIProvider } from '../types';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.provider';
import { AnthropicCompatibleProvider } from '../providers/anthropic-compatible.provider';
import { GeminiCompatibleProvider } from '../providers/gemini-compatible.provider';

describe('createProvider custom routing by api_format', () => {
    it('routes openai (default) to OpenAICompatibleProvider', () => {
        const p = createProvider('my-zen' as AIProvider, 'k', 'https://opencode.ai/zen/v1');
        expect(p).toBeInstanceOf(OpenAICompatibleProvider);
        expect(p.provider).toBe('my-zen');
    });

    it('routes anthropic to AnthropicCompatibleProvider', () => {
        const p = createProvider('my-zen' as AIProvider, 'k', 'https://opencode.ai/anthropic', { apiFormat: 'anthropic' });
        expect(p).toBeInstanceOf(AnthropicCompatibleProvider);
    });

    it('routes gemini to GeminiCompatibleProvider', () => {
        const p = createProvider('my-g' as AIProvider, 'k', 'https://host', { apiFormat: 'gemini' });
        expect(p).toBeInstanceOf(GeminiCompatibleProvider);
    });

    it('throws for an unknown provider without a baseUrl', () => {
        expect(() => createProvider('mystery' as AIProvider, 'k')).toThrow();
    });
});
