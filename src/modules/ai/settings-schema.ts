import { z } from 'zod';

const ModelSelectionSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    context_window: z.number().int().positive().optional(),
    max_tokens: z.number().int().positive().optional(),
    modality: z.enum(['text', 'image', 'audio', 'embedding', 'other']).default('text'),
    supports_thinking: z.boolean().optional(),
    enabled: z.boolean().default(true),
    order: z.number().int().nonnegative().default(0),
    deprecated: z.boolean().optional(),
    status: z.enum(['available', 'unavailable', 'deprecated']).default('available'),
    source: z.enum(['discovered', 'manual']).default('discovered'),
});

const ProviderConfigSchema = z.object({
    enabled: z.boolean().default(false),
    api_key: z.string().default(''),
    models: z.array(ModelSelectionSchema).default([]),
});

const CustomProviderConfigSchema = ProviderConfigSchema.extend({
    label: z.string().min(1),
    base_url: z.string().url(),
    api_format: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
    auth_style: z.enum(['bearer', 'api_key']).default('bearer'),
});

export const AiSettingsSchema = z.object({
    default_provider: z.string().min(1),
    default_model: z.string().default(''),
    temperature: z.number().min(0).max(2).default(0.7),
    system_prompt: z.string().default(''),
    providers: z.record(z.string(), ProviderConfigSchema).default({}),
    custom_providers: z.record(z.string(), CustomProviderConfigSchema).default({}),
});
