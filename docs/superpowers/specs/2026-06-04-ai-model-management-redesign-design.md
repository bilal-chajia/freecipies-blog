# Design — AI Model Management Redesign: dynamic discovery + capabilities + snake_case

**Date:** 2026-06-04
**Branch:** `migrate/recipe-equipment-canonical`
**Status:** Approved design — ready for implementation planning.
**Related:** `.hermes/plans/2026-06-03_contract-audit-report.md` (#3), `docs/NAMING_CONTRACT.md`,
`docs/superpowers/specs/2026-06-04-snake-case-all-resources-design.md` (sibling — Drizzle resources).

## Problem

The AI subsystem (`src/modules/ai`, `src/pages/api/admin/ai`, the admin AI UI, and
`src/shared/validation/schemas/ai.ts`) carries the largest remaining Contract Audit #3 camelCase
debt (~24 files, ~300 occurrences). A review of its model-management logic surfaced deeper design
problems beyond casing:

1. **Hardcoded model catalog that goes stale.** `AVAILABLE_MODELS` in `types.ts` (already
   `@deprecated`) is the only place models are defined. Providers deprecate models and ship new
   ones constantly; the catalog requires a code change + redeploy, or a manual `migrate-models`
   run, to stay current. The admin UI (`ModelManager`, `BulkImportModels`) only supports manual
   entry / pasting JSON — tedious and error-prone.
2. **Data-loss merge bug.** `saveAISettings` does a shallow `{ ...current, ...settings }`; a partial
   `providers` payload replaces the whole providers map, dropping other providers' keys/models.
3. **Plaintext API keys** stored in `site_settings` JSON and potentially returned to the client.
4. **No validation** of the stored blob (raw `JSON.parse` + spread).
5. **camelCase** throughout, including the stored blob (Audit #3).
6. **No reconciliation** when a selected model becomes obsolete.
7. **No support** for thinking/reasoning controls; discovery would also surface non-text
   (image/TTS/embedding) models the text-generation flow can't use.
8. **Providers are hardcoded** (enum + factory switch + one class each); new providers need code.

## Goal

Replace the static catalog with **live discovery from each provider's models API**, store only the
admin's **curated selection** (snake_case), make persistence safe and validated, keep API keys
write-only, support **admin-added OpenAI-compatible custom providers**, handle **model
obsolescence**, add a **thinking/reasoning** control, and **filter discovery to text models** while
recording modality for future image/TTS work. This simultaneously closes the AI portion of Audit #3.

## Architecture overview

```
[Admin] key + enable ──PUT /admin/ai/settings──▶ ai_settings (deep per-provider merge, key write-only, Zod-validated)
[Admin] "Fetch models" ──GET /admin/ai/models/:provider/discover──▶ provider.listModels(key) ──▶ live provider /models API
                                                       │ normalize snake_case + classify modality + reconcile vs stored
                                          discovered list (status/selected flags, text-only)
[Admin] tick + order ──PUT /admin/ai/settings──▶ providers[p].models[] (curated selection)
[Admin] defaults ──PUT /admin/ai/settings──▶ default_provider / default_model / temperature / system_prompt
                                                       │
[Editor] GET /admin/ai/providers ──▶ configured providers + enabled models (NO key)
[Editor] POST /admin/ai/generate {provider?, model?, reasoning_effort?} ──▶ generateContent() ──▶ provider API ──▶ content
```

## Components

### 1. Stored shape (`site_settings.ai_settings`, snake_case, selection-only)

```jsonc
{
  "default_provider": "openai",
  "default_model": "gpt-5.1-chat-latest",
  "temperature": 0.7,
  "system_prompt": "...",
  "providers": {                                  // 10 built-in providers
    "openai": {
      "enabled": true,
      "api_key": "sk-...",                         // write-only; never serialized to client
      "models": [ /* ModelSelection[] */ ]
    }
  },
  "custom_providers": {                            // admin-added, OpenAI-compatible
    "my-endpoint": {
      "label": "My Endpoint",
      "base_url": "https://api.example.com/v1",
      "api_key": "...",
      "enabled": true,
      "models": [ /* ModelSelection[] */ ]
    }
  }
}
```

`ModelSelection`:
```jsonc
{
  "id": "gpt-5.1-chat-latest",
  "name": "GPT-5.1 Chat",
  "context_window": 131072,
  "max_tokens": 65536,
  "modality": "text",
  "supports_thinking": false,
  "enabled": true,
  "order": 0,
  "deprecated": false,
  "status": "available",                          // available | unavailable | deprecated
  "source": "discovered"                          // discovered | manual
}
```

The `models` array is the curated selection — there is no code catalog. Discovery proposes
candidates; only ticked models are stored.

### 2. Provider discovery (`IAIProvider.listModels`)

Extend the provider interface:
```ts
listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }>;
```
`DiscoveredModel` is the normalized snake_case shape (`id, name?, context_window?, max_tokens?,
modality, supports_thinking?, deprecated?`). Implementations call the provider's models endpoint
(several already hit it inside `validateApiKey`: openai, gemini, openrouter, mistral, moonshot,
xai). Providers without a usable list endpoint return `{ supported: false }`; the UI falls back to
manual add / bulk import.

**Modality classification & filtering:** each provider's normalizer classifies models and the
discover endpoint returns **text/chat-generation models only**. Non-text models (image, tts,
embeddings) are excluded from selection but their `modality` is recorded in the normalized shape so
a future image/TTS flow can reuse the classifier. Classification is per-provider heuristic
(endpoint metadata where available, else id patterns).

**Thinking capability:** `supports_thinking` is derived during discovery (provider metadata or id
heuristics for reasoning models) and may be overridden manually.

### 3. Discovery endpoint

`GET /api/admin/ai/models/:provider/discover` (admin role):
- Reads the stored `api_key` for `:provider` (built-in or custom).
- Calls `provider.listModels(key)`.
- **Reconciles** against the stored selection: each returned model flagged `selected` if already
  chosen; each stored model absent from the live list flagged `status: "unavailable"`; provider-
  flagged deprecations flagged `status: "deprecated"`.
- Returns the merged view for the UI. Requires a configured key; returns a clear error if missing
  or rejected (401).

### 4. Custom OpenAI-compatible providers

- `OpenAICompatibleProvider` class: chat-completions + `/models` against a configured `base_url`
  with bearer `api_key`.
- `AIProvider` type becomes the 10 built-in union **plus** dynamic custom ids drawn from
  `ai_settings.custom_providers`. The factory resolves built-ins via the existing switch and any
  other id via `OpenAICompatibleProvider` using the stored `base_url`.
- CRUD endpoints to add/edit/remove custom providers (admin role), persisted under
  `custom_providers`.

### 5. Safe persistence + validation

- `saveAISettings` performs a **deep per-provider / per-custom-provider merge** — never replaces the
  whole `providers` / `custom_providers` map. Per-provider fields (`api_key`, `enabled`, `models`)
  merge individually; omitted fields are preserved.
- A Zod schema models the full stored blob; `getAISettings` parses, validates, and falls back to
  `DEFAULT_AI_SETTINGS` on invalid/corrupt data; `saveAISettings` validates the merged result
  before writing.

### 6. API key security (write-only)

- `GET /api/admin/ai/settings` strips every `api_key`, returning `has_api_key: boolean` (and a
  masked hint such as `••••1234`).
- `PUT`: an `api_key` present sets it; omitted leaves it unchanged; explicit empty/null clears it.
- `getConfiguredProviders` / `generate` read the real key server-side only.

### 7. Obsolescence handling

- Reconciliation (component 3) marks stored selections `available | unavailable | deprecated`.
- If `default_provider`/`default_model` resolves to an unavailable model, `getAISettings`-derived
  resolution **falls back** to the first enabled available model and surfaces a warning in the
  settings response.
- `generateContent` maps provider "model not found"/404 to a clear `AppError`.
- UI shows status badges and a "remove unavailable" action.

### 8. Thinking / reasoning control

- `GenerateContentRequest` / `GenerateSchema` gain optional `reasoning_effort: 'low'|'medium'|'high'`.
- Each provider maps it at the call boundary to its native parameter (OpenAI `reasoning_effort`,
  Anthropic `thinking.budget_tokens`, deepseek reasoner mode, etc.); providers that don't support it
  ignore it.
- The editor AI UI shows the reasoning control only for models with `supports_thinking`.

### 9. snake_case end to end (Audit #3 closure for AI)

- `src/shared/validation/schemas/ai.ts`, `src/modules/ai/*` (service, types, providers),
  `src/pages/api/admin/ai/*`, admin UI (`ModelManager`, `BulkImportModels`, `AISettings` ×2,
  `Settings.tsx`), and `src/admin/services/api.ts` use snake_case for all app-owned data keys.
- **Allowed exception:** external provider SDK/HTTP request and response field names keep the
  provider's naming **only at the integration boundary** inside each provider class (per
  `NAMING_CONTRACT` "Allowed Exceptions"). Everything app-owned (stored shape, our API
  request/response envelopes, admin props) is snake_case.

### 10. Data migration (one-shot)

A dry-run/`--apply` script (mirroring `scripts/migrate-credit-avatar-r2key.mts`) converts the
existing stored `ai_settings` blob:
- camelCase → snake_case keys.
- per-provider `availableModels` → the new `models` selection shape (preserve `enabled`, ids;
  set `source: "discovered"`, `status: "available"`, `modality: "text"`).
- preserve API keys and `enabled` flags; preserve `default_provider`/`default_model`/`temperature`/
  `system_prompt`.

### 11. Cleanup

- Remove `AVAILABLE_MODELS` and the `migrate-models` endpoint (obsolete under live discovery).
- `BulkImportModels` and manual add remain as the fallback for providers without a list endpoint
  and for custom/proxy models.

## Out of scope

- Image / TTS / audio / embedding **generation flows** (only modality *classification* is added now).
- Encryption at rest for API keys (write-only + masking is the agreed bar).
- Adding net-new first-class built-in providers (custom OpenAI-compatible covers runtime additions).
- Provider SDK internals beyond the `listModels` + `reasoning_effort` additions.

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Provider lacks a `/models` endpoint | `listModels` returns `supported: false`; UI falls back to manual/bulk |
| Discovery returns non-text models | Per-provider modality classifier filters to text; modality stored for later |
| Open-ended `AIProvider` type (custom ids) breaks exhaustive switches | Factory: built-in switch + default → `OpenAICompatibleProvider`; type = union ∪ string-branded custom id |
| Deep-merge regressions | Zod-validate merged blob before write; unit-test merge with partial payloads |
| Data migration corrupts live AI settings | Dry-run first; back up the row; idempotent; preserves keys/defaults |
| `reasoning_effort` unsupported by a provider | Mapped only where supported; ignored elsewhere |
| Stored blob invalid after migration | `getAISettings` validates + falls back to `DEFAULT_AI_SETTINGS` |

## Verification

- Unit tests: discovery normalizers (per provider) + modality classification; deep-merge
  persistence with partial payloads; obsolescence reconciliation; stored-blob Zod validation;
  key-masking on GET.
- `pnpm test`, `pnpm check:boundaries`, `pnpm typecheck` green.
- `node scripts/local-contract-audit.mjs --summary`: no new camelCase violations from AI.
- Manual smoke (where feasible): configure a provider key → discover → select → set default →
  generate in the editor; toggle a reasoning model.
