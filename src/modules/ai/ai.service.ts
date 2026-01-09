/**
 * AI Module - Main Service
 * ========================
 * Factory and service for AI content generation.
 * Supports 10 providers: Gemini, OpenAI, Anthropic, DeepSeek, OpenRouter, Qwen, Zhipu, Moonshot, Mistral, xAI.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
    AIProvider,
    AISettings,
    GenerateContentRequest,
    GenerateContentResponse,
    IAIProvider
} from './types';
import { DEFAULT_AI_SETTINGS, AVAILABLE_MODELS, ALL_PROVIDERS } from './types';
import {
    GeminiProvider,
    OpenAIProvider,
    AnthropicProvider,
    DeepSeekProvider,
    OpenRouterProvider,
    QwenProvider,
    ZhipuProvider,
    MoonshotProvider,
    MistralProvider,
    XAIProvider,
} from './providers';

const AI_SETTINGS_KEY = 'ai_settings';

/**
 * Get AI settings from database
 */
export async function getAISettings(db: D1Database): Promise<AISettings> {
    try {
        const result = await db
            .prepare('SELECT value FROM site_settings WHERE key = ?')
            .bind(AI_SETTINGS_KEY)
            .first<{ value: string }>();

        if (result?.value) {
            const parsed = JSON.parse(result.value);
            return { ...DEFAULT_AI_SETTINGS, ...parsed };
        }
    } catch (error) {
        console.error('Failed to load AI settings:', error);
    }

    return DEFAULT_AI_SETTINGS;
}

/**
 * Save AI settings to database
 */
export async function saveAISettings(db: D1Database, settings: Partial<AISettings>): Promise<boolean> {
    try {
        const current = await getAISettings(db);
        const merged = { ...current, ...settings };
        const value = JSON.stringify(merged);

        await db
            .prepare(`
        INSERT INTO site_settings (key, value, category, type, updated_at)
        VALUES (?, ?, 'ai', 'json', CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `)
            .bind(AI_SETTINGS_KEY, value)
            .run();

        return true;
    } catch (error) {
        console.error('Failed to save AI settings:', error);
        return false;
    }
}

/**
 * Create AI provider instance based on provider type and API key
 */
export function createProvider(provider: AIProvider, apiKey: string): IAIProvider {
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
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Get list of configured (enabled with API key) providers
 */
export async function getConfiguredProviders(db: D1Database): Promise<AIProvider[]> {
    const settings = await getAISettings(db);
    const configured: AIProvider[] = [];

    for (const provider of ALL_PROVIDERS) {
        const config = settings.providers?.[provider];
        if (config?.enabled && config.apiKey) {
            configured.push(provider);
        }
    }

    return configured;
}

/**
 * Get available models for a provider from database settings
 * Falls back to hardcoded AVAILABLE_MODELS if not found in settings
 */
export async function getModelsForProvider(db: D1Database, provider: AIProvider) {
    try {
        const settings = await getAISettings(db);
        const providerConfig = settings.providers?.[provider];

        // Return models from database if available
        if (providerConfig?.availableModels && Array.isArray(providerConfig.availableModels)) {
            // Filter to only enabled models
            return providerConfig.availableModels.filter(m => m.enabled !== false);
        }
    } catch (error) {
        console.error(`Failed to load models for ${provider}:`, error);
    }

    // Fallback to hardcoded models
    return AVAILABLE_MODELS[provider] || [];
}

/**
 * Generate content using the specified provider
 */
export async function generateContent(
    db: D1Database,
    request: GenerateContentRequest
): Promise<GenerateContentResponse> {
    const settings = await getAISettings(db);
    const provider = request.provider || settings.defaultProvider;
    const providerConfig = settings.providers?.[provider];

    if (!providerConfig?.apiKey) {
        return {
            success: false,
            error: `No API key configured for provider: ${provider}`,
        };
    }

    if (!providerConfig.enabled) {
        return {
            success: false,
            error: `Provider is disabled: ${provider}`,
        };
    }

    const aiProvider = createProvider(provider, providerConfig.apiKey);

    // Use request model or fall back to default
    const model = request.model || (provider === settings.defaultProvider ? settings.defaultModel : undefined);

    return aiProvider.generateContent({
        ...request,
        model: model || request.model,
        temperature: request.temperature ?? settings.temperature,
        systemPrompt: request.systemPrompt || settings.systemPrompt,
    });
}

/**
 * Validate an API key for a specific provider
 */
export async function validateProviderApiKey(
    provider: AIProvider,
    apiKey: string
): Promise<boolean> {
    const aiProvider = createProvider(provider, apiKey);
    return aiProvider.validateApiKey(apiKey);
}
