import type { D1Database } from '@cloudflare/workers-types';
import { AiSettingsSchema } from './settings-schema';
import type { AiSettings, BuiltInProvider, CustomProviderConfig, ModelSelection, ProviderConfig } from './types';
import { DEFAULT_AI_SETTINGS } from './types';

const AI_SETTINGS_KEY = 'ai_settings';

export type AiSettingsPatch = Omit<Partial<AiSettings>, 'providers' | 'custom_providers'> & {
    providers?: Partial<Record<BuiltInProvider, Partial<ProviderConfig>>>;
    custom_providers?: Record<string, Partial<CustomProviderConfig>>;
};

function mergeProviderMap<T extends Record<string, object>>(
    current: T,
    patch: Record<string, object> | undefined,
): T {
    if (!patch) return current;
    const out: Record<string, object> = { ...current };
    for (const [id, cfg] of Object.entries(patch)) {
        out[id] = { ...(current[id] ?? {}), ...cfg };
    }
    return out as T;
}

/** De-duplicate models by id, keeping the first occurrence and preserving order. */
export function dedupeModelsById<T extends { id: string }>(models: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const model of models) {
        if (seen.has(model.id)) continue;
        seen.add(model.id);
        out.push(model);
    }
    return out;
}

function dedupeProviderMapModels<C extends { models?: ModelSelection[] }>(
    map: Record<string, C>,
): Record<string, C> {
    const out: Record<string, C> = {};
    for (const [id, cfg] of Object.entries(map)) {
        out[id] = { ...cfg, models: dedupeModelsById(cfg.models ?? []) };
    }
    return out;
}

/**
 * Enforce per-provider model-id uniqueness across every provider map. The single
 * write chokepoint runs this so no path (discovery PUT, bulk import, manual,
 * custom) can ever persist duplicate model ids within a provider.
 */
export function dedupeSettingsModels(settings: AiSettings): AiSettings {
    return {
        ...settings,
        providers: dedupeProviderMapModels(
            settings.providers as Record<string, ProviderConfig>,
        ) as AiSettings['providers'],
        custom_providers: dedupeProviderMapModels(
            settings.custom_providers as Record<string, CustomProviderConfig>,
        ) as AiSettings['custom_providers'],
    };
}

export function mergeAiSettings(current: AiSettings, patch: AiSettingsPatch): AiSettings {
    return {
        ...current,
        ...patch,
        providers: mergeProviderMap(
            current.providers,
            patch.providers as Record<string, object> | undefined,
        ) as AiSettings['providers'],
        custom_providers: mergeProviderMap(
            current.custom_providers,
            patch.custom_providers as Record<string, object> | undefined,
        ) as AiSettings['custom_providers'],
    };
}

export async function getAiSettings(db: D1Database): Promise<AiSettings> {
    try {
        const row = await db
            .prepare('SELECT value FROM site_settings WHERE key = ?')
            .bind(AI_SETTINGS_KEY)
            .first<{ value: string }>();

        if (row?.value) {
            const parsed = AiSettingsSchema.safeParse(JSON.parse(row.value));
            if (parsed.success) return parsed.data as AiSettings;
            console.error('Invalid ai_settings blob, using defaults:', parsed.error.issues);
        }
    } catch (error) {
        console.error('Failed to load AI settings:', error);
    }

    return DEFAULT_AI_SETTINGS;
}

async function writeAiSettings(db: D1Database, settings: AiSettings): Promise<void> {
    const validated = AiSettingsSchema.parse(dedupeSettingsModels(settings));
    await db
        .prepare(`
            INSERT INTO site_settings (key, value, category, type, updated_at)
            VALUES (?, ?, 'ai', 'json', CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = CURRENT_TIMESTAMP
        `)
        .bind(AI_SETTINGS_KEY, JSON.stringify(validated))
        .run();
}

export async function saveAiSettings(db: D1Database, patch: AiSettingsPatch): Promise<boolean> {
    try {
        const merged = mergeAiSettings(await getAiSettings(db), patch);
        await writeAiSettings(db, merged);
        return true;
    } catch (error) {
        console.error('Failed to save AI settings:', error);
        return false;
    }
}

export async function replaceAiSettings(db: D1Database, settings: AiSettings): Promise<boolean> {
    try {
        await writeAiSettings(db, settings);
        return true;
    } catch (error) {
        console.error('Failed to replace AI settings:', error);
        return false;
    }
}
