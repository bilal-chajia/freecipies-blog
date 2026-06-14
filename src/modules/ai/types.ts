/**
 * AI Module - Types and Interfaces
 * =================================
 * Common types used across all AI providers.
 */

/** Built-in provider id, or a custom OpenAI-compatible provider id (slug). */
export type BuiltInProvider =
    | 'gemini'
    | 'openai'
    | 'anthropic'
    | 'deepseek'
    | 'openrouter'
    | 'qwen'
    | 'zhipu'
    | 'moonshot'
    | 'mistral'
    | 'xai';

/** Supported AI providers */
export type AIProvider = BuiltInProvider | (string & {});

/** Ordered list for UI consumption */
export const ALL_PROVIDERS: BuiltInProvider[] = [
    'gemini',
    'openai',
    'anthropic',
    'deepseek',
    'openrouter',
    'qwen',
    'zhipu',
    'moonshot',
    'mistral',
    'xai',
];

export type ModelModality = 'text' | 'image' | 'audio' | 'embedding' | 'other';
export type ModelStatus = 'available' | 'unavailable' | 'deprecated';

export type ApiFormat = 'openai' | 'anthropic' | 'gemini';
export type AuthStyle = 'bearer' | 'api_key';

/** A model the provider currently offers (discovery output). */
export interface DiscoveredModel {
    id: string;
    name?: string;
    context_window?: number;
    max_tokens?: number;
    modality: ModelModality;
    supports_thinking?: boolean;
    deprecated?: boolean;
}

/** A model the admin has curated into the stored selection. */
export interface ModelSelection {
    id: string;
    name?: string;
    context_window?: number;
    max_tokens?: number;
    modality: ModelModality;
    supports_thinking?: boolean;
    enabled: boolean;
    order: number;
    deprecated?: boolean;
    status: ModelStatus;
    source: 'discovered' | 'manual';
}

export interface ProviderConfig {
    enabled: boolean;
    api_key: string;
    models: ModelSelection[];
}

export interface CustomProviderConfig extends ProviderConfig {
    label: string;
    base_url: string;
    /** Wire protocol for this custom endpoint. Default 'openai'. */
    api_format?: ApiFormat;
    /** Auth header style (openai format only). Default 'bearer'. */
    auth_style?: AuthStyle;
}

/** AI settings stored in database */
export interface AiSettings {
    default_provider: AIProvider;
    default_model: string;
    temperature: number;
    system_prompt: string;
    providers: Partial<Record<BuiltInProvider, ProviderConfig>>;
    custom_providers: Record<string, CustomProviderConfig>;
}

/** Provider display info */
export const PROVIDER_INFO: Record<BuiltInProvider, { name: string; icon: string; docsUrl: string }> = {
    gemini: { name: 'Google Gemini', icon: '✨', docsUrl: 'https://aistudio.google.com/apikey' },
    openai: { name: 'OpenAI', icon: '🤖', docsUrl: 'https://platform.openai.com/api-keys' },
    anthropic: { name: 'Anthropic Claude', icon: '🧠', docsUrl: 'https://console.anthropic.com/settings/keys' },
    deepseek: { name: 'DeepSeek', icon: '🔭', docsUrl: 'https://platform.deepseek.com/api_keys' },
    openrouter: { name: 'OpenRouter', icon: '🌐', docsUrl: 'https://openrouter.ai/keys' },
    qwen: { name: 'Alibaba Qwen', icon: '☁️', docsUrl: 'https://dashscope.console.aliyun.com/apiKey' },
    zhipu: { name: 'Zhipu GLM', icon: '🧊', docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys' },
    moonshot: { name: 'Moonshot Kimi', icon: '🌙', docsUrl: 'https://platform.moonshot.cn/console/api-keys' },
    mistral: { name: 'Mistral AI', icon: '🌀', docsUrl: 'https://console.mistral.ai/api-keys' },
    xai: { name: 'xAI Grok', icon: '⚡', docsUrl: 'https://console.x.ai' },
};

/** Content generation request */
export interface GenerateContentRequest {
    prompt: string;
    content_type: 'recipe' | 'article' | 'roundup';
    provider: AIProvider;
    model: string;
    temperature?: number;
    system_prompt?: string;
    reasoning_effort?: 'low' | 'medium' | 'high';
}

/** Generated recipe data */
export interface GeneratedRecipe {
    servings: string;
    prepTime: string;
    cookTime: string;
    totalTime?: string;
    difficulty?: string;
    ingredients: Array<{
        groupName: string;
        items: string[];
    }>;
    instructions: Array<{
        groupName: string;
        items: string[];
    }>;
    nutrition?: {
        calories?: string;
        protein?: string;
        carbs?: string;
        fat?: string;
    };
}

/** Generated content response */
export interface GeneratedContent {
    label: string;
    headline?: string;
    short_description: string;
    metaTitle?: string;
    metaDescription?: string;
    recipe?: GeneratedRecipe;
    blocks?: Array<{
        type: string;
        props?: Record<string, unknown>;
        content?: unknown;
    }>;
}

/** Content generation response */
export interface GenerateContentResponse {
    success: boolean;
    data?: GeneratedContent;
    error?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface ListModelsResult {
    supported: boolean;
    models: DiscoveredModel[];
}

/** AI provider interface - all providers must implement this */
export interface IAIProvider {
    readonly provider: AIProvider;
    generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
    validateApiKey(apiKey: string): Promise<boolean>;
    listModels(apiKey: string): Promise<ListModelsResult>;
}

/** Default AI settings */
export const DEFAULT_AI_SETTINGS: AiSettings = {
    default_provider: 'gemini',
    default_model: 'gemini-3-flash-preview',
    temperature: 0.7,
    system_prompt: `You are an expert culinary content creator. Generate structured recipe and article content in JSON format.
Always respond with valid JSON that matches the expected schema.
Be creative, detailed, and provide practical cooking tips.`,
    providers: {},
    custom_providers: {},
};
