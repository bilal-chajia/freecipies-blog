/**
 * AI Provider - OpenAI
 * ====================
 * Implementation for OpenAI's GPT models.
 */

import type { IAIProvider, GenerateContentRequest, GenerateContentResponse } from '../types';
import { getSystemPrompt } from '../prompts';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIResponse {
    id?: string;
    choices?: Array<{
        message?: {
            content?: string;
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

export class OpenAIProvider implements IAIProvider {
    readonly provider = 'openai' as const;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.contentType, request.systemPrompt);
        const model = request.model || 'gpt-4o-mini';

        const body = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: request.prompt }
            ],
            temperature: request.temperature ?? 0.7,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
        };

        try {
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
            });

            const data: OpenAIResponse = await response.json();

            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'OpenAI API error',
                };
            }

            const textContent = data.choices?.[0]?.message?.content;

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
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `OpenAI generation failed: ${message}`,
            };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
