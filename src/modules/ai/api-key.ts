import type { AiSettings } from './types';

export function maskApiKey(key: string | undefined): string {
    if (!key) return '';
    return `••••${key.slice(-4)}`;
}

function strip<T extends { api_key: string }>(
    cfg: T,
): Omit<T, 'api_key'> & { has_api_key: boolean; api_key_masked: string } {
    const { api_key, ...rest } = cfg;
    return {
        ...rest,
        has_api_key: Boolean(api_key),
        api_key_masked: maskApiKey(api_key),
    };
}

export function stripApiKeys(settings: AiSettings) {
    return {
        ...settings,
        providers: Object.fromEntries(
            Object.entries(settings.providers).map(([key, value]) => [key, strip(value)]),
        ),
        custom_providers: Object.fromEntries(
            Object.entries(settings.custom_providers).map(([key, value]) => [key, strip(value)]),
        ),
    };
}
