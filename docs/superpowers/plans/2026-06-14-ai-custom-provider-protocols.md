# Multi-Protocol Custom Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin add a custom AI provider while choosing its protocol (`openai` | `anthropic` | `gemini`) and, for OpenAI, its auth style (`bearer` | `api_key`), so gateways like OpenCode Zen, Azure AI Foundry, and NVIDIA build all work.

**Architecture:** Add two optional fields (`api_format`, `auth_style`) to **custom** providers only. Generalize the built-in Anthropic and Gemini providers into base-URL-configurable `*CompatibleProvider` classes (the built-ins become thin wrappers). Teach `OpenAICompatibleProvider` the `api-key` auth header. Route in `createProvider` by `api_format`. Built-in providers are unchanged. Backward compatible via Zod defaults (no data migration).

**Tech Stack:** TypeScript strict, Zod 4, Vitest, React 19 admin SPA, Cloudflare D1 settings blob. Read first: `docs/superpowers/specs/2026-06-14-ai-custom-provider-protocols-design.md`.

---

## Conventions (read once)

- Run between every task: `pnpm typecheck && pnpm exec vitest run src/modules/ai && pnpm check:boundaries`. All green before each commit. (`pnpm test` also runs an unrelated pre-existing failure in `.claude/worktrees/...` — ignore it; scope to `src/`.)
- snake_case for stored/app data keys. No `any` in production code (`as any`/narrow casts allowed in tests).
- External provider HTTP field names stay as the provider's names **inside the provider class only** (allowed exception).
- Tests live in `src/modules/ai/__tests__/`.

## File structure

- **Modify** `src/modules/ai/types.ts` — `ApiFormat`, `AuthStyle`, extend `CustomProviderConfig`; widen `createProvider` is in ai.service (not here).
- **Modify** `src/modules/ai/settings-schema.ts` — `CustomProviderConfigSchema` gains `api_format` + `auth_style` (defaults).
- **Modify** `src/shared/validation/schemas/ai.ts` — `CreateCustomProviderSchema`, `UpdateCustomProviderSchema`, `ValidateApiKeySchema` gain the two optional enums.
- **Modify** `src/modules/ai/providers/openai-compatible.provider.ts` — `auth_style` header.
- **Create** `src/modules/ai/providers/anthropic-compatible.provider.ts`; **modify** `anthropic.provider.ts` to extend it.
- **Create** `src/modules/ai/providers/gemini-compatible.provider.ts`; **modify** `gemini.provider.ts` to extend it.
- **Modify** `src/modules/ai/providers/index.ts` — export the two new classes.
- **Modify** `src/modules/ai/ai.service.ts` — `createProvider(provider, apiKey, baseUrl?, opts?)` + pass config fields in `generateContent`/`validateProviderApiKey`.
- **Modify** `src/pages/api/admin/ai/custom-providers/index.ts`, `models/[provider]/discover.ts`, `settings.ts` — forward `api_format`/`auth_style`.
- **Modify** `src/admin/features/settings/pages/tabs/AISettings.tsx` — format/auth selects + presets + `customForm` state; `handleValidateKey` passes the fields.
- **Tests:** `src/modules/ai/__tests__/{openai-compatible,anthropic-compatible,gemini-compatible,create-provider}.test.ts`.

---

## Task 1: Types — `ApiFormat` / `AuthStyle` + `CustomProviderConfig`

**Files:**
- Modify: `src/modules/ai/types.ts`

- [ ] **Step 1: Add the types**

After the `ModelStatus` type (near the top type block) add:
```ts
export type ApiFormat = 'openai' | 'anthropic' | 'gemini';
export type AuthStyle = 'bearer' | 'api_key';
```

- [ ] **Step 2: Extend `CustomProviderConfig`**

Replace:
```ts
export interface CustomProviderConfig extends ProviderConfig {
    label: string;
    base_url: string;
}
```
with:
```ts
export interface CustomProviderConfig extends ProviderConfig {
    label: string;
    base_url: string;
    /** Wire protocol for this custom endpoint. Default 'openai'. */
    api_format?: ApiFormat;
    /** Auth header style (openai format only). Default 'bearer'. */
    auth_style?: AuthStyle;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (purely additive; optional fields).

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/types.ts
git commit -m "feat(ai): ApiFormat/AuthStyle types on custom provider config"
```

---

## Task 2: Zod schemas (settings blob + request)

**Files:**
- Modify: `src/modules/ai/settings-schema.ts`
- Modify: `src/shared/validation/schemas/ai.ts`
- Test: `src/modules/ai/__tests__/settings-schema.test.ts` (new)

- [ ] **Step 1: Write the failing test**

`src/modules/ai/__tests__/settings-schema.test.ts`:
```ts
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/modules/ai/__tests__/settings-schema.test.ts`
Expected: FAIL — `api_format`/`auth_style` are `undefined` (not yet in schema).

- [ ] **Step 3: Implement schema fields**

In `src/modules/ai/settings-schema.ts`, replace:
```ts
const CustomProviderConfigSchema = ProviderConfigSchema.extend({
    label: z.string().min(1),
    base_url: z.string().url(),
});
```
with:
```ts
const CustomProviderConfigSchema = ProviderConfigSchema.extend({
    label: z.string().min(1),
    base_url: z.string().url(),
    api_format: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
    auth_style: z.enum(['bearer', 'api_key']).default('bearer'),
});
```

In `src/shared/validation/schemas/ai.ts`:
- Add to `CreateCustomProviderSchema` (after `api_key`):
```ts
    api_format: z.enum(['openai', 'anthropic', 'gemini']).optional(),
    auth_style: z.enum(['bearer', 'api_key']).optional(),
```
- Add the same two optional lines to `UpdateCustomProviderSchema`.
- Add the same two optional lines to `ValidateApiKeySchema` (so the Test button can validate with the chosen protocol).

- [ ] **Step 4: Run the test + typecheck**

Run: `pnpm exec vitest run src/modules/ai/__tests__/settings-schema.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ai/settings-schema.ts src/shared/validation/schemas/ai.ts src/modules/ai/__tests__/settings-schema.test.ts
git commit -m "feat(ai): zod fields for custom provider api_format + auth_style"
```

---

## Task 3: `OpenAICompatibleProvider` auth_style (api-key header for Azure)

**Files:**
- Modify: `src/modules/ai/providers/openai-compatible.provider.ts`
- Test: `src/modules/ai/__tests__/openai-compatible.test.ts` (append)

- [ ] **Step 1: Write the failing test (append to the existing file)**

Append to `src/modules/ai/__tests__/openai-compatible.test.ts`:
```ts
describe('OpenAICompatibleProvider auth style', () => {
  it('sends Authorization: Bearer by default', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    await new OpenAICompatibleProvider('p', 'https://api.example.com/v1', 'k').listModels('k');
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer k');
    expect(headers['api-key']).toBeUndefined();
  });

  it('sends the api-key header when auth_style is api_key', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    await new OpenAICompatibleProvider('p', 'https://x.openai.azure.com/openai/v1', 'k', 'api_key').listModels('k');
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['api-key']).toBe('k');
    expect(headers.Authorization).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/modules/ai/__tests__/openai-compatible.test.ts`
Expected: FAIL (constructor ignores a 4th arg; always sends Authorization).

- [ ] **Step 3: Implement auth_style**

In `src/modules/ai/providers/openai-compatible.provider.ts`:
- Import the type: change the type import to include `AuthStyle`:
```ts
import type {
    AIProvider,
    AuthStyle,
    DiscoveredModel,
    GenerateContentRequest,
    GenerateContentResponse,
    IAIProvider,
} from '../types';
```
- Change the constructor + add a header helper:
```ts
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

    private authHeaders(key: string): Record<string, string> {
        return this.authStyle === 'api_key'
            ? { 'api-key': key }
            : { Authorization: `Bearer ${key}` };
    }

    private url(path: string): string {
        return `${this.baseUrl.replace(/\/$/, '')}${path}`;
    }
```
- In `generateContent`, replace the fetch headers:
```ts
                headers: {
                    'Content-Type': 'application/json',
                    ...this.authHeaders(this.apiKey),
                },
```
- In `validateApiKey`, replace:
```ts
    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            return (await fetch(this.url('/models'), {
                headers: this.authHeaders(apiKey),
            })).ok;
        } catch {
            return false;
        }
    }
```
- In `listModels`, replace the fetch headers with `headers: this.authHeaders(apiKey),`.

- [ ] **Step 4: Run the test + typecheck**

Run: `pnpm exec vitest run src/modules/ai/__tests__/openai-compatible.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/ai/providers/openai-compatible.provider.ts src/modules/ai/__tests__/openai-compatible.test.ts
git commit -m "feat(ai): openai-compatible provider supports api-key auth (Azure)"
```

---

## Task 4: `AnthropicCompatibleProvider` (base-URL configurable) + refactor built-in

**Files:**
- Create: `src/modules/ai/providers/anthropic-compatible.provider.ts`
- Modify: `src/modules/ai/providers/anthropic.provider.ts`
- Test: `src/modules/ai/__tests__/anthropic-compatible.test.ts` (new)

- [ ] **Step 1: Write the failing test**

`src/modules/ai/__tests__/anthropic-compatible.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnthropicCompatibleProvider } from '../providers/anthropic-compatible.provider';

afterEach(() => vi.restoreAllMocks());

describe('AnthropicCompatibleProvider', () => {
  it('lists models from {base}/v1/models with x-api-key', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'claude-x' }, { id: 'tts-y' }] }), { status: 200 }),
    );
    const out = await new AnthropicCompatibleProvider('zen', 'https://opencode.ai/anthropic', 'k').listModels('k');
    expect(spy.mock.calls[0][0]).toBe('https://opencode.ai/anthropic/v1/models');
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('k');
    expect(out.models.map((m) => m.id)).toEqual(['claude-x']);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/modules/ai/__tests__/anthropic-compatible.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `anthropic-compatible.provider.ts`**

```ts
/**
 * Anthropic-compatible provider (configurable base URL).
 * Generalizes the built-in Anthropic provider so custom gateways that speak the
 * Anthropic Messages protocol (e.g. OpenCode Zen `/anthropic`) work too.
 */
import type { AIProvider, DiscoveredModel, GenerateContentRequest, GenerateContentResponse, IAIProvider } from '../types';
import { getSystemPrompt } from '../prompts';
import { normalizeOpenAiModels } from '../discovery/normalize';

interface AnthropicResponse {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
}

export class AnthropicCompatibleProvider implements IAIProvider {
    readonly provider: AIProvider;

    constructor(provider: string, private baseUrl: string, private apiKey: string) {
        this.provider = provider;
    }

    private url(path: string): string {
        return `${this.baseUrl.replace(/\/$/, '')}${path}`;
    }

    private headers(key: string): Record<string, string> {
        return { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
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
            messages: [{ role: 'user', content: request.prompt }],
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
                headers: this.headers(this.apiKey),
                body: JSON.stringify(body),
            });
            const data = await response.json() as AnthropicResponse;
            if (data.error) return { success: false, error: data.error.message || 'Anthropic API error' };

            const textContent = data.content?.find((c) => c.type === 'text')?.text;
            if (!textContent) return { success: false, error: 'No content generated' };

            let jsonContent = textContent;
            const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonContent = jsonMatch[1].trim();

            return {
                success: true,
                data: JSON.parse(jsonContent),
                usage: {
                    promptTokens: data.usage?.input_tokens || 0,
                    completionTokens: data.usage?.output_tokens || 0,
                    totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
                },
            };
        } catch (error) {
            return { success: false, error: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            return (await fetch(this.url('/v1/models'), { headers: this.headers(apiKey) })).ok;
        } catch {
            return false;
        }
    }

    async listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
        try {
            const response = await fetch(this.url('/v1/models'), { headers: this.headers(apiKey) });
            if (!response.ok) return { supported: true, models: [] };
            return { supported: true, models: normalizeOpenAiModels(await response.json()) };
        } catch {
            return { supported: true, models: [] };
        }
    }
}
```

- [ ] **Step 4: Refactor `anthropic.provider.ts` to extend it**

Replace the entire body of `src/modules/ai/providers/anthropic.provider.ts` with:
```ts
/**
 * AI Provider - Anthropic Claude (built-in)
 * Thin wrapper over AnthropicCompatibleProvider bound to the public API base.
 */
import { AnthropicCompatibleProvider } from './anthropic-compatible.provider';

export class AnthropicProvider extends AnthropicCompatibleProvider {
    constructor(apiKey: string) {
        super('anthropic', 'https://api.anthropic.com', apiKey);
    }
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm exec vitest run src/modules/ai && pnpm typecheck`
Expected: PASS (built-in anthropic behavior preserved: base `https://api.anthropic.com` + `/v1/messages` + `/v1/models`).

- [ ] **Step 6: Commit**

```bash
git add src/modules/ai/providers/anthropic-compatible.provider.ts src/modules/ai/providers/anthropic.provider.ts src/modules/ai/__tests__/anthropic-compatible.test.ts
git commit -m "feat(ai): AnthropicCompatibleProvider (base-url) + built-in wrapper"
```

---

## Task 5: `GeminiCompatibleProvider` (base-URL configurable) + refactor built-in

**Files:**
- Create: `src/modules/ai/providers/gemini-compatible.provider.ts`
- Modify: `src/modules/ai/providers/gemini.provider.ts`
- Test: `src/modules/ai/__tests__/gemini-compatible.test.ts` (new)

- [ ] **Step 1: Write the failing test**

`src/modules/ai/__tests__/gemini-compatible.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeminiCompatibleProvider } from '../providers/gemini-compatible.provider';

afterEach(() => vi.restoreAllMocks());

describe('GeminiCompatibleProvider', () => {
  it('lists models from {base}/v1beta/models?key= and strips the models/ prefix', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: 'models/gemini-3-flash' }, { name: 'models/dall-e' }] }), { status: 200 }),
    );
    const out = await new GeminiCompatibleProvider('g', 'https://generativelanguage.googleapis.com', 'k').listModels('k');
    expect(spy.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models?key=k');
    expect(out.models.map((m) => m.id)).toEqual(['gemini-3-flash']);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/modules/ai/__tests__/gemini-compatible.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `gemini-compatible.provider.ts`**

```ts
/**
 * Gemini-compatible provider (configurable base URL).
 * Generalizes the built-in Gemini provider; the API key travels in the
 * `?key=` query param, so `auth_style` does not apply.
 */
import type { AIProvider, DiscoveredModel, GenerateContentRequest, GenerateContentResponse, IAIProvider } from '../types';
import { getSystemPrompt } from '../prompts';
import { classifyModality, detectThinking } from '../discovery/normalize';

interface GeminiResponse {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    error?: { message?: string };
}

export class GeminiCompatibleProvider implements IAIProvider {
    readonly provider: AIProvider;

    constructor(provider: string, private baseUrl: string, private apiKey: string) {
        this.provider = provider;
    }

    private base(): string {
        return this.baseUrl.replace(/\/$/, '');
    }

    async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
        const systemPrompt = getSystemPrompt(request.content_type, request.system_prompt);
        const model = request.model || 'gemini-1.5-flash';
        const url = `${this.base()}/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const body = {
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser request: ${request.prompt}` }] }],
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
            },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json() as GeminiResponse;
            if (data.error) return { success: false, error: data.error.message || 'Gemini API error' };

            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textContent) return { success: false, error: 'No content generated' };

            return {
                success: true,
                data: JSON.parse(textContent),
                usage: {
                    promptTokens: data.usageMetadata?.promptTokenCount || 0,
                    completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: data.usageMetadata?.totalTokenCount || 0,
                },
            };
        } catch (error) {
            return { success: false, error: `Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const url = `${this.base()}/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hello' }] }], generationConfig: { maxOutputTokens: 10 } }),
            });
            const data = await response.json() as GeminiResponse;
            return !data.error;
        } catch {
            return false;
        }
    }

    async listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
        try {
            const response = await fetch(`${this.base()}/v1beta/models?key=${apiKey}`);
            if (!response.ok) return { supported: true, models: [] };
            const raw = await response.json() as { models?: Array<{ name?: string }> };
            const models = (raw.models ?? [])
                .map((model) => (model.name ?? '').replace(/^models\//, ''))
                .filter((id): id is string => id.length > 0)
                .map((id) => ({ id, modality: classifyModality(id), supports_thinking: detectThinking(id) }))
                .filter((model) => model.modality === 'text');
            return { supported: true, models };
        } catch {
            return { supported: true, models: [] };
        }
    }
}
```

- [ ] **Step 4: Refactor `gemini.provider.ts` to extend it**

Replace the entire body of `src/modules/ai/providers/gemini.provider.ts` with:
```ts
/**
 * AI Provider - Google Gemini (built-in)
 * Thin wrapper over GeminiCompatibleProvider bound to the public API base.
 */
import { GeminiCompatibleProvider } from './gemini-compatible.provider';

export class GeminiProvider extends GeminiCompatibleProvider {
    constructor(apiKey: string) {
        super('gemini', 'https://generativelanguage.googleapis.com', apiKey);
    }
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm exec vitest run src/modules/ai && pnpm typecheck`
Expected: PASS. (Built-in Gemini behavior preserved: same endpoints, `gemini-1.5-flash` default.)

- [ ] **Step 6: Commit**

```bash
git add src/modules/ai/providers/gemini-compatible.provider.ts src/modules/ai/providers/gemini.provider.ts src/modules/ai/__tests__/gemini-compatible.test.ts
git commit -m "feat(ai): GeminiCompatibleProvider (base-url) + built-in wrapper"
```

---

## Task 6: Factory routing — exports + `createProvider`

**Files:**
- Modify: `src/modules/ai/providers/index.ts`
- Modify: `src/modules/ai/ai.service.ts`
- Test: `src/modules/ai/__tests__/create-provider.test.ts` (new)

- [ ] **Step 1: Export the new classes**

In `src/modules/ai/providers/index.ts` add:
```ts
export { AnthropicCompatibleProvider } from './anthropic-compatible.provider';
export { GeminiCompatibleProvider } from './gemini-compatible.provider';
```

- [ ] **Step 2: Write the failing test**

`src/modules/ai/__tests__/create-provider.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createProvider } from '../ai.service';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.provider';
import { AnthropicCompatibleProvider } from '../providers/anthropic-compatible.provider';
import { GeminiCompatibleProvider } from '../providers/gemini-compatible.provider';

describe('createProvider custom routing by api_format', () => {
  it('routes openai (default) to OpenAICompatibleProvider', () => {
    const p = createProvider('my-zen', 'k', 'https://opencode.ai/zen/v1');
    expect(p).toBeInstanceOf(OpenAICompatibleProvider);
    expect(p.provider).toBe('my-zen');
  });

  it('routes anthropic to AnthropicCompatibleProvider', () => {
    const p = createProvider('my-zen', 'k', 'https://opencode.ai/anthropic', { apiFormat: 'anthropic' });
    expect(p).toBeInstanceOf(AnthropicCompatibleProvider);
  });

  it('routes gemini to GeminiCompatibleProvider', () => {
    const p = createProvider('my-g', 'k', 'https://host', { apiFormat: 'gemini' });
    expect(p).toBeInstanceOf(GeminiCompatibleProvider);
  });

  it('throws for an unknown provider without a baseUrl', () => {
    expect(() => createProvider('mystery', 'k')).toThrow();
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm exec vitest run src/modules/ai/__tests__/create-provider.test.ts`
Expected: FAIL — `createProvider` doesn't accept an opts arg / doesn't branch.

- [ ] **Step 4: Implement the factory changes**

In `src/modules/ai/ai.service.ts`:
- Add to the type import list: `ApiFormat`, `AuthStyle`:
```ts
import type {
    AIProvider,
    AiSettings,
    ApiFormat,
    AuthStyle,
    BuiltInProvider,
    CustomProviderConfig,
    GenerateContentRequest,
    GenerateContentResponse,
    IAIProvider,
    ModelSelection,
    ProviderConfig,
} from './types';
```
- Add to the providers import: `AnthropicCompatibleProvider`, `GeminiCompatibleProvider`:
```ts
import {
    AnthropicCompatibleProvider,
    AnthropicProvider,
    DeepSeekProvider,
    GeminiCompatibleProvider,
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
```
- Replace `createProvider`:
```ts
export function createProvider(
    provider: AIProvider,
    apiKey: string,
    baseUrl?: string,
    opts?: { apiFormat?: ApiFormat; authStyle?: AuthStyle },
): IAIProvider {
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
        default: {
            if (!baseUrl) throw new Error(`Unknown provider: ${provider}`);
            if (opts?.apiFormat === 'anthropic') return new AnthropicCompatibleProvider(provider, baseUrl, apiKey);
            if (opts?.apiFormat === 'gemini') return new GeminiCompatibleProvider(provider, baseUrl, apiKey);
            return new OpenAICompatibleProvider(provider, baseUrl, apiKey, opts?.authStyle);
        }
    }
}
```
- In `generateContent`, replace the `createProvider(...)` call:
```ts
    const customCfg = config as CustomProviderConfig;
    const aiProvider = createProvider(provider, config.api_key, getProviderBaseUrl(settings, provider), {
        apiFormat: customCfg.api_format,
        authStyle: customCfg.auth_style,
    });
```
- In `validateProviderApiKey`, widen the signature to forward opts:
```ts
export async function validateProviderApiKey(
    provider: AIProvider,
    apiKey: string,
    baseUrl?: string,
    opts?: { apiFormat?: ApiFormat; authStyle?: AuthStyle },
): Promise<boolean> {
    const aiProvider = createProvider(provider, apiKey, baseUrl, opts);
    return aiProvider.validateApiKey(apiKey);
}
```

- [ ] **Step 5: Run the test + the AI suite + typecheck + boundaries**

Run: `pnpm exec vitest run src/modules/ai && pnpm typecheck && pnpm check:boundaries`
Expected: PASS. (`src/modules` must not import Cloudflare bindings — unchanged.)

- [ ] **Step 6: Commit**

```bash
git add src/modules/ai/providers/index.ts src/modules/ai/ai.service.ts src/modules/ai/__tests__/create-provider.test.ts
git commit -m "feat(ai): route custom providers by api_format in createProvider"
```

---

## Task 7: Wire the API routes (create / discover / validate)

**Files:**
- Modify: `src/pages/api/admin/ai/custom-providers/index.ts`
- Modify: `src/pages/api/admin/ai/models/[provider]/discover.ts`
- Modify: `src/pages/api/admin/ai/settings.ts`

- [ ] **Step 1: Persist api_format/auth_style on create**

In `src/pages/api/admin/ai/custom-providers/index.ts` POST, change the destructure + the saved object:
```ts
        const { id, label, base_url, api_key, enabled, api_format, auth_style } = await validateBody(request, CreateCustomProviderSchema);
```
```ts
        const success = await saveAiSettings(env.DB, {
            custom_providers: {
                [id]: {
                    label,
                    base_url,
                    api_key,
                    enabled: enabled ?? true,
                    api_format: api_format ?? 'openai',
                    auth_style: auth_style ?? 'bearer',
                    models: [],
                },
            },
        });
```

- [ ] **Step 2: Pass protocol/auth into discovery**

In `src/pages/api/admin/ai/models/[provider]/discover.ts`, replace the `createProvider(...)` call:
```ts
        const customCfg = cfg as CustomProviderConfig;
        const impl = createProvider(provider as AIProvider, cfg.api_key, customCfg.base_url, {
            apiFormat: customCfg.api_format,
            authStyle: customCfg.auth_style,
        });
```
(`CustomProviderConfig` and `AIProvider` are already imported in this file.)

- [ ] **Step 3: Pass protocol/auth into the validate endpoint**

In `src/pages/api/admin/ai/settings.ts` POST, change:
```ts
        const { provider, api_key, base_url } = await validateBody(request, ValidateApiKeySchema);
        const isValid = await createProvider(provider, api_key, base_url).validateApiKey(api_key);
```
to:
```ts
        const { provider, api_key, base_url, api_format, auth_style } = await validateBody(request, ValidateApiKeySchema);
        const isValid = await createProvider(provider, api_key, base_url, { apiFormat: api_format, authStyle: auth_style }).validateApiKey(api_key);
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm exec vitest run src/modules/ai src/shared && pnpm check:boundaries`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/admin/ai/custom-providers/index.ts src/pages/api/admin/ai/models/[provider]/discover.ts src/pages/api/admin/ai/settings.ts
git commit -m "feat(ai): forward api_format + auth_style through create/discover/validate"
```

---

## Task 8: Admin form — format + auth selects + presets

**Files:**
- Modify: `src/admin/features/settings/pages/tabs/AISettings.tsx`

- [ ] **Step 1: Extend the custom form state**

Change the `customForm` state initializer:
```ts
    const [customForm, setCustomForm] = useState({ id: '', label: '', base_url: '', api_key: '', api_format: 'openai', auth_style: 'bearer' });
```

- [ ] **Step 2: Pass api_format/auth_style when validating a saved provider**

In `handleValidateKey`, change the validate call to include the config's protocol fields:
```ts
            const response = await aiAPI.validateApiKey(
                provider,
                config.api_key,
                'base_url' in config ? config.base_url : undefined,
            );
```
Replace it with a call that also forwards format/auth (extend `aiAPI.validateApiKey` signature in Step 3 first):
```ts
            const cfg = config as CustomProviderSettings;
            const response = await aiAPI.validateApiKey(
                provider,
                config.api_key,
                'base_url' in config ? config.base_url : undefined,
                'base_url' in config ? { api_format: cfg.api_format, auth_style: cfg.auth_style } : undefined,
            );
```
Also add `api_format?: string; auth_style?: string;` to the `CustomProviderSettings` interface in this file.

- [ ] **Step 3: Extend the `aiAPI.validateApiKey` client signature**

In `src/admin/services/api.ts`, replace:
```ts
  validateApiKey: (provider: string, api_key: string, base_url?: string) => api.post('/admin/ai/settings', { provider, api_key, base_url }),
```
with:
```ts
  validateApiKey: (provider: string, api_key: string, base_url?: string, extra?: { api_format?: string; auth_style?: string }) =>
    api.post('/admin/ai/settings', { provider, api_key, base_url, ...extra }),
```

- [ ] **Step 4: Add the selects + presets to the custom-provider Card**

Add `Sparkles`/icons already imported; you need `Select` (already imported in this file). Update the card header label and the form grid. Replace the custom-provider `<Card>...</Card>` content (the `CardTitle` text and the `CardContent`) with:
```tsx
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Custom Provider
                            </CardTitle>
                            <CardDescription className="text-xs">
                                OpenAI / Anthropic / Gemini-compatible endpoint.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                                <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                                    onClick={() => setCustomForm((p) => ({ ...p, base_url: 'https://integrate.api.nvidia.com/v1', api_format: 'openai', auth_style: 'bearer' }))}>
                                    NVIDIA build
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                                    onClick={() => setCustomForm((p) => ({ ...p, base_url: 'https://opencode.ai/zen/v1', api_format: 'openai', auth_style: 'bearer' }))}>
                                    OpenCode Zen
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                                    onClick={() => setCustomForm((p) => ({ ...p, api_format: 'openai', auth_style: 'api_key' }))}>
                                    Azure Foundry
                                </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-4">
                                <Input placeholder="id" value={customForm.id} onChange={(e) => setCustomForm((p) => ({ ...p, id: e.target.value }))} />
                                <Input placeholder="label" value={customForm.label} onChange={(e) => setCustomForm((p) => ({ ...p, label: e.target.value }))} />
                                <Input placeholder="https://host/v1" value={customForm.base_url} onChange={(e) => setCustomForm((p) => ({ ...p, base_url: e.target.value }))} />
                                <div className="flex gap-2">
                                    <Input type="password" placeholder="api_key" value={customForm.api_key} onChange={(e) => setCustomForm((p) => ({ ...p, api_key: e.target.value }))} />
                                </div>
                                <Select value={customForm.api_format} onValueChange={(v) => setCustomForm((p) => ({ ...p, api_format: v }))}>
                                    <SelectTrigger className="h-9"><SelectValue placeholder="API format" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="openai">OpenAI-compatible</SelectItem>
                                        <SelectItem value="anthropic">Anthropic-compatible</SelectItem>
                                        <SelectItem value="gemini">Gemini-compatible</SelectItem>
                                    </SelectContent>
                                </Select>
                                {customForm.api_format === 'openai' && (
                                    <Select value={customForm.auth_style} onValueChange={(v) => setCustomForm((p) => ({ ...p, auth_style: v }))}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Auth" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bearer">Bearer</SelectItem>
                                            <SelectItem value="api_key">api-key header</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button onClick={handleCreateCustomProvider} disabled={!customForm.id || !customForm.label || !customForm.base_url || !customForm.api_key}>
                                    Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
```
(`Select, SelectContent, SelectItem, SelectTrigger, SelectValue` and `CardDescription` are already imported in this file.)

- [ ] **Step 5: Reset the new fields after a successful create**

In `handleCreateCustomProvider`, change the reset:
```ts
                setCustomForm({ id: '', label: '', base_url: '', api_key: '', api_format: 'openai', auth_style: 'bearer' });
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm exec vitest run src/ && pnpm check:boundaries`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/admin/features/settings/pages/tabs/AISettings.tsx src/admin/services/api.ts
git commit -m "feat(admin-ai): custom provider format/auth selects + NVIDIA/Zen/Azure presets"
```

---

## Task 9: Final verification + manual E2E

- [ ] **Step 1: Full gate**

Run: `pnpm typecheck && pnpm exec vitest run src/ && pnpm check:boundaries`
Expected: all green.

- [ ] **Step 2: Manual E2E (owner-driven; record results)**

In `pnpm dev`, admin → Settings → AI → Providers → Custom Provider:
1. Preset **NVIDIA build** → fills base_url + openai/bearer → add (with a key) → Test passes → open Manage models → Discover lists models.
2. **OpenCode Zen (Anthropic)**: id `zen-anthropic`, base_url `https://opencode.ai/anthropic`, format **Anthropic-compatible**, key → add → Test passes → generate a recipe from the editor with one of its models.
3. **Azure Foundry**: preset Azure (openai + **api-key** auth), base_url `https://<res>.openai.azure.com/openai/v1`, key → Test passes.
4. **Gemini-compatible** custom (format Gemini, base_url host root) → Discover lists models.
5. Existing OpenAI custom providers still work (default openai/bearer) — regression check.

- [ ] **Step 3: Integrate** — use superpowers:finishing-a-development-branch.

---

## Self-Review

- **Spec coverage:** `api_format`/`auth_style` fields (T1 types, T2 zod) ✓; OpenAI api-key auth (T3) ✓; Anthropic-compatible provider + built-in refactor (T4) ✓; Gemini-compatible provider + built-in refactor (T5) ✓; factory routing by format (T6) ✓; route wiring create/discover/validate (T7) ✓; form selects + presets + client signature (T8) ✓; manual E2E (T9) ✓.
- **Placeholder scan:** none — every code step shows full code; the only conditional (`customForm.api_format === 'openai' && <Select>`) is real UI logic.
- **Type consistency:** `ApiFormat`/`AuthStyle` defined in T1, used identically in T2 (zod enums), T3 (`AuthStyle` param), T6 (`createProvider` opts), T7 (route opts). `createProvider(provider, apiKey, baseUrl?, { apiFormat, authStyle })` signature is identical across T6 definition and T7/generateContent callers. New classes `AnthropicCompatibleProvider`/`GeminiCompatibleProvider` exported (T6) match imports in tests (T4/T5) and factory (T6).
- **Backward compat:** custom configs without the fields default to `openai`+`bearer` (T2 zod defaults); built-in providers route through the unchanged `switch`; built-in Anthropic/Gemini behavior preserved by binding the same base URLs (T4/T5).
- **Boundaries:** all new code stays in `src/modules/ai` (domain) + admin; no Cloudflare/`@server` imports added.
