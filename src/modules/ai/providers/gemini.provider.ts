/**
 * AI Provider - Google Gemini
 * ===========================
 * Implementation for Google's Gemini AI models.
 */

import type { IAIProvider, GenerateContentRequest, GenerateContentResponse } from '../types';
import { getSystemPrompt } from '../prompts';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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

export class GeminiProvider implements IAIProvider {
    readonly provider = 'gemini' as const;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.contentType, request.systemPrompt);
        const model = request.model || 'gemini-1.5-flash';

        const url = `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`;

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
            const url = `${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
}
