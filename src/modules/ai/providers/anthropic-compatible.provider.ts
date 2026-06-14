/**
 * Anthropic-compatible provider (configurable base URL)
 * ======================================================
 * Generalizes the built-in Anthropic provider so custom gateways that speak
 * the Anthropic Messages protocol (e.g. OpenCode Zen `/anthropic`) work too.
 */

import type { AIProvider, IAIProvider, GenerateContentRequest, GenerateContentResponse } from '../types';
import { getSystemPrompt } from '../prompts';
import { normalizeOpenAiModels } from '../discovery/normalize';

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

export class AnthropicCompatibleProvider implements IAIProvider {
    readonly provider: AIProvider;
    private baseUrl: string;
    private apiKey: string;

    constructor(provider: AIProvider, baseUrl: string, apiKey: string) {
        this.provider = provider;
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }

    private url(path: string): string {
        return `${this.baseUrl}${path}`;
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.content_type, request.system_prompt);
        const model = request.model || 'claude-3-5-sonnet-latest';

        const body: {
            model: string;
            max_tokens: number;
            system: string;
            messages: Array<{ role: string; content: string }>;
            thinking?: { type: 'enabled'; budget_tokens: number };
        } = {
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                { role: 'user', content: request.prompt }
            ],
        };
        if (request.reasoning_effort) {
            const budgets = { low: 4096, medium: 8192, high: 16384 } as const;
            const budget_tokens = budgets[request.reasoning_effort];
            body.thinking = { type: 'enabled', budget_tokens };
            body.max_tokens = budget_tokens + 1024;
        }

        try {
            const response = await fetch(this.url('/v1/messages'), {
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
            const response = await fetch(this.url('/v1/messages'), {
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

    async listModels(apiKey: string) {
        try {
            const response = await fetch(this.url('/v1/models'), {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
            });
            if (!response.ok) return { supported: true, models: [] };
            return { supported: true, models: normalizeOpenAiModels(await response.json()) };
        } catch {
            return { supported: true, models: [] };
        }
    }
}
