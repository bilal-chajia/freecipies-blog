/**
 * AI Provider - Gemini-compatible (base-URL configurable)
 * ========================================================
 * Generalizes the built-in Gemini provider to any base URL exposing the
 * `v1beta` Gemini API surface. The API key travels in the `?key=` query
 * param, so `auth_style` does not apply to this protocol.
 */

import type { AIProvider, IAIProvider, GenerateContentRequest, GenerateContentResponse, ListModelsResult } from '../types';
import { getSystemPrompt } from '../prompts';
import { classifyModality, detectThinking } from '../discovery/normalize';

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
        finishReason?: string;
    }>;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
    error?: {
        message?: string;
        code?: number;
    };
}

export class GeminiCompatibleProvider implements IAIProvider {
    readonly provider: AIProvider;
    private apiKey: string;
    private baseUrl: string;

    constructor(provider: AIProvider, baseUrl: string, apiKey: string) {
        this.provider = provider;
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.content_type, request.system_prompt);
        const model = request.model || 'gemini-1.5-flash';

        const url = `${this.baseUrl}/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `${systemPrompt}\n\nUser request: ${request.prompt}` }
                    ]
                }
            ],
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
            },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data: GeminiResponse = await response.json();

            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'Gemini API error',
                };
            }

            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textContent) {
                return {
                    success: false,
                    error: 'No content generated',
                };
            }

            // Parse the JSON response
            const parsed = JSON.parse(textContent);

            return {
                success: true,
                data: parsed,
                usage: {
                    promptTokens: data.usageMetadata?.promptTokenCount || 0,
                    completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: data.usageMetadata?.totalTokenCount || 0,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Gemini generation failed: ${message}`,
            };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const url = `${this.baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                    generationConfig: { maxOutputTokens: 10 },
                }),
            });
            const data: GeminiResponse = await response.json();
            return !data.error;
        } catch {
            return false;
        }
    }

    async listModels(apiKey: string): Promise<ListModelsResult> {
        try {
            const response = await fetch(`${this.baseUrl}/v1beta/models?key=${apiKey}`);
            if (!response.ok) return { supported: true, models: [] };
            const raw = await response.json() as { models?: Array<{ name?: string }> };
            const models = (raw.models ?? [])
                .map((model) => (model.name ?? '').replace(/^models\//, ''))
                .filter((id): id is string => id.length > 0)
                .map((id) => ({
                    id,
                    modality: classifyModality(id),
                    supports_thinking: detectThinking(id),
                }))
                .filter((model) => model.modality === 'text');
            return { supported: true, models };
        } catch {
            return { supported: true, models: [] };
        }
    }
}
