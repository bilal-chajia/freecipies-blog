import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { classifyModality, detectThinking } from '../src/modules/ai/discovery/normalize';
import { AiSettingsSchema } from '../src/modules/ai/settings-schema';
import type { AiSettings, ModelSelection } from '../src/modules/ai/types';

const APPLY = process.argv.includes('--apply');
const D1_DIR = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

type LegacyModel = {
    id?: unknown;
    name?: unknown;
    contextWindow?: unknown;
    maxTokens?: unknown;
    enabled?: unknown;
    deprecated?: unknown;
};

type LegacyProvider = {
    apiKey?: unknown;
    api_key?: unknown;
    enabled?: unknown;
    availableModels?: unknown;
    models?: unknown;
};

type LegacySettings = {
    defaultProvider?: unknown;
    default_provider?: unknown;
    defaultModel?: unknown;
    default_model?: unknown;
    temperature?: unknown;
    systemPrompt?: unknown;
    system_prompt?: unknown;
    providers?: unknown;
    custom_providers?: unknown;
};

function stringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function migrateModel(model: LegacyModel, order: number): ModelSelection | undefined {
    const id = stringValue(model.id);
    if (!id) return undefined;
    const deprecated = booleanValue(model.deprecated, false);
    return {
        id,
        name: stringValue(model.name) || undefined,
        context_window: numberValue(model.contextWindow),
        max_tokens: numberValue(model.maxTokens),
        modality: classifyModality(id),
        supports_thinking: detectThinking(id),
        enabled: booleanValue(model.enabled, true),
        order,
        deprecated,
        status: deprecated ? 'deprecated' : 'available',
        source: 'discovered',
    };
}

function migrateProvider(provider: LegacyProvider) {
    const sourceModels = Array.isArray(provider.models)
        ? provider.models
        : Array.isArray(provider.availableModels)
            ? provider.availableModels
            : [];
    return {
        enabled: booleanValue(provider.enabled, false),
        api_key: stringValue(provider.api_key) || stringValue(provider.apiKey),
        models: sourceModels
            .map((model, index) => migrateModel(model as LegacyModel, index))
            .filter((model): model is ModelSelection => Boolean(model)),
    };
}

function redactForLog(settings: AiSettings): AiSettings {
    return {
        ...settings,
        providers: Object.fromEntries(
            Object.entries(settings.providers).map(([provider, config]) => [
                provider,
                config ? { ...config, api_key: config.api_key ? '****redacted' : '' } : config,
            ]),
        ) as AiSettings['providers'],
        custom_providers: Object.fromEntries(
            Object.entries(settings.custom_providers).map(([provider, config]) => [
                provider,
                { ...config, api_key: config.api_key ? '****redacted' : '' },
            ]),
        ),
    };
}

export function migrateAiSettingsBlob(raw: unknown): AiSettings {
    const legacy = (raw && typeof raw === 'object' ? raw : {}) as LegacySettings;
    const providers: AiSettings['providers'] = {};
    const legacyProviders = legacy.providers && typeof legacy.providers === 'object'
        ? legacy.providers as Record<string, LegacyProvider>
        : {};

    for (const [provider, config] of Object.entries(legacyProviders)) {
        providers[provider as keyof AiSettings['providers']] = migrateProvider(config);
    }

    const migrated: AiSettings = {
        default_provider: stringValue(legacy.default_provider) || stringValue(legacy.defaultProvider, 'gemini'),
        default_model: stringValue(legacy.default_model) || stringValue(legacy.defaultModel),
        temperature: numberValue(legacy.temperature) ?? 0.7,
        system_prompt: stringValue(legacy.system_prompt) || stringValue(legacy.systemPrompt),
        providers,
        custom_providers: legacy.custom_providers && typeof legacy.custom_providers === 'object'
            ? legacy.custom_providers as AiSettings['custom_providers']
            : {},
    };

    return AiSettingsSchema.parse(migrated) as AiSettings;
}

function findDb(): DatabaseSync {
    if (!existsSync(D1_DIR)) throw new Error(`D1 dir not found: ${D1_DIR}`);
    for (const name of readdirSync(D1_DIR)) {
        if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue;
        const db = new DatabaseSync(join(D1_DIR, name));
        const hit = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_settings'").get();
        if (hit) return db;
        db.close();
    }
    throw new Error('Could not find local D1 sqlite with site_settings table');
}

function main(): void {
    const db = findDb();
    try {
        const row = db.prepare("SELECT value FROM site_settings WHERE key = 'ai_settings'").get() as
            | { value: string | null }
            | undefined;
        if (!row?.value) {
            console.log('no ai_settings row — nothing to migrate');
            return;
        }

        const before = JSON.parse(row.value);
        const migrated = migrateAiSettingsBlob(before);
        const next = JSON.stringify(redactForLog(migrated), null, 2);
        console.log(next);

        if (APPLY) {
            db.prepare("UPDATE site_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'ai_settings'")
                .run(JSON.stringify(migrated));
            console.log('\nApplied ai_settings migration.');
        } else {
            console.log('\nDry-run only. Re-run with --apply to write.');
        }
    } finally {
        db.close();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
