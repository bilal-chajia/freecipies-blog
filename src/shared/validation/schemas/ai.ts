/**
 * AI Domain Zod Schemas
 * =====================
 * Validation schemas for AI-related API endpoints.
 */
import { z } from '../helpers';

// ── Provider enums (must match ALL_PROVIDERS in @modules/ai/types) ──────────

const ProviderEnum = z.enum([
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
]);

const ContentTypeEnum = z.enum(['recipe', 'article', 'roundup']);

// ── Param schemas ───────────────────────────────────────────────────────────

/** Provider from path param */
export const ProviderParam = z.object({
  provider: ProviderEnum,
});

/** Provider + modelId from path params */
export const ProviderModelParam = z.object({
  provider: ProviderEnum,
  modelId: z.string().min(1, 'Model ID is required'),
});

// ── Body schemas ────────────────────────────────────────────────────────────

/** POST /api/admin/ai/generate */
export const GenerateSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(10000),
  contentType: ContentTypeEnum,
  provider: ProviderEnum.optional(),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
}).passthrough();

/** POST /api/admin/ai/models/:provider — add model */
export const AddModelSchema = z.object({
  id: z.string().min(1, 'Model ID required'),
  name: z.string().min(1, 'Model name required'),
  description: z.string().optional(),
  contextWindow: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
}).passthrough();

/** PUT /api/admin/ai/models/:provider/:modelId — update model */
export const UpdateModelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  contextWindow: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  deprecated: z.boolean().optional(),
}).passthrough();

/** PUT /api/admin/ai/settings — update AI settings */
export const UpdateSettingsSchema = z.object({
  defaultProvider: ProviderEnum.optional(),
  defaultModel: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  systemPrompt: z.string().optional(),
  providers: z.partialRecord(
    ProviderEnum,
    z.object({
      apiKey: z.string().optional(),
      enabled: z.boolean().optional(),
    }),
  ).optional(),
}).passthrough();

/** POST /api/admin/ai/settings — validate API key */
export const ValidateApiKeySchema = z.object({
  provider: ProviderEnum,
  apiKey: z.string().min(1, 'API key required'),
});
