/**
 * AI Module - Main Service
 * ========================
 * Factory and service for AI content generation.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
    AIProvider,
    AiSettings,
    BuiltInProvider,
    CustomProviderConfig,
    GenerateContentRequest,
    GenerateContentResponse,
    IAIProvider,
    ModelSelection,
    ProviderConfig,
} from './types';
import { ALL_PROVIDERS } from './types';
import { getAiSettings, saveAiSettings, type AiSettingsPatch } from './settings-store';
import {
    AnthropicProvider,
    DeepSeekProvider,
    GeminiProvider,
    MistralProvider,
    MoonshotProvider,
    OpenAICompatibleProvider,
    OpenAIProvider,
    OpenRouterProvider,
    QwenProvider,
    XAIProvider,
    ZhipuProvider,
} from './providers';

export { getAiSettings, saveAiSettings, replaceAiSettings } from './settings-store';
export type { AiSettingsPatch } from './settings-store';

export const getAISettings = getAiSettings;
export const saveAISettings = saveAiSettings;

function isBuiltInProvider(provider: AIProvider): provider is BuiltInProvider {
    return ALL_PROVIDERS.includes(provider as BuiltInProvider);
}

function getProviderConfig(
    settings: AiSettings,
    provider: AIProvider,
): (ProviderConfig | CustomProviderConfig) | undefined {
    if (isBuiltInProvider(provider)) {
        return settings.providers[provider] ?? settings.custom_providers[provider];
    }
    return settings.custom_providers[provider];
}

function getProviderBaseUrl(settings: AiSettings, provider: AIProvider): string | undefined {
    const custom = settings.custom_providers[provider];
    return custom?.base_url;
}

export function createProvider(provider: AIProvider, apiKey: string, baseUrl?: string): IAIProvider {
    switch (provider) {
        case 'gemini':
            return new GeminiProvider(apiKey);
        case 'openai':
            return new OpenAIProvider(apiKey);
        case 'anthropic':
            return new AnthropicProvider(apiKey);
        case 'deepseek':
            return new DeepSeekProvider(apiKey);
        case 'openrouter':
            return new OpenRouterProvider(apiKey);
        case 'qwen':
            return new QwenProvider(apiKey);
        case 'zhipu':
            return new ZhipuProvider(apiKey);
        case 'moonshot':
            return new MoonshotProvider(apiKey);
        case 'mistral':
            return new MistralProvider(apiKey);
        case 'xai':
            return new XAIProvider(apiKey);
        default:
            if (!baseUrl) throw new Error(`Unknown provider: ${provider}`);
            return new OpenAICompatibleProvider(provider, baseUrl, apiKey);
    }
}

export async function getConfiguredProviders(db: D1Database): Promise<AIProvider[]> {
    const settings = await getAiSettings(db);
    const configured: AIProvider[] = [];

    for (const provider of ALL_PROVIDERS) {
        const config = settings.providers[provider];
        if (config?.enabled && config.api_key) configured.push(provider);
    }

    for (const [provider, config] of Object.entries(settings.custom_providers)) {
        if (config.enabled && config.api_key) configured.push(provider);
    }

    return configured;
}

export async function getModelsForProvider(db: D1Database, provider: AIProvider): Promise<ModelSelection[]> {
    const settings = await getAiSettings(db);
    const config = getProviderConfig(settings, provider);
    return (config?.models ?? []).filter((model) => model.enabled && model.status !== 'unavailable');
}

export async function generateContent(
    db: D1Database,
    request: GenerateContentRequest,
): Promise<GenerateContentResponse> {
    const settings = await getAiSettings(db);
    const provider = request.provider || settings.default_provider;
    const config = getProviderConfig(settings, provider);

    if (!config?.api_key) {
        return {
            success: false,
            error: `No API key configured for provider: ${provider}`,
        };
    }

    if (!config.enabled) {
        return {
            success: false,
            error: `Provider is disabled: ${provider}`,
        };
    }

    const model = request.model || (provider === settings.default_provider ? settings.default_model : '');
    const aiProvider = createProvider(provider, config.api_key, getProviderBaseUrl(settings, provider));

    return aiProvider.generateContent({
        ...request,
        provider,
        model,
        temperature: request.temperature ?? settings.temperature,
        system_prompt: request.system_prompt || settings.system_prompt,
    });
}

export async function validateProviderApiKey(
    provider: AIProvider,
    apiKey: string,
    baseUrl?: string,
): Promise<boolean> {
    const aiProvider = createProvider(provider, apiKey, baseUrl);
    return aiProvider.validateApiKey(apiKey);
}

export async function patchAiSettings(db: D1Database, patch: AiSettingsPatch): Promise<boolean> {
    return saveAiSettings(db, patch);
}
