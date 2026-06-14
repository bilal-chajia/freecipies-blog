/**
 * AI Domain Zod Schemas
 * =====================
 * Validation schemas for AI-related API endpoints.
 */
import { z } from '../helpers';

const ContentTypeEnum = z.enum(['recipe', 'article', 'roundup']);
const BuiltInProviderIds = [
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

export const ProviderParam = z.object({
    provider: z.string().min(1),
});

export const ProviderModelParam = z.object({
    provider: z.string().min(1),
    model_id: z.string().min(1),
});

export const GenerateSchema = z.object({
    prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(10000),
    content_type: ContentTypeEnum,
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    temperature: z.number().min(0).max(2).optional(),
    reasoning_effort: z.enum(['low', 'medium', 'high']).optional(),
}).passthrough();

export const AddModelSchema = z.object({
    id: z.string().min(1, 'Model ID required'),
    name: z.string().min(1, 'Model name required'),
    context_window: z.number().int().positive().optional(),
    max_tokens: z.number().int().positive().optional(),
}).passthrough();

export const UpdateModelSchema = z.object({
    name: z.string().min(1).optional(),
    context_window: z.number().int().positive().optional(),
    max_tokens: z.number().int().positive().optional(),
    deprecated: z.boolean().optional(),
    enabled: z.boolean().optional(),
}).passthrough();

export const UpdateSettingsSchema = z.object({
    default_provider: z.string().optional(),
    default_model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    system_prompt: z.string().optional(),
    providers: z.record(z.string(), z.object({
        api_key: z.string().optional(),
        enabled: z.boolean().optional(),
        models: z.array(z.unknown()).optional(),
    })).optional(),
    custom_providers: z.record(z.string(), z.object({
        label: z.string().min(1).optional(),
        base_url: z.string().url().optional(),
        api_key: z.string().optional(),
        enabled: z.boolean().optional(),
        models: z.array(z.unknown()).optional(),
    })).optional(),
}).passthrough();

export const ValidateApiKeySchema = z.object({
    provider: z.string().min(1),
    api_key: z.string().min(1, 'API key required'),
    base_url: z.string().url().optional(),
    api_format: z.enum(['openai', 'anthropic', 'gemini']).optional(),
    auth_style: z.enum(['bearer', 'api_key']).optional(),
});

export const CreateCustomProviderSchema = z.object({
    id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'id must be kebab-case')
        .refine((id) => !BuiltInProviderIds.includes(id), 'id cannot match a built-in provider'),
    label: z.string().min(1),
    base_url: z.string().url(),
    api_key: z.string().min(1),
    api_format: z.enum(['openai', 'anthropic', 'gemini']).optional(),
    auth_style: z.enum(['bearer', 'api_key']).optional(),
    enabled: z.boolean().optional(),
});

export const UpdateCustomProviderSchema = z.object({
    label: z.string().min(1).optional(),
    base_url: z.string().url().optional(),
    api_key: z.string().optional(),
    api_format: z.enum(['openai', 'anthropic', 'gemini']).optional(),
    auth_style: z.enum(['bearer', 'api_key']).optional(),
    enabled: z.boolean().optional(),
});
