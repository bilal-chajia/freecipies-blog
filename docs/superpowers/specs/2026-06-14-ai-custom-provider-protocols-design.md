# Multi-Protocol Custom Providers — Design

> **Date:** 2026-06-14
> **Status:** Draft (awaiting review)
> **Direction:** A (bespoke protocol adapters) — chosen over adopting the Vercel AI SDK.

## Problem

Custom AI providers can only speak **OpenAI-compatible** today: the add flow stores
`{ label, base_url, api_key, enabled, models }` and `createProvider` routes every custom id to
`OpenAICompatibleProvider` (`{base_url}/chat/completions`, `{base_url}/models`, `Authorization: Bearer`).

That blocks gateways that expose **other dialects** or **other auth**:
- **OpenCode Zen** (`https://opencode.ai/zen/v1`) — exposes BOTH an OpenAI-compatible endpoint and an
  Anthropic-compatible one (`…/anthropic`); also currently lacks `/v1/models`.
- **Azure AI Foundry** (`https://<res>.openai.azure.com/openai/v1`) — OpenAI-compatible wire format
  but auth is the **`api-key`** header, not `Authorization: Bearer`.
- **NVIDIA build** (`https://integrate.api.nvidia.com/v1`) — OpenAI-compatible + Bearer (already
  addable today; included for presets).

## Goal

Let an admin add a custom provider while choosing its **protocol** and **auth style**, so OpenAI-
compatible, Anthropic-compatible, and Azure-style endpoints all work. Built-in providers are
unchanged (their protocol is fixed in code).

Non-goals: Gemini-protocol custom providers, image generation, AWS/GCP signed auth — separate efforts.

## Decisions

- Add two optional fields to **custom** providers only:
  - `api_format: 'openai' | 'anthropic' | 'gemini'` (default `'openai'`).
  - `auth_style: 'bearer' | 'api_key'` (default `'bearer'`) — **applies to the `openai` format only**
    (Azure). The `anthropic` format always uses `x-api-key`; the `gemini` format puts the key in the
    `?key=` query param — both ignore `auth_style`.
- Backward compatible: existing custom providers (no fields) default to `openai` + `bearer` via Zod
  defaults — no data migration.
- Include 3 **presets** (quick-fill base_url + format + auth) for NVIDIA build, Azure Foundry,
  OpenCode Zen.

## Architecture

### Data shape

`CustomProviderConfig` (`src/modules/ai/types.ts`) gains:
```ts
export type ApiFormat = 'openai' | 'anthropic' | 'gemini';
export type AuthStyle = 'bearer' | 'api_key';

export interface CustomProviderConfig extends ProviderConfig {
  label: string;
  base_url: string;
  api_format?: ApiFormat;   // default 'openai'
  auth_style?: AuthStyle;   // default 'bearer'
}
```
Zod (`settings-schema.ts` `CustomProviderConfigSchema`): add `api_format` enum default `'openai'`,
`auth_style` enum default `'bearer'`. Request schemas (`ai.ts` `CreateCustomProviderSchema`,
`UpdateCustomProviderSchema`): add the two optional enums.

### Providers

- **`AnthropicCompatibleProvider(provider, baseUrl, apiKey)`** (new) — generalizes the existing
  `AnthropicProvider`: `{base}/v1/messages` for generate, `{base}/v1/models` for discovery, headers
  `x-api-key` + `anthropic-version: 2023-06-01`, markdown-fence JSON extraction, reasoning →
  `thinking.budget_tokens`. The current `AnthropicProvider` becomes a thin subclass/factory bound to
  `https://api.anthropic.com` so the built-in path is unchanged.
- **`OpenAICompatibleProvider(provider, baseUrl, apiKey, authStyle?)`** — gains `auth_style`:
  `bearer` → `Authorization: Bearer <key>` (current); `api_key` → `api-key: <key>` header (Azure).
  Applies to generate, validate, and listModels.
- **`GeminiCompatibleProvider(provider, baseUrl, apiKey)`** (new) — generalizes the existing
  `GeminiProvider`: `{base}/v1beta/models/{model}:generateContent?key=<key>` for generate (body with
  `contents` + `systemInstruction` + `generationConfig.responseMimeType: 'application/json'`),
  `{base}/v1beta/models?key=<key>` for discovery (maps `models[].name` `models/<id>` → id). Key lives
  in the `?key=` query (so `auth_style` is irrelevant). The current `GeminiProvider` becomes a thin
  wrapper bound to `https://generativelanguage.googleapis.com` — built-in path unchanged.

### Factory

`createProvider(provider, apiKey, baseUrl?, opts?: { apiFormat?: ApiFormat; authStyle?: AuthStyle })`:
- Built-in ids: unchanged `switch` (opts ignored).
- Custom (default branch): `apiFormat === 'anthropic'` → `AnthropicCompatibleProvider(provider, baseUrl, apiKey)`; `apiFormat === 'gemini'` → `GeminiCompatibleProvider(provider, baseUrl, apiKey)`; else → `OpenAICompatibleProvider(provider, baseUrl, apiKey, authStyle)`. Still throws if no `baseUrl`.

Callers pass the config's fields:
- `ai.service.generateContent` — reads `cfg.api_format` / `cfg.auth_style` for custom configs.
- `models/[provider]/discover.ts` — passes them so discovery uses the right protocol/endpoint.
- `settings.ts` POST (validate key) — passes them (validate against the chosen protocol/auth).

### Discovery

Already returns `{ supported, models }` and the modal falls back to manual when `supported:false`
or empty. OpenAI-format → `{base}/models`; Anthropic-format → `{base}/v1/models` (x-api-key);
Gemini-format → `{base}/v1beta/models?key=<key>`. For gateways without a models endpoint (OpenCode
Zen today) discovery returns empty → manual/bulk fallback (existing behavior, no change needed).

### Admin form

`AISettings.tsx` custom-provider add form gains:
- a **Select** "API format" (OpenAI-compatible / Anthropic-compatible / Gemini-compatible),
- a **Select** "Auth" (Bearer / api-key), shown only when format is `openai` (irrelevant otherwise),
- three **preset** buttons (NVIDIA build / Azure Foundry / OpenCode Zen) that fill
  `base_url` + `api_format` + `auth_style`.
The create payload (`aiAPI.customProviders.create`) already forwards the whole form object, so it
just needs the two fields added to `customForm` state.

## Error handling

- Wrong protocol/auth → the provider's `validateApiKey`/generate returns failure; surfaced as the
  existing toast / inline error. No new error paths.
- Discovery unsupported/empty → existing "Discovery unavailable" message + Manual tab.

## Testing

- **Unit (pure/lightweight):** `AnthropicCompatibleProvider.listModels` maps `{base}/v1/models`
  (mock fetch) like the OpenAI one; `OpenAICompatibleProvider` sends `api-key` header when
  `auth_style:'api_key'` and `Authorization: Bearer` otherwise (assert the headers passed to a
  mocked `fetch`). `createProvider` returns the Anthropic-compatible class for
  `api_format:'anthropic'`, the Gemini-compatible class for `api_format:'gemini'`, and the OpenAI one
  otherwise. `GeminiCompatibleProvider.listModels` maps `{base}/v1beta/models?key=` `models/<id>` → id.
- **Manual E2E (owner-driven):** add an Anthropic-compatible custom provider (e.g. OpenCode Zen
  `/anthropic`) → Test passes, generate works; add an Azure provider with `api-key` auth → Test
  passes; NVIDIA via preset → discover lists models.

## File structure

- **Modify:** `src/modules/ai/types.ts` (ApiFormat/AuthStyle, CustomProviderConfig)
- **Modify:** `src/modules/ai/settings-schema.ts`, `src/shared/validation/schemas/ai.ts` (Zod fields)
- **Create:** `src/modules/ai/providers/anthropic-compatible.provider.ts` (+ refactor `anthropic.provider.ts` to reuse it)
- **Create:** `src/modules/ai/providers/gemini-compatible.provider.ts` (+ refactor `gemini.provider.ts` to reuse it)
- **Modify:** `src/modules/ai/providers/openai-compatible.provider.ts` (auth_style), `providers/index.ts`
- **Modify:** `src/modules/ai/ai.service.ts` (`createProvider` opts + pass from config)
- **Modify:** `src/pages/api/admin/ai/custom-providers/index.ts`, `models/[provider]/discover.ts`, `settings.ts` (forward api_format/auth_style)
- **Modify:** `src/admin/features/settings/pages/tabs/AISettings.tsx` (selects + presets + form state)
- **Tests:** `src/modules/ai/__tests__/` (provider header/format + createProvider routing)
