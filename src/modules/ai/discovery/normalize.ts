import type { DiscoveredModel, ModelModality } from '../types';

const IMAGE_RE = /(dall-e|gpt-image|imagen|stable-diffusion|flux)/i;
const AUDIO_RE = /(tts|whisper|audio|speech|voice)/i;
const EMBED_RE = /(embedding|embed|rerank)/i;
const THINK_RE = /(^o\d|reason|thinking|-r1\b|deepseek-reasoner)/i;

export function classifyModality(id: string): ModelModality {
    if (IMAGE_RE.test(id)) return 'image';
    if (AUDIO_RE.test(id)) return 'audio';
    if (EMBED_RE.test(id)) return 'embedding';
    return 'text';
}

export function detectThinking(id: string): boolean {
    return THINK_RE.test(id);
}

/** Normalize an OpenAI-compatible `{ data: [{ id }] }` models response to text-only models. */
export function normalizeOpenAiModels(raw: unknown): DiscoveredModel[] {
    const data = (raw as { data?: Array<{ id?: string }> })?.data ?? [];
    return data
        .map((model) => model.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .map((id) => ({
            id,
            modality: classifyModality(id),
            supports_thinking: detectThinking(id),
        }))
        .filter((model) => model.modality === 'text');
}
