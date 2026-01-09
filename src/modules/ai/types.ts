/**
 * AI Module - Types and Interfaces
 * =================================
 * Common types used across all AI providers.
 * Updated January 2026 with latest models.
 */

/** Supported AI providers */
export type AIProvider =
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

/** Ordered list for UI consumption */
export const ALL_PROVIDERS: AIProvider[] = [
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

/** AI model configuration */
export interface AIModel {
    id: string;
    name: string;
    provider: AIProvider;
    description?: string;
    maxTokens?: number;
    contextWindow?: number;
    enabled?: boolean;      // For enabling/disabling models in UI
    deprecated?: boolean;   // Mark models as deprecated
    order?: number;        // For custom sorting in UI
}

/** Available models by provider - January 2026 */
/** @deprecated Use models from site_settings instead. This is kept as fallback only. */
export const AVAILABLE_MODELS: Record<AIProvider, AIModel[]> = {
    gemini: [
        { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'gemini', description: 'Most powerful (Nov 2025)', contextWindow: 1048576, maxTokens: 65536 },
        { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'gemini', description: 'Default model (Nov 2025)', contextWindow: 1048576, maxTokens: 65536 },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini', description: 'Stable, 1M context', contextWindow: 1048576, maxTokens: 65536 },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', description: 'Fast & affordable', contextWindow: 1048576, maxTokens: 65536 },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'gemini', description: 'Lightweight', contextWindow: 1048576, maxTokens: 65536 },
    ],
    openai: [
        { id: 'gpt-5.1-chat-latest', name: 'GPT-5.1 Chat', provider: 'openai', description: 'Latest flagship (replaces GPT-4o)', contextWindow: 131072, maxTokens: 65536 },
        { id: 'o3-pro', name: 'o3 Pro', provider: 'openai', description: 'Highest performance reasoning', contextWindow: 131072, maxTokens: 65536 },
        { id: 'o3', name: 'o3', provider: 'openai', description: 'Deep reasoning', contextWindow: 131072, maxTokens: 65536 },
        { id: 'o3-mini', name: 'o3-mini', provider: 'openai', description: 'Fast reasoning', contextWindow: 65536, maxTokens: 8192 },
        { id: 'o4-mini', name: 'o4-mini', provider: 'openai', description: 'Cost-efficient reasoning', contextWindow: 65536, maxTokens: 8192 },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Multimodal (DEPRECATED Feb 17, 2026)', contextWindow: 131072, maxTokens: 65536 },
    ],
    anthropic: [
        { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', provider: 'anthropic', description: 'Premium, max intelligence', contextWindow: 131072, maxTokens: 65536 },
        { id: 'claude-opus-4-5', name: 'Claude Opus 4.5 (latest)', provider: 'anthropic', description: 'Premium, max intelligence', contextWindow: 131072, maxTokens: 65536 },
        { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic', description: 'High-performance extended thinking', contextWindow: 131072, maxTokens: 65536 },
        { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (latest)', provider: 'anthropic', description: 'High-performance extended thinking', contextWindow: 131072, maxTokens: 65536 },
        { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', provider: 'anthropic', description: 'Early extended thinking', contextWindow: 131072, maxTokens: 65536 },
        { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', description: 'Fast, compact, hybrid', contextWindow: 65536, maxTokens: 16384 },
        { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', provider: 'anthropic', description: 'Fastest compact model', contextWindow: 65536, maxTokens: 16384 },
        { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', provider: 'anthropic', description: 'Previous premium', contextWindow: 131072, maxTokens: 32768 },
    ],
    deepseek: [
        { id: 'deepseek-chat', name: 'DeepSeek V3.2', provider: 'deepseek', description: 'Latest chat model (Dec 2025)', contextWindow: 131072, maxTokens: 32768 },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', description: 'Chain-of-thought reasoning', contextWindow: 131072, maxTokens: 32768 },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek', description: 'Coding specialist', contextWindow: 65536, maxTokens: 16384 },
    ],
    openrouter: [
        { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 131072, maxTokens: 65536 },
        { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 131072, maxTokens: 65536 },
        { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 262144, maxTokens: 65536 },
        { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 262144, maxTokens: 131072 },
        { id: 'openai/o3', name: 'o3', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 131072, maxTokens: 65536 },
        { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 131072, maxTokens: 65536 },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3.2', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 131072, maxTokens: 32768 },
        { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 131072, maxTokens: 65536 },
        { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 262144, maxTokens: 65536 },
        { id: 'mistralai/mistral-large-3', name: 'Mistral Large 3', provider: 'openrouter', description: 'Via OpenRouter', contextWindow: 262144, maxTokens: 65536 },
    ],
    qwen: [
        { id: 'qwen3-max', name: 'Qwen3 Max', provider: 'qwen', description: '1T+ params (Sep 2025)', contextWindow: 524288, maxTokens: 131072 },
        { id: 'qwen-max', name: 'Qwen Max', provider: 'qwen', description: 'Most powerful', contextWindow: 262144, maxTokens: 65536 },
        { id: 'qwen-plus', name: 'Qwen Plus', provider: 'qwen', description: 'Balanced, 1M context', contextWindow: 196608, maxTokens: 65536 },
        { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'qwen', description: 'Fast & efficient', contextWindow: 131072, maxTokens: 32768 },
        { id: 'qwen3-235b-a22b', name: 'Qwen3 235B', provider: 'qwen', description: '235B parameters', contextWindow: 131072, maxTokens: 65536 },
    ],
    zhipu: [
        { id: 'glm-4.7', name: 'GLM-4.7', provider: 'zhipu', description: 'Latest (Dec 2025)', contextWindow: 131072, maxTokens: 32768 },
        { id: 'glm-4.6', name: 'GLM-4.6', provider: 'zhipu', description: 'Enhanced coding (Sep 2025)', contextWindow: 131072, maxTokens: 32768 },
        { id: 'glm-4.5', name: 'GLM-4.5', provider: 'zhipu', description: '355B MoE', contextWindow: 131072, maxTokens: 32768 },
        { id: 'glm-4.5-air', name: 'GLM-4.5 Air', provider: 'zhipu', description: 'Lighter version', contextWindow: 65536, maxTokens: 16384 },
        { id: 'glm-4.5v', name: 'GLM-4.5V', provider: 'zhipu', description: 'Vision model (Aug 2025)', contextWindow: 65536, maxTokens: 16384 },
    ],
    moonshot: [
        { id: 'kimi-k2-instruct', name: 'Kimi K2', provider: 'moonshot', description: '1T params, 256K context', contextWindow: 262144, maxTokens: 131072 },
        { id: 'kimi-k2-thinking', name: 'Kimi K2 Thinking', provider: 'moonshot', description: 'Advanced reasoning (Nov 2025)', contextWindow: 262144, maxTokens: 131072 },
        { id: 'moonshot-v1-auto', name: 'Moonshot V1 Auto', provider: 'moonshot', description: 'Auto context selection', contextWindow: 196608, maxTokens: 65536 },
        { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K', provider: 'moonshot', description: '128K context', contextWindow: 131072, maxTokens: 65536 },
    ],
    mistral: [
        { id: 'mistral-large-latest', name: 'Mistral Large 3', provider: 'mistral', description: 'Latest flagship (Dec 2025)', contextWindow: 262144, maxTokens: 65536 },
        { id: 'mistral-medium-latest', name: 'Mistral Medium 3.1', provider: 'mistral', description: 'Balanced model', contextWindow: 131072, maxTokens: 32768 },
        { id: 'mistral-small-latest', name: 'Mistral Small 3.2', provider: 'mistral', description: 'Fast, cost-optimized', contextWindow: 65536, maxTokens: 16384 },
        { id: 'ministral-14b-latest', name: 'Ministral 3 14B', provider: 'mistral', description: 'Edge/throughput tier', contextWindow: 131072, maxTokens: 32768 },
        { id: 'ministral-8b-latest', name: 'Ministral 3 8B', provider: 'mistral', description: 'Fast & efficient', contextWindow: 131072, maxTokens: 32768 },
        { id: 'ministral-3b-latest', name: 'Ministral 3 3B', provider: 'mistral', description: 'Lightweight', contextWindow: 65536, maxTokens: 8192 },
        { id: 'codestral-latest', name: 'Codestral', provider: 'mistral', description: 'Code generation', contextWindow: 131072, maxTokens: 32768 },
    ],
    xai: [
        { id: 'grok-4.1', name: 'Grok 4.1', provider: 'xai', description: 'Latest (Nov 2025)', contextWindow: 262144, maxTokens: 65536 },
        { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xai', description: 'Agentic workflows', contextWindow: 262144, maxTokens: 65536 },
        { id: 'grok-4', name: 'Grok 4', provider: 'xai', description: '256K context (Jul 2025)', contextWindow: 262144, maxTokens: 65536 },
        { id: 'grok-3', name: 'Grok 3', provider: 'xai', description: 'DeeperSearch (Feb 2025)', contextWindow: 131072, maxTokens: 32768 },
    ],
};

/** Provider display info */
export const PROVIDER_INFO: Record<AIProvider, { name: string; icon: string; docsUrl: string }> = {
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
    contentType: 'recipe' | 'article' | 'roundup';
    provider: AIProvider;
    model: string;
    temperature?: number;
    systemPrompt?: string;
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
    shortDescription: string;
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

/** AI provider interface - all providers must implement this */
export interface IAIProvider {
    readonly provider: AIProvider;
    generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
    validateApiKey(apiKey: string): Promise<boolean>;
}

/** AI settings stored in database */
export interface AISettings {
    defaultProvider: AIProvider;
    defaultModel: string;
    temperature: number;
    systemPrompt: string;
    providers: Partial<Record<AIProvider, {
        apiKey: string;
        enabled: boolean;
        availableModels?: AIModel[];
    }>>;
}

/** Default AI settings */
export const DEFAULT_AI_SETTINGS: AISettings = {
    defaultProvider: 'gemini',
    defaultModel: 'gemini-3-flash-preview',
    temperature: 0.7,
    systemPrompt: `You are an expert culinary content creator. Generate structured recipe and article content in JSON format.
Always respond with valid JSON that matches the expected schema.
Be creative, detailed, and provide practical cooking tips.`,
    providers: {},
};
