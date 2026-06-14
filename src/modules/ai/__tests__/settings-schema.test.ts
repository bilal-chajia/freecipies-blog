import { describe, it, expect } from 'vitest';
import { AiSettingsSchema } from '../settings-schema';

describe('AiSettingsSchema custom provider protocol fields', () => {
  it('defaults api_format=openai and auth_style=bearer when omitted', () => {
    const parsed = AiSettingsSchema.parse({
      default_provider: 'gemini',
      custom_providers: { zen: { label: 'Zen', base_url: 'https://opencode.ai/zen/v1', api_key: 'k' } },
    });
    expect(parsed.custom_providers.zen.api_format).toBe('openai');
    expect(parsed.custom_providers.zen.auth_style).toBe('bearer');
  });

  it('accepts anthropic + gemini formats and api_key auth', () => {
    const parsed = AiSettingsSchema.parse({
      default_provider: 'gemini',
      custom_providers: {
        zenamc: { label: 'ZenA', base_url: 'https://opencode.ai/anthropic', api_key: 'k', api_format: 'anthropic' },
        azure: { label: 'Azure', base_url: 'https://x.openai.azure.com/openai/v1', api_key: 'k', api_format: 'openai', auth_style: 'api_key' },
        g: { label: 'G', base_url: 'https://generativelanguage.googleapis.com', api_key: 'k', api_format: 'gemini' },
      },
    });
    expect(parsed.custom_providers.zenamc.api_format).toBe('anthropic');
    expect(parsed.custom_providers.azure.auth_style).toBe('api_key');
    expect(parsed.custom_providers.g.api_format).toBe('gemini');
  });
});
