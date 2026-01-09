/**
 * AI Provider - Anthropic Claude
 * ===============================
 * Implementation for Anthropic's Claude models.
 */

import type { IAIProvider, GenerateContentRequest, GenerateContentResponse } from '../types';
import { getSystemPrompt } from '../prompts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicResponse {
    id?: string;
    content?: Array<{
        type: string;
        text?: string;
    }>;
    stop_reason?: string;
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
    error?: {
        type?: string;
        message?: string;
    };
}

export class AnthropicProvider implements IAIProvider {
    readonly provider = 'anthropic' as const;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.contentType, request.systemPrompt);
        const model = request.model || 'claude-3-5-sonnet-latest';

        const body = {
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                { role: 'user', content: request.prompt }
            ],
        };

        try {
            const response = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify(body),
            });

            const data: AnthropicResponse = await response.json();

            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'Anthropic API error',
                };
            }

            const textContent = data.content?.find(c => c.type === 'text')?.text;

            if (!textContent) {
                return {
                    success: false,
                    error: 'No content generated',
                };
            }

            // Claude may include markdown code blocks, try to extract JSON
            let jsonContent = textContent;
            const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1].trim();
            }

            // Parse the JSON response
            const parsed = JSON.parse(jsonContent);

            return {
                success: true,
                data: parsed,
                usage: {
                    promptTokens: data.usage?.input_tokens || 0,
                    completionTokens: data.usage?.output_tokens || 0,
                    totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Anthropic generation failed: ${message}`,
            };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }],
                }),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
