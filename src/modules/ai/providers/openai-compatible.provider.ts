import type {
    AIProvider,
    AuthStyle,
    DiscoveredModel,
    GenerateContentRequest,
    GenerateContentResponse,
    IAIProvider,
} from '../types';
import { normalizeOpenAiModels } from '../discovery/normalize';
import { getSystemPrompt } from '../prompts';

interface OpenAICompatibleResponse {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
}

export class OpenAICompatibleProvider implements IAIProvider {
    readonly provider: AIProvider;

    constructor(
        provider: string,
        private baseUrl: string,
        private apiKey: string,
        private authStyle: AuthStyle = 'bearer',
    ) {
        this.provider = provider;
    }

    private url(path: string): string {
        return `${this.baseUrl.replace(/\/$/, '')}${path}`;
    }

    private authHeaders(key: string): Record<string, string> {
        return this.authStyle === 'api_key'
            ? { 'api-key': key }
            : { Authorization: `Bearer ${key}` };
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.content_type, request.system_prompt);

        try {
            const body: {
                model: string;
                messages: Array<{ role: string; content: string }>;
                temperature: number;
                response_format: { type: 'json_object' };
                reasoning_effort?: 'low' | 'medium' | 'high';
            } = {
                model: request.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: request.prompt },
                ],
                temperature: request.temperature ?? 0.7,
                response_format: { type: 'json_object' },
            };
            if (request.reasoning_effort) {
                body.reasoning_effort = request.reasoning_effort;
            }

            const response = await fetch(this.url('/chat/completions'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.authHeaders(this.apiKey),
                },
                body: JSON.stringify(body),
            });

            const data = await response.json() as OpenAICompatibleResponse;
            if (data.error) return { success: false, error: data.error.message || 'Provider error' };

            const text = data.choices?.[0]?.message?.content;
            if (!text) return { success: false, error: 'No content generated' };

            return { success: true, data: JSON.parse(text) };
        } catch (error) {
            return {
                success: false,
                error: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            return (await fetch(this.url('/models'), {
                headers: this.authHeaders(apiKey),
            })).ok;
        } catch {
            return false;
        }
    }

    async listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
        try {
            const response = await fetch(this.url('/models'), {
                headers: this.authHeaders(apiKey),
            });
            if (!response.ok) return { supported: true, models: [] };
            return { supported: true, models: normalizeOpenAiModels(await response.json()) };
        } catch {
            return { supported: true, models: [] };
        }
    }
}
