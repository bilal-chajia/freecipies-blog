/**
 * AI Provider - Moonshot Kimi
 * ===========================
 * Implementation for Moonshot AI Kimi models.
 * Uses Moonshot API (OpenAI-compatible).
 */

import type { IAIProvider, GenerateContentRequest, GenerateContentResponse } from '../types';
import { getSystemPrompt } from '../prompts';

const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

interface MoonshotResponse {
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

export class MoonshotProvider implements IAIProvider {
    readonly provider = 'moonshot' as const;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.contentType, request.systemPrompt);
        const model = request.model || 'moonshot-v1-auto';

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
            const response = await fetch(MOONSHOT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
            });

            const data: MoonshotResponse = await response.json();

            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'Moonshot API error',
                };
            }

            const textContent = data.choices?.[0]?.message?.content;

            if (!textContent) {
                return {
                    success: false,
                    error: 'No content generated',
                };
            }

            // Try to extract JSON if wrapped in code blocks
            let jsonContent = textContent;
            const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonContent);

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
                error: `Moonshot generation failed: ${message}`,
            };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch('https://api.moonshot.cn/v1/models', {
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
