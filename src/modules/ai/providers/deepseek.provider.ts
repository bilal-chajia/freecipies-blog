/**
 * AI Provider - DeepSeek
 * ======================
 * Implementation for DeepSeek AI models (V3, R1).
 * API compatible with OpenAI format.
 */

import type { IAIProvider, GenerateContentRequest, GenerateContentResponse } from '../types';
import { getSystemPrompt } from '../prompts';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

interface DeepSeekResponse {
    id?: string;
    choices?: Array<{
        message?: {
            content?: string;
            reasoning_content?: string;
        };
        finish_reason?: string;
    }>;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
    error?: {
        message?: string;
        type?: string;
    };
}

export class DeepSeekProvider implements IAIProvider {
    readonly provider = 'deepseek' as const;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.contentType, request.systemPrompt);
        const model = request.model || 'deepseek-chat';

        const body = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: request.prompt }
            ],
            temperature: request.temperature ?? 0.7,
            max_tokens: 8192,
            response_format: { type: 'json_object' },
        };

        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
            });

            const data: DeepSeekResponse = await response.json();

            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'DeepSeek API error',
                };
            }

            const textContent = data.choices?.[0]?.message?.content;

            if (!textContent) {
                return {
                    success: false,
                    error: 'No content generated',
                };
            }

            const parsed = JSON.parse(textContent);

            return {
                success: true,
                data: parsed,
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `DeepSeek generation failed: ${message}`,
            };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 10,
                }),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
