/**
 * AI Provider - Alibaba Qwen
 * ==========================
 * Implementation for Alibaba Cloud Qwen models.
 * Uses DashScope API.
 */

import type { IAIProvider, GenerateContentRequest, GenerateContentResponse } from '../types';
import { getSystemPrompt } from '../prompts';

const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

interface QwenResponse {
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
        code?: string;
    };
}

export class QwenProvider implements IAIProvider {
    readonly provider = 'qwen' as const;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.contentType, request.systemPrompt);
        const model = request.model || 'qwen-plus';

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
            const response = await fetch(QWEN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
            });

            const data: QwenResponse = await response.json();

            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'Qwen API error',
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
                error: `Qwen generation failed: ${message}`,
            };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch(QWEN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'qwen-turbo',
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
