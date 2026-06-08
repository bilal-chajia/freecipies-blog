import { describe, expect, it } from 'vitest';
import { classifyModality, detectThinking, normalizeOpenAiModels } from '../discovery/normalize';

describe('classifyModality', () => {
    it('classifies known non-text ids', () => {
        expect(classifyModality('dall-e-3')).toBe('image');
        expect(classifyModality('gpt-image-1')).toBe('image');
        expect(classifyModality('tts-1')).toBe('audio');
        expect(classifyModality('text-embedding-3-large')).toBe('embedding');
        expect(classifyModality('gpt-5.1-chat-latest')).toBe('text');
    });
});

describe('detectThinking', () => {
    it('flags reasoning model ids', () => {
        expect(detectThinking('o3-mini')).toBe(true);
        expect(detectThinking('deepseek-reasoner')).toBe(true);
        expect(detectThinking('gpt-4o')).toBe(false);
    });
});

describe('normalizeOpenAiModels', () => {
    it('maps an OpenAI /v1/models list to text-only DiscoveredModel[]', () => {
        const raw = { data: [{ id: 'gpt-5.1-chat-latest' }, { id: 'dall-e-3' }, { id: 'tts-1' }] };
        const models = normalizeOpenAiModels(raw);

        expect(models.map((m) => m.id)).toEqual(['gpt-5.1-chat-latest']);
        expect(models[0]).toMatchObject({
            id: 'gpt-5.1-chat-latest',
            modality: 'text',
            supports_thinking: false,
        });
    });
});
