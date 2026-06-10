# AI Model Management Redesign Implementation Plan

> **Status: COMPLETED** (all tasks done; module shipped with tests).

> **STATUS — 2026-06-04: ✅ COMPLETED, REVIEWED & FIXED.** All phases implemented (snake_case types/store/discovery/providers/custom providers/endpoints/reasoning/admin UI + data migration). Code review fixes applied (`a71be82`: anthropic max_tokens>budget, provider-id collision guard, un-deprecate, editor reasoning_effort). Stored `ai_settings` blob migrated locally (`migrate-ai-settings --apply`). Verified: typecheck 0 · tests green · boundaries ✅. Ops: run `migrate-ai-settings --apply` on prod D1 at deploy.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded AI model catalog with live per-provider discovery, store only the admin's curated snake_case selection with safe validated persistence and write-only keys, add OpenAI-compatible custom providers, model-obsolescence reconciliation, and a thinking/reasoning control — closing the AI portion of Contract Audit #3.

**Architecture:** Pure-logic units (snake_case types, Zod stored-blob schema, deep-merge persistence, key masking, model normalization/modality classification, obsolescence reconciliation) are built test-first. Provider `listModels` implementations share one OpenAI-style normalizer. API routes, the admin UI, and the client are migrated to snake_case and wired to discovery. A one-shot script migrates the existing stored blob.

**Tech Stack:** Cloudflare D1 (`site_settings`), Zod, Astro API routes, React admin SPA, Vitest, `node:sqlite` for the migration script.

**Spec:** `docs/superpowers/specs/2026-06-04-ai-model-management-redesign-design.md`

---

## Conventions (read once)

- **snake_case** for all app-owned data keys (stored blob, our API envelopes, admin props, types
  that model them). Local variables/functions/React state may stay camelCase (`NAMING_CONTRACT`
  L21). External provider HTTP request/response field names stay as the provider names **only
  inside each provider class** at the fetch boundary (Allowed Exception).
- **TDD** for pure units (types are compile-time; logic units get a failing test first). Mechanical
  snake_case renames and UI wiring are verified by `pnpm test && pnpm check:boundaries &&
  pnpm typecheck`.
- **Run between every task:** `pnpm test && pnpm check:boundaries && pnpm typecheck`. All must be
  green before the task's commit.
- Test files live next to the code under `__tests__/` per existing convention
  (e.g. `src/modules/ai/__tests__/...`).

## File structure (created / modified)

- `src/modules/ai/types.ts` — replace AISettings/AIModel/AVAILABLE_MODELS with snake_case
  `AiSettings`, `ModelSelection`, `DiscoveredModel`, capability enums; keep `ALL_PROVIDERS`,
  `PROVIDER_INFO`, `DEFAULT_AI_SETTINGS` (snake).
- `src/modules/ai/settings-schema.ts` (new) — Zod schema for the stored blob.
- `src/modules/ai/settings-store.ts` (new) — `getAiSettings` / `saveAiSettings` (deep merge +
  validate) extracted from `ai.service.ts`.
- `src/modules/ai/api-key.ts` (new) — `maskApiKey`, `stripApiKeys`.
- `src/modules/ai/discovery/normalize.ts` (new) — `normalizeOpenAiModels`, `classifyModality`,
  `detectThinking`.
- `src/modules/ai/discovery/reconcile.ts` (new) — `reconcileSelection`.
- `src/modules/ai/providers/openai-compatible.provider.ts` (new) — generic custom provider.
- `src/modules/ai/providers/*.provider.ts` — add `listModels`; snake_case app-owned fields.
- `src/modules/ai/ai.service.ts` — discovery resolution, generate with `reasoning_effort`,
  open-ended factory.
- `src/shared/validation/schemas/ai.ts` — snake_case Zod schemas + `reasoning_effort`.
- `src/pages/api/admin/ai/models/[provider]/discover.ts` (new) — discovery endpoint.
- `src/pages/api/admin/ai/settings.ts`, `providers.ts`, `generate.ts`,
  `models/[provider]/[modelId].ts`, `models/[provider].ts` — snake_case + masking + custom CRUD.
- `src/pages/api/admin/ai/migrate-models.ts` — **delete**.
- `src/pages/api/admin/ai/custom-providers/*` (new) — custom provider CRUD.
- `src/admin/components/ModelManager.tsx`, `BulkImportModels.tsx`,
  `src/admin/features/settings/pages/tabs/AISettings.tsx`,
  `src/admin/components/BlockEditor/components/AISettings.tsx`,
  `src/admin/features/settings/pages/Settings.tsx`, `src/admin/services/api.ts` — snake_case +
  discovery UX + `has_api_key`.
- `scripts/migrate-ai-settings.mts` (new) — one-shot stored-blob migration.

---

## Phase 0 — snake_case types & defaults

**Files:**
- Modify: `src/modules/ai/types.ts`

- [x] **Step 1: Replace the data-shape interfaces with snake_case**

Replace `AIModel`, `AISettings`, `DEFAULT_AI_SETTINGS`, and remove `AVAILABLE_MODELS`. Keep
`AIProvider`, `ALL_PROVIDERS`, `PROVIDER_INFO`, `IAIProvider`, `GenerateContentRequest`,
`GeneratedRecipe`. New definitions:

```ts
/** Built-in provider id, or a custom OpenAI-compatible provider id (slug). */
export type BuiltInProvider =
  | 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'openrouter'
  | 'qwen' | 'zhipu' | 'moonshot' | 'mistral' | 'xai';
export type AIProvider = BuiltInProvider | (string & {});

export type ModelModality = 'text' | 'image' | 'audio' | 'embedding' | 'other';
export type ModelStatus = 'available' | 'unavailable' | 'deprecated';

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
}

export interface AiSettings {
  default_provider: AIProvider;
  default_model: string;
  temperature: number;
  system_prompt: string;
  providers: Partial<Record<BuiltInProvider, ProviderConfig>>;
  custom_providers: Record<string, CustomProviderConfig>;
}

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
```

Update `GenerateContentRequest` to snake_case app-owned fields and add the reasoning control:

```ts
export interface GenerateContentRequest {
  prompt: string;
  content_type: 'recipe' | 'article' | 'roundup';
  provider: AIProvider;
  model: string;
  temperature?: number;
  system_prompt?: string;
  reasoning_effort?: 'low' | 'medium' | 'high';
}
```

- [x] **Step 2: Typecheck (expect downstream breakages — they are fixed in later phases)**

Run: `pnpm typecheck 2>&1 | head -40`
Expected: errors only in AI files that consume the old names (ai.service, providers, endpoints,
admin). These are addressed in Phases 1–7. Do NOT fix unrelated files here.

- [x] **Step 3: Commit**

```bash
git add src/modules/ai/types.ts
git commit -m "refactor(ai): snake_case AiSettings + add discovery/selection model types"
```

> Note for the executor: Phases 0–7 form one compile-coherent unit. Commit per phase, but
> `pnpm typecheck` only returns fully green at the end of Phase 7. Phases that CAN be green in
> isolation (1, 2, 3, 8) state so; Phases 0, 4–7 may leave typecheck red until Phase 7. Each
> phase's own unit tests must pass.

---

## Phase 1 — safe persistence, validation, key masking

**Files:**
- Create: `src/modules/ai/settings-schema.ts`
- Create: `src/modules/ai/api-key.ts`
- Create: `src/modules/ai/settings-store.ts`
- Create: `src/modules/ai/__tests__/settings-store.test.ts`
- Create: `src/modules/ai/__tests__/api-key.test.ts`

- [x] **Step 1: Write failing tests for api-key masking**

`src/modules/ai/__tests__/api-key.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { maskApiKey, stripApiKeys } from '../api-key';

describe('maskApiKey', () => {
  it('masks all but the last 4 chars', () => {
    expect(maskApiKey('sk-abcdef1234')).toBe('••••1234');
  });
  it('returns empty string for empty/undefined', () => {
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey(undefined)).toBe('');
  });
});

describe('stripApiKeys', () => {
  it('replaces api_key with has_api_key + masked across providers and custom_providers', () => {
    const out = stripApiKeys({
      default_provider: 'openai', default_model: 'm', temperature: 0.7, system_prompt: 's',
      providers: { openai: { enabled: true, api_key: 'sk-xxxx9999', models: [] } },
      custom_providers: { c1: { label: 'C', base_url: 'u', enabled: true, api_key: 'k-1111', models: [] } },
    });
    expect(out.providers.openai).toMatchObject({ has_api_key: true, api_key_masked: '••••9999' });
    expect('api_key' in out.providers.openai).toBe(false);
    expect(out.custom_providers.c1).toMatchObject({ has_api_key: true, api_key_masked: '••••1111' });
    expect('api_key' in out.custom_providers.c1).toBe(false);
  });
});
```

Run: `pnpm test src/modules/ai/__tests__/api-key.test.ts` → Expected: FAIL (module missing).

- [x] **Step 2: Implement `api-key.ts`**

```ts
import type { AiSettings } from './types';

export function maskApiKey(key: string | undefined): string {
  if (!key) return '';
  return `••••${key.slice(-4)}`;
}

type StrippedProvider = { enabled: boolean; models: unknown[]; has_api_key: boolean; api_key_masked: string };

function strip<T extends { api_key: string }>(cfg: T): Omit<T, 'api_key'> & { has_api_key: boolean; api_key_masked: string } {
  const { api_key, ...rest } = cfg;
  return { ...rest, has_api_key: Boolean(api_key), api_key_masked: maskApiKey(api_key) };
}

export function stripApiKeys(settings: AiSettings) {
  return {
    ...settings,
    providers: Object.fromEntries(
      Object.entries(settings.providers).map(([k, v]) => [k, strip(v!)]),
    ),
    custom_providers: Object.fromEntries(
      Object.entries(settings.custom_providers).map(([k, v]) => [k, strip(v)]),
    ),
  };
}
```

Run: `pnpm test src/modules/ai/__tests__/api-key.test.ts` → Expected: PASS.

- [x] **Step 3: Implement the Zod stored-blob schema (`settings-schema.ts`)**

```ts
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
});

export const AiSettingsSchema = z.object({
  default_provider: z.string().min(1),
  default_model: z.string().default(''),
  temperature: z.number().min(0).max(2).default(0.7),
  system_prompt: z.string().default(''),
  providers: z.record(z.string(), ProviderConfigSchema).default({}),
  custom_providers: z.record(z.string(), CustomProviderConfigSchema).default({}),
});
```

- [x] **Step 4: Write failing tests for the store (deep merge + validate + fallback)**

`src/modules/ai/__tests__/settings-store.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { mergeAiSettings } from '../settings-store';
import { DEFAULT_AI_SETTINGS } from '../types';

describe('mergeAiSettings', () => {
  it('deep-merges one provider without dropping others', () => {
    const current = {
      ...DEFAULT_AI_SETTINGS,
      providers: {
        openai: { enabled: true, api_key: 'sk-1', models: [] },
        gemini: { enabled: true, api_key: 'g-1', models: [] },
      },
    };
    const merged = mergeAiSettings(current, { providers: { openai: { enabled: false } } });
    expect(merged.providers.gemini).toEqual({ enabled: true, api_key: 'g-1', models: [] });
    expect(merged.providers.openai).toMatchObject({ enabled: false, api_key: 'sk-1' });
  });

  it('keeps existing api_key when the patch omits it', () => {
    const current = { ...DEFAULT_AI_SETTINGS, providers: { openai: { enabled: true, api_key: 'sk-keep', models: [] } } };
    const merged = mergeAiSettings(current, { providers: { openai: { models: [] } } });
    expect(merged.providers.openai.api_key).toBe('sk-keep');
  });
});
```

Run: `pnpm test src/modules/ai/__tests__/settings-store.test.ts` → Expected: FAIL.

- [x] **Step 5: Implement `settings-store.ts`**

```ts
import type { D1Database } from '@cloudflare/workers-types';
import type { AiSettings } from './types';
import { DEFAULT_AI_SETTINGS } from './types';
import { AiSettingsSchema } from './settings-schema';

const AI_SETTINGS_KEY = 'ai_settings';

function mergeProviderMap<T extends Record<string, any>>(current: T, patch: Partial<T> | undefined): T {
  if (!patch) return current;
  const out: Record<string, any> = { ...current };
  for (const [id, cfg] of Object.entries(patch)) {
    out[id] = { ...(current[id] ?? {}), ...(cfg as object) };
  }
  return out as T;
}

export function mergeAiSettings(current: AiSettings, patch: Partial<AiSettings>): AiSettings {
  return {
    ...current,
    ...patch,
    providers: mergeProviderMap(current.providers, patch.providers),
    custom_providers: mergeProviderMap(current.custom_providers, patch.custom_providers),
  };
}

export async function getAiSettings(db: D1Database): Promise<AiSettings> {
  try {
    const row = await db.prepare('SELECT value FROM site_settings WHERE key = ?')
      .bind(AI_SETTINGS_KEY).first<{ value: string }>();
    if (row?.value) {
      const parsed = AiSettingsSchema.safeParse(JSON.parse(row.value));
      if (parsed.success) return parsed.data as AiSettings;
      console.error('Invalid ai_settings blob, using defaults:', parsed.error.issues);
    }
  } catch (e) {
    console.error('Failed to load AI settings:', e);
  }
  return DEFAULT_AI_SETTINGS;
}

export async function saveAiSettings(db: D1Database, patch: Partial<AiSettings>): Promise<boolean> {
  try {
    const merged = mergeAiSettings(await getAiSettings(db), patch);
    const validated = AiSettingsSchema.parse(merged);
    await db.prepare(`
      INSERT INTO site_settings (key, value, category, type, updated_at)
      VALUES (?, ?, 'ai', 'json', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).bind(AI_SETTINGS_KEY, JSON.stringify(validated)).run();
    return true;
  } catch (e) {
    console.error('Failed to save AI settings:', e);
    return false;
  }
}
```

Run: `pnpm test src/modules/ai/__tests__/settings-store.test.ts src/modules/ai/__tests__/api-key.test.ts`
→ Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/modules/ai/settings-schema.ts src/modules/ai/api-key.ts src/modules/ai/settings-store.ts src/modules/ai/__tests__/settings-store.test.ts src/modules/ai/__tests__/api-key.test.ts
git commit -m "feat(ai): validated deep-merge settings store + write-only key masking"
```

---

## Phase 2 — discovery core (normalize, classify, reconcile) + openai listModels

**Files:**
- Create: `src/modules/ai/discovery/normalize.ts`
- Create: `src/modules/ai/discovery/reconcile.ts`
- Create: `src/modules/ai/__tests__/normalize.test.ts`
- Create: `src/modules/ai/__tests__/reconcile.test.ts`
- Modify: `src/modules/ai/types.ts` (add `listModels` to `IAIProvider`)
- Modify: `src/modules/ai/providers/openai.provider.ts`

- [x] **Step 1: Write failing tests for `normalize.ts`**

`src/modules/ai/__tests__/normalize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { classifyModality, detectThinking, normalizeOpenAiModels } from '../discovery/normalize';

describe('classifyModality', () => {
  it('classifies known non-text ids', () => {
    expect(classifyModality('dall-e-3')).toBe('image');
    expect(classifyModality('gpt-image-1')).toBe('image');
    expect(classifyModality('tts-1')).toBe('audio');
    expect(classifyModality('text-embedding-3-large')).toBe('embedding');
    expect(classifyModality('gpt-5.1-chat-latest')).toBe('text');
  });
});

describe('detectThinking', () => {
  it('flags reasoning model ids', () => {
    expect(detectThinking('o3-mini')).toBe(true);
    expect(detectThinking('deepseek-reasoner')).toBe(true);
    expect(detectThinking('gpt-4o')).toBe(false);
  });
});

describe('normalizeOpenAiModels', () => {
  it('maps an OpenAI /v1/models list to text-only DiscoveredModel[]', () => {
    const raw = { data: [{ id: 'gpt-5.1-chat-latest' }, { id: 'dall-e-3' }, { id: 'tts-1' }] };
    const models = normalizeOpenAiModels(raw);
    expect(models.map(m => m.id)).toEqual(['gpt-5.1-chat-latest']);
    expect(models[0]).toMatchObject({ id: 'gpt-5.1-chat-latest', modality: 'text', supports_thinking: false });
  });
});
```

Run: `pnpm test src/modules/ai/__tests__/normalize.test.ts` → Expected: FAIL.

- [x] **Step 2: Implement `discovery/normalize.ts`**

```ts
import type { DiscoveredModel, ModelModality } from '../types';

const IMAGE_RE = /(dall-e|gpt-image|imagen|stable-diffusion|flux)/i;
const AUDIO_RE = /(tts|whisper|audio|speech|voice)/i;
const EMBED_RE = /(embedding|embed|rerank)/i;
const THINK_RE = /(^o\d|reason|thinking|-r1\b|deepseek-reasoner)/i;

export function classifyModality(id: string): ModelModality {
  if (IMAGE_RE.test(id)) return 'image';
  if (AUDIO_RE.test(id)) return 'audio';
  if (EMBED_RE.test(id)) return 'embedding';
  return 'text';
}

export function detectThinking(id: string): boolean {
  return THINK_RE.test(id);
}

/** Normalize an OpenAI-compatible `{ data: [{ id }] }` models response to text-only models. */
export function normalizeOpenAiModels(raw: unknown): DiscoveredModel[] {
  const data = (raw as { data?: Array<{ id?: string }> })?.data ?? [];
  return data
    .map((m) => m?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .map((id) => ({ id, modality: classifyModality(id), supports_thinking: detectThinking(id) }))
    .filter((m) => m.modality === 'text');
}
```

Run: `pnpm test src/modules/ai/__tests__/normalize.test.ts` → Expected: PASS.

- [x] **Step 3: Write failing tests for `reconcile.ts`**

`src/modules/ai/__tests__/reconcile.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { reconcileSelection } from '../discovery/reconcile';

describe('reconcileSelection', () => {
  const discovered = [{ id: 'a', modality: 'text' as const }, { id: 'b', modality: 'text' as const, deprecated: true }];
  it('marks selected, deprecated, and unavailable', () => {
    const stored = [
      { id: 'a', enabled: true, order: 0, modality: 'text' as const, status: 'available' as const, source: 'discovered' as const },
      { id: 'gone', enabled: true, order: 1, modality: 'text' as const, status: 'available' as const, source: 'discovered' as const },
    ];
    const view = reconcileSelection(stored, discovered);
    expect(view.find(m => m.id === 'a')).toMatchObject({ selected: true, status: 'available' });
    expect(view.find(m => m.id === 'b')).toMatchObject({ selected: false, status: 'deprecated' });
    expect(view.find(m => m.id === 'gone')).toMatchObject({ selected: true, status: 'unavailable' });
  });
});
```

Run: `pnpm test src/modules/ai/__tests__/reconcile.test.ts` → Expected: FAIL.

- [x] **Step 4: Implement `discovery/reconcile.ts`**

```ts
import type { DiscoveredModel, ModelSelection, ModelStatus } from '../types';

export interface ReconciledModel extends DiscoveredModel {
  selected: boolean;
  status: ModelStatus;
}

export function reconcileSelection(
  stored: ModelSelection[],
  discovered: DiscoveredModel[],
): ReconciledModel[] {
  const storedById = new Map(stored.map((m) => [m.id, m]));
  const discoveredById = new Map(discovered.map((m) => [m.id, m]));

  const out: ReconciledModel[] = discovered.map((d) => ({
    ...d,
    selected: storedById.has(d.id),
    status: d.deprecated ? 'deprecated' : 'available',
  }));

  for (const s of stored) {
    if (!discoveredById.has(s.id)) {
      out.push({ id: s.id, name: s.name, modality: s.modality, supports_thinking: s.supports_thinking, selected: true, status: 'unavailable' });
    }
  }
  return out;
}
```

Run: `pnpm test src/modules/ai/__tests__/reconcile.test.ts` → Expected: PASS.

- [x] **Step 5: Add `listModels` to `IAIProvider` and implement it for OpenAI**

In `types.ts`, extend the interface:
```ts
export interface ListModelsResult { supported: boolean; models: DiscoveredModel[]; }
export interface IAIProvider {
  readonly provider: AIProvider;
  generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
  validateApiKey(apiKey: string): Promise<boolean>;
  listModels(apiKey: string): Promise<ListModelsResult>;
}
```

In `openai.provider.ts`, add the method (reuse the existing `/v1/models` fetch):
```ts
import { normalizeOpenAiModels } from '../discovery/normalize';
// ...
async listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { supported: true, models: [] };
    return { supported: true, models: normalizeOpenAiModels(await res.json()) };
  } catch {
    return { supported: true, models: [] };
  }
}
```
Add the `DiscoveredModel` import to `openai.provider.ts`.

- [x] **Step 6: Run the phase tests**

Run: `pnpm test src/modules/ai/__tests__/normalize.test.ts src/modules/ai/__tests__/reconcile.test.ts`
→ Expected: PASS. (Full `pnpm typecheck` is still red until other providers gain `listModels` in
Phase 3 — expected.)

- [x] **Step 7: Commit**

```bash
git add src/modules/ai/discovery src/modules/ai/__tests__/normalize.test.ts src/modules/ai/__tests__/reconcile.test.ts src/modules/ai/types.ts src/modules/ai/providers/openai.provider.ts
git commit -m "feat(ai): discovery normalizer + obsolescence reconcile + openai listModels"
```

---

## Phase 3 — `listModels` for the remaining built-in providers

**Files:**
- Modify: `src/modules/ai/providers/{gemini,openrouter,mistral,moonshot,xai,anthropic,deepseek,qwen,zhipu}.provider.ts`

For each provider class, add a `listModels(apiKey)` method using the provider's models endpoint and
the shared normalizer where the response is OpenAI-shaped.

- [x] **Step 1: OpenAI-compatible `/v1/models` providers**

For `openrouter` (`https://openrouter.ai/api/v1/models`), `mistral`
(`https://api.mistral.ai/v1/models`), `moonshot` (`https://api.moonshot.cn/v1/models`), `xai`
(`https://api.x.ai/v1/models`), `deepseek` (`https://api.deepseek.com/models`), `anthropic`
(`https://api.anthropic.com/v1/models`, header `x-api-key` + `anthropic-version: 2023-06-01`), add:

```ts
import { normalizeOpenAiModels } from '../discovery/normalize';
// ...
async listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
  try {
    const res = await fetch('<PROVIDER_MODELS_URL>', { headers: { <AUTH_HEADERS> } });
    if (!res.ok) return { supported: true, models: [] };
    return { supported: true, models: normalizeOpenAiModels(await res.json()) };
  } catch {
    return { supported: true, models: [] };
  }
}
```
Use `Authorization: Bearer ${apiKey}` for all except anthropic (`'x-api-key': apiKey,
'anthropic-version': '2023-06-01'`). Anthropic and OpenRouter return `{ data: [{ id }] }`, which
`normalizeOpenAiModels` already handles.

- [x] **Step 2: Gemini (different response shape)**

`gemini.provider.ts` — endpoint `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
returns `{ models: [{ name: 'models/gemini-...' }] }`. Add a small local mapper:
```ts
async listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return { supported: true, models: [] };
    const raw = await res.json() as { models?: Array<{ name?: string }> };
    const ids = (raw.models ?? []).map(m => (m.name ?? '').replace(/^models\//, '')).filter(Boolean);
    const models = ids.map(id => ({ id, modality: classifyModality(id), supports_thinking: detectThinking(id) }))
      .filter(m => m.modality === 'text');
    return { supported: true, models };
  } catch {
    return { supported: true, models: [] };
  }
}
```
Import `classifyModality, detectThinking` from `../discovery/normalize`.

- [x] **Step 3: Providers without a usable list endpoint**

For `qwen` and `zhipu`, return unsupported so the UI falls back to manual/bulk:
```ts
async listModels(): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
  return { supported: false, models: [] };
}
```
(If during implementation a working models endpoint is confirmed for either, implement it like
Step 1 instead. Default to `supported: false` when unverified.)

- [x] **Step 4: Verify every provider satisfies `IAIProvider`**

Run: `pnpm typecheck 2>&1 | rg "provider" | head`
Expected: no "Property 'listModels' is missing" errors for any provider class. (Other AI files may
still be red until Phase 7.)

- [x] **Step 5: Commit**

```bash
git add src/modules/ai/providers
git commit -m "feat(ai): listModels for all built-in providers (qwen/zhipu fall back to manual)"
```

---

## Phase 4 — custom OpenAI-compatible providers

**Files:**
- Create: `src/modules/ai/providers/openai-compatible.provider.ts`
- Modify: `src/modules/ai/ai.service.ts` (factory: default branch → custom provider)
- Create: `src/pages/api/admin/ai/custom-providers/index.ts` (GET list, POST create)
- Create: `src/pages/api/admin/ai/custom-providers/[id].ts` (PUT update, DELETE)
- Modify: `src/shared/validation/schemas/ai.ts` (custom provider schemas)
- Create: `src/modules/ai/__tests__/openai-compatible.test.ts`

- [x] **Step 1: Failing test for the generic provider's normalization**

`src/modules/ai/__tests__/openai-compatible.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAICompatibleProvider } from '../providers/openai-compatible.provider';

afterEach(() => vi.restoreAllMocks());

describe('OpenAICompatibleProvider.listModels', () => {
  it('lists text models from a custom base_url', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'custom-chat' }, { id: 'tts-x' }] }), { status: 200 }),
    );
    const p = new OpenAICompatibleProvider('my-endpoint', 'https://api.example.com/v1', 'k');
    const out = await p.listModels('k');
    expect(out.supported).toBe(true);
    expect(out.models.map(m => m.id)).toEqual(['custom-chat']);
  });
});
```

Run: `pnpm test src/modules/ai/__tests__/openai-compatible.test.ts` → Expected: FAIL.

- [x] **Step 2: Implement `openai-compatible.provider.ts`**

```ts
import type { IAIProvider, GenerateContentRequest, GenerateContentResponse, DiscoveredModel } from '../types';
import { getSystemPrompt } from '../prompts';
import { normalizeOpenAiModels } from '../discovery/normalize';

export class OpenAICompatibleProvider implements IAIProvider {
  readonly provider: string;
  constructor(provider: string, private baseUrl: string, private apiKey: string) {
    this.provider = provider;
  }
  private url(path: string) { return `${this.baseUrl.replace(/\/$/, '')}${path}`; }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    const systemPrompt = getSystemPrompt(request.content_type, request.system_prompt);
    try {
      const res = await fetch(this.url('/chat/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: request.model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: request.prompt }],
          temperature: request.temperature ?? 0.7,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (data.error) return { success: false, error: data.error.message || 'Provider error' };
      const text = data.choices?.[0]?.message?.content;
      if (!text) return { success: false, error: 'No content generated' };
      return { success: true, data: JSON.parse(text) };
    } catch (e) {
      return { success: false, error: `Generation failed: ${e instanceof Error ? e.message : 'Unknown error'}` };
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try { return (await fetch(this.url('/models'), { headers: { Authorization: `Bearer ${apiKey}` } })).ok; }
    catch { return false; }
  }

  async listModels(apiKey: string): Promise<{ supported: boolean; models: DiscoveredModel[] }> {
    try {
      const res = await fetch(this.url('/models'), { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) return { supported: true, models: [] };
      return { supported: true, models: normalizeOpenAiModels(await res.json()) };
    } catch { return { supported: true, models: [] }; }
  }
}
```

Run: `pnpm test src/modules/ai/__tests__/openai-compatible.test.ts` → Expected: PASS.

- [x] **Step 3: Open the factory to custom providers (`ai.service.ts`)**

Change `createProvider` to accept an optional base_url and route unknown ids to the generic class:
```ts
export function createProvider(provider: AIProvider, apiKey: string, baseUrl?: string): IAIProvider {
  switch (provider) {
    case 'gemini': return new GeminiProvider(apiKey);
    case 'openai': return new OpenAIProvider(apiKey);
    case 'anthropic': return new AnthropicProvider(apiKey);
    case 'deepseek': return new DeepSeekProvider(apiKey);
    case 'openrouter': return new OpenRouterProvider(apiKey);
    case 'qwen': return new QwenProvider(apiKey);
    case 'zhipu': return new ZhipuProvider(apiKey);
    case 'moonshot': return new MoonshotProvider(apiKey);
    case 'mistral': return new MistralProvider(apiKey);
    case 'xai': return new XAIProvider(apiKey);
    default:
      if (!baseUrl) throw new Error(`Unknown provider: ${provider}`);
      return new OpenAICompatibleProvider(provider, baseUrl, apiKey);
  }
}
```
Import `OpenAICompatibleProvider`.

- [x] **Step 4: Custom-provider Zod schemas (`ai.ts`)**

Add to `src/shared/validation/schemas/ai.ts`:
```ts
export const CreateCustomProviderSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
  label: z.string().min(1),
  base_url: z.string().url(),
  api_key: z.string().min(1),
  enabled: z.boolean().optional(),
});
export const UpdateCustomProviderSchema = z.object({
  label: z.string().min(1).optional(),
  base_url: z.string().url().optional(),
  api_key: z.string().optional(),
  enabled: z.boolean().optional(),
});
```

- [x] **Step 5: Custom-provider CRUD routes**

`src/pages/api/admin/ai/custom-providers/index.ts` — `GET` returns
`stripApiKeys(settings).custom_providers`; `POST` validates `CreateCustomProviderSchema` then
`saveAiSettings(db, { custom_providers: { [id]: { label, base_url, api_key, enabled: enabled ?? true, models: [] } } })`.
`src/pages/api/admin/ai/custom-providers/[id].ts` — `PUT` validates `UpdateCustomProviderSchema`
then `saveAiSettings(db, { custom_providers: { [id]: patch } })` (deep merge keeps key/models);
`DELETE` loads settings, removes the id from `custom_providers`, writes the full object via a
dedicated `replaceAiSettings` (full overwrite) — add `replaceAiSettings(db, settings)` to
`settings-store.ts` that validates + writes without merge. Both require `AuthRoles.ADMIN` via
`extractAuthContext`/`hasRole` (follow `migrate-models.ts` auth pattern).

- [x] **Step 6: Verify + commit**

Run: `pnpm test src/modules/ai/__tests__/openai-compatible.test.ts`
→ Expected: PASS.
```bash
git add src/modules/ai/providers/openai-compatible.provider.ts src/modules/ai/ai.service.ts src/modules/ai/settings-store.ts src/shared/validation/schemas/ai.ts src/pages/api/admin/ai/custom-providers src/modules/ai/__tests__/openai-compatible.test.ts
git commit -m "feat(ai): OpenAI-compatible custom providers + CRUD"
```

---

## Phase 5 — discovery + settings + providers + generate endpoints (snake_case)

**Files:**
- Create: `src/pages/api/admin/ai/models/[provider]/discover.ts`
- Modify: `src/pages/api/admin/ai/settings.ts`, `providers.ts`, `generate.ts`,
  `models/[provider].ts`, `models/[provider]/[modelId].ts`
- Delete: `src/pages/api/admin/ai/migrate-models.ts`
- Modify: `src/shared/validation/schemas/ai.ts` (snake_case settings/generate schemas)
- Modify: `src/modules/ai/ai.service.ts` (`getModelsForProvider`, `generateContent`,
  `getConfiguredProviders`, resolution helper)

- [x] **Step 1: Rewrite `ai.ts` request schemas to snake_case**

Update `GenerateSchema`, `UpdateSettingsSchema`, `AddModelSchema`, `UpdateModelSchema`,
`ProviderModelParam`, `ValidateApiKeySchema` to snake_case keys:
```ts
export const GenerateSchema = z.object({
  prompt: z.string().min(3).max(10000),
  content_type: z.enum(['recipe', 'article', 'roundup']),
  provider: z.string().optional(),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  reasoning_effort: z.enum(['low', 'medium', 'high']).optional(),
}).passthrough();

export const UpdateSettingsSchema = z.object({
  default_provider: z.string().optional(),
  default_model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  system_prompt: z.string().optional(),
  providers: z.record(z.string(), z.object({
    api_key: z.string().optional(),
    enabled: z.boolean().optional(),
    models: z.array(z.any()).optional(),
  })).optional(),
}).passthrough();

export const AddModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
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

export const ProviderModelParam = z.object({ provider: z.string().min(1), model_id: z.string().min(1) });
export const ValidateApiKeySchema = z.object({ provider: z.string().min(1), api_key: z.string().min(1) });
```
(`ProviderEnum` is replaced by `z.string()` since custom providers exist; validity is checked
against settings at runtime.)

- [x] **Step 2: Discovery endpoint**

`src/pages/api/admin/ai/models/[provider]/discover.ts` (`GET`, `AuthRoles.ADMIN`):
```ts
// resolve provider config (built-in providers[p] or custom_providers[p]) from getAiSettings
// const cfg = settings.providers[provider] ?? settings.custom_providers[provider];
// if (!cfg?.api_key) -> 400 "No API key configured for <provider>"
// const impl = createProvider(provider, cfg.api_key, (cfg as CustomProviderConfig).base_url);
// const { supported, models } = await impl.listModels(cfg.api_key);
// const view = reconcileSelection(cfg.models ?? [], models);
// return formatSuccessResponse({ supported, models: view });
```
Use `formatSuccessResponse`/`formatErrorResponse` and the `validateParams`-style param read used by
sibling routes.

- [x] **Step 3: `settings.ts` GET (masked) / PUT (deep merge)**

GET: `formatSuccessResponse(stripApiKeys(await getAiSettings(db)))`.
PUT: `validateBody(request, UpdateSettingsSchema)` → `saveAiSettings(db, body)` → return
`stripApiKeys(await getAiSettings(db))`.
POST (validate key): `createProvider(provider, api_key, base_url?).validateApiKey(api_key)`.
Remove every camelCase field; require `AuthRoles.ADMIN`.

- [x] **Step 4: `providers.ts`, `generate.ts`, model CRUD to snake_case + selection**

`providers.ts` GET → `{ configured_providers, available_models, provider_info, defaults }` where
`available_models[p] = getModelsForProvider(db, p)` (stored selection, enabled only). Strip keys.
`generate.ts` → read `GenerateSchema`, call `generateContent(db, { ...body })`, snake_case response.
`models/[provider].ts` (POST add / GET list) and `models/[provider]/[modelId].ts` (PUT/DELETE) →
operate on `providers[p].models` (or `custom_providers[p].models`) via `saveAiSettings`, snake_case
fields, `source: 'manual'` for manually added models.

- [x] **Step 5: `ai.service.ts` resolution + generate**

```ts
export async function getModelsForProvider(db: D1Database, provider: AIProvider): Promise<ModelSelection[]> {
  const settings = await getAiSettings(db);
  const cfg = settings.providers[provider as BuiltInProvider] ?? settings.custom_providers[provider];
  return (cfg?.models ?? []).filter(m => m.enabled && m.status !== 'unavailable');
}

export async function generateContent(db: D1Database, request: GenerateContentRequest): Promise<GenerateContentResponse> {
  const settings = await getAiSettings(db);
  const provider = request.provider || settings.default_provider;
  const cfg = settings.providers[provider as BuiltInProvider] ?? settings.custom_providers[provider];
  if (!cfg?.api_key) return { success: false, error: `No API key configured for provider: ${provider}` };
  if (!cfg.enabled) return { success: false, error: `Provider is disabled: ${provider}` };
  const impl = createProvider(provider, cfg.api_key, (cfg as CustomProviderConfig).base_url);
  const model = request.model || (provider === settings.default_provider ? settings.default_model : request.model);
  return impl.generateContent({
    ...request,
    model: model || request.model,
    temperature: request.temperature ?? settings.temperature,
    system_prompt: request.system_prompt || settings.system_prompt,
  });
}
```
Update `getConfiguredProviders` to iterate `providers` + `custom_providers` reading `api_key`/`enabled`.

- [x] **Step 6: Delete the obsolete migration endpoint**

```bash
git rm src/pages/api/admin/ai/migrate-models.ts
```
Then `rg -n "migrate-models|AVAILABLE_MODELS" src` and remove every remaining reference.

- [x] **Step 7: Verify + commit**

Run: `pnpm test && pnpm check:boundaries`
Expected: PASS / "Boundary check passed." (`pnpm typecheck` may still be red until admin UI in
Phase 7.)
```bash
git add -A
git commit -m "feat(ai): discovery + snake_case settings/providers/generate endpoints; drop migrate-models"
```

---

## Phase 6 — thinking / reasoning mapping at the provider boundary

**Files:**
- Modify: providers that support reasoning — `openai`, `anthropic`, `deepseek`, `openai-compatible`
- Modify: `src/modules/ai/__tests__/...` (one mapping test)

- [x] **Step 1: Map `reasoning_effort` per provider at the fetch boundary**

In `openai.provider.ts` and `openai-compatible.provider.ts`, when `request.reasoning_effort` is set,
add `reasoning_effort: request.reasoning_effort` to the request body. In `anthropic.provider.ts`,
map to `thinking: { type: 'enabled', budget_tokens: <low|medium|high → 4096|8192|16384> }`. In
`deepseek.provider.ts`, no body change is required (reasoner is model-selected) — leave a comment.
Providers without support ignore the field (no change).

- [x] **Step 2: Test the mapping (openai body includes reasoning_effort)**

Add to an existing/new provider test that mocks `fetch` and asserts the request body passed to
`fetch` contains `reasoning_effort: 'high'` when set. Run that test → Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src/modules/ai/providers src/modules/ai/__tests__
git commit -m "feat(ai): map reasoning_effort to provider-native thinking params"
```

---

## Phase 7 — admin UI: snake_case + discovery UX + has_api_key

**Files:**
- Modify: `src/admin/services/api.ts` (AI client methods)
- Modify: `src/admin/components/ModelManager.tsx`, `BulkImportModels.tsx`
- Modify: `src/admin/features/settings/pages/tabs/AISettings.tsx`,
  `src/admin/components/BlockEditor/components/AISettings.tsx`,
  `src/admin/features/settings/pages/Settings.tsx`

- [x] **Step 1: `api.ts` AI client methods → snake_case + discover + custom providers**

Add/repoint methods: `aiSettings.get/update`, `aiProviders.get`, `aiModels.discover(provider)`,
`aiModels.add/update/remove`, `aiCustomProviders.list/create/update/remove`, `aiGenerate(payload)`.
All payloads/reads use snake_case (`content_type`, `reasoning_effort`, `default_provider`,
`has_api_key`, `context_window`, `max_tokens`).

- [x] **Step 2: ModelManager — discovery checklist**

Rework `ManagedModel` to snake_case (`context_window`, `max_tokens`, `enabled`, `deprecated`,
`status`). Add a "Fetch latest models" button calling `aiModels.discover(provider)`; render the
returned `models` as a checklist with `status` badges (`unavailable`/`deprecated`); ticking a model
saves it into the selection via `aiSettings.update`/`aiModels.add`. Keep manual add + bulk import
visible as fallback (and shown automatically when `discover` returns `supported: false`).

- [x] **Step 3: BulkImportModels + both AISettings tabs + Settings.tsx**

Rename all AI data-key reads/writes to snake_case (`context_window`, `max_tokens`, `api_key`→write
only, render `has_api_key`/`api_key_masked` instead of the raw key, `default_provider`,
`default_model`, `system_prompt`, `reasoning_effort` selector shown when the chosen model has
`supports_thinking`). Add a custom-provider add/edit form (id/label/base_url/api_key) backed by
`aiCustomProviders`.

- [x] **Step 4: Verify full green**

Run: `pnpm typecheck && pnpm test && pnpm check:boundaries`
Expected: all green (this is the phase where typecheck returns fully clean).

- [x] **Step 5: Commit**

```bash
git add src/admin
git commit -m "feat(ai): snake_case admin AI UI + model discovery UX + write-only keys"
```

---

## Phase 8 — one-shot stored-blob data migration

**Files:**
- Create: `scripts/migrate-ai-settings.mts`
- Create: `src/modules/ai/__tests__/migrate-ai-settings.test.ts`

- [x] **Step 1: Failing test for the pure transform**

`src/modules/ai/__tests__/migrate-ai-settings.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { migrateAiSettingsBlob } from '../../../scripts/migrate-ai-settings.mts';

describe('migrateAiSettingsBlob', () => {
  it('converts legacy camelCase blob to snake_case selection shape', () => {
    const legacy = {
      defaultProvider: 'openai', defaultModel: 'gpt-4o', temperature: 0.7, systemPrompt: 'sp',
      providers: { openai: { apiKey: 'sk-1', enabled: true,
        availableModels: [{ id: 'gpt-4o', name: 'GPT-4o', contextWindow: 131072, maxTokens: 65536, enabled: true }] } },
    };
    const out = migrateAiSettingsBlob(legacy);
    expect(out.default_provider).toBe('openai');
    expect(out.system_prompt).toBe('sp');
    expect(out.providers.openai.api_key).toBe('sk-1');
    expect(out.providers.openai.models[0]).toMatchObject({
      id: 'gpt-4o', context_window: 131072, max_tokens: 65536, modality: 'text',
      status: 'available', source: 'discovered', enabled: true,
    });
    expect(out.custom_providers).toEqual({});
  });
});
```

Run: `pnpm test src/modules/ai/__tests__/migrate-ai-settings.test.ts` → Expected: FAIL.

- [x] **Step 2: Implement `scripts/migrate-ai-settings.mts`**

Export a pure `migrateAiSettingsBlob(legacy)` (camelCase → snake_case, `availableModels` → `models`
with `modality:'text'`, `status:'available'`, `source:'discovered'`, `order` by index) plus a
`main()` that opens the local D1 sqlite (reuse the `findDb` pattern from
`scripts/migrate-credit-avatar-r2key.mts`), reads `site_settings.value WHERE key='ai_settings'`,
prints a dry-run diff, and writes the transformed blob under `--apply`. Validate the result with
`AiSettingsSchema` before writing.

Run: `pnpm test src/modules/ai/__tests__/migrate-ai-settings.test.ts` → Expected: PASS.

- [x] **Step 3: Dry-run against local D1**

Run: `node_modules/.bin/tsx scripts/migrate-ai-settings.mts`
Expected: prints the would-be snake_case blob; no write. (If no `ai_settings` row exists locally,
it prints "no ai_settings row — nothing to migrate".)

- [x] **Step 4: Commit**

```bash
git add scripts/migrate-ai-settings.mts src/modules/ai/__tests__/migrate-ai-settings.test.ts
git commit -m "chore(ai): one-shot migration of stored ai_settings to snake_case selection shape"
```

---

## Phase 9 — finalize & close AI portion of #3

**Files:**
- Modify: `docs/NAMING_CONTRACT.md` (only if it still implies AI is pending)
- Modify: `.hermes/plans/2026-06-03_contract-audit-report.md` (local record)

- [x] **Step 1: Full regression gate**

Run: `pnpm typecheck && pnpm test && pnpm check:boundaries`
Expected: all green.

- [x] **Step 2: Contract audit — no AI camelCase regressions**

Run: `rg -n "\b(defaultProvider|defaultModel|systemPrompt|apiKey|availableModels|contextWindow|maxTokens|modelId)\b" src/modules/ai src/pages/api/admin/ai src/admin --glob '!**/*.test.*'`
Expected: matches only inside provider classes at the external fetch boundary (allowed exception)
and local variables — no app-owned data-shape keys. Then
`node scripts/local-contract-audit.mjs --summary` → no new camelCase violation.

- [x] **Step 3: Commit (if docs changed)**

```bash
git add docs/NAMING_CONTRACT.md
git commit -m "docs(naming): AI subsystem migrated to snake_case (audit #3)"
```

---

## Self-review notes

- **Spec coverage:** stored shape (P0/P1/P5), discovery `listModels` (P2/P3), discover endpoint
  (P5), custom providers (P4), safe persistence + Zod (P1), key masking (P1/P5), obsolescence
  reconcile (P2 + P5 resolution filter), thinking (P6), modality filter (P2 normalizer), snake_case
  E2E (P0/P5/P7), data migration (P8), cleanup of AVAILABLE_MODELS + migrate-models (P5). ✓
- **No placeholders:** pure-logic units ship full code + tests; mechanical endpoint/UI tasks give
  exact files, exact snake_case key lists, and a shared normalizer (DRY) rather than repeated
  provider code. ✓
- **Type consistency:** `AiSettings`, `ModelSelection`, `DiscoveredModel`, `ListModelsResult`,
  `reconcileSelection`, `mergeAiSettings`, `getAiSettings`/`saveAiSettings`/`replaceAiSettings`,
  `stripApiKeys`/`maskApiKey`, `normalizeOpenAiModels`/`classifyModality`/`detectThinking` are used
  with consistent names across phases. ✓
- **Typecheck phasing:** Phases 1, 2, 3, 8 are green in isolation; Phases 0, 4–7 may leave global
  typecheck red until Phase 7 (documented in the Phase 0 note); every phase's own unit tests pass.
