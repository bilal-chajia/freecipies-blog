/**
 * AI Settings API Endpoint
 * ========================
 * GET/PUT /api/admin/ai/settings
 * 
 * Manage AI provider configuration.
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import {
    getAISettings,
    saveAISettings,
    getConfiguredProviders,
    validateProviderApiKey,
    AVAILABLE_MODELS,
    PROVIDER_INFO,
    ALL_PROVIDERS,
} from '@modules/ai';
import type { AIProvider, AISettings } from '@modules/ai';
import { validateBody } from '@shared/validation';
import { UpdateSettingsSchema, ValidateApiKeySchema } from '@shared/validation/schemas/ai';

export const prerender = false;

/** Mask API keys — only show last 4 chars */
function maskApiKeys(settings: AISettings) {
    return {
        ...settings,
        providers: Object.fromEntries(
            Object.entries(settings.providers || {}).map(([key, value]) => [
                key,
                {
                    ...value,
                    apiKey: value?.apiKey ? `****${value.apiKey.slice(-4)}` : '',
                },
            ])
        ),
    };
}

/**
 * GET - Retrieve current AI settings
 */
export const GET: APIRoute = async ({ request }) => {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const settings = await getAISettings(env.DB);
        const configuredProviders = await getConfiguredProviders(env.DB);

        const { body, status, headers } = formatSuccessResponse({
            settings: maskApiKeys(settings),
            configuredProviders,
            availableModels: AVAILABLE_MODELS,
            providerInfo: PROVIDER_INFO,
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to get AI settings:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get AI settings', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * PUT - Update AI settings
 */
export const PUT: APIRoute = async ({ request }) => {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const body = await validateBody(request, UpdateSettingsSchema);
        const { defaultProvider, defaultModel, temperature, systemPrompt, providers } = body;

        // Build update object — Zod already validated types/ranges
        const updates: Partial<AISettings> = {};
        if (defaultProvider) updates.defaultProvider = defaultProvider;
        if (defaultModel) updates.defaultModel = defaultModel;
        if (temperature !== undefined) updates.temperature = temperature;
        if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;

        // Handle provider updates (API keys)
        if (providers) {
            const currentSettings = await getAISettings(env.DB);
            const updatedProviders = { ...currentSettings.providers };

            for (const [providerKey, config] of Object.entries(providers)) {
                if (!ALL_PROVIDERS.includes(providerKey as AIProvider)) continue;

                const current = updatedProviders[providerKey as AIProvider] || { apiKey: '', enabled: false };

                // Only update API key if a new one is provided (not masked)
                if (config.apiKey && !config.apiKey.startsWith('****')) {
                    current.apiKey = config.apiKey;
                }
                if (typeof config.enabled === 'boolean') {
                    current.enabled = config.enabled;
                }

                updatedProviders[providerKey as AIProvider] = current;
            }

            updates.providers = updatedProviders;
        }

        const success = await saveAISettings(env.DB, updates);
        if (!success) {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to save settings', 500);
        }

        // Return updated settings
        const newSettings = await getAISettings(env.DB);
        const configuredProviders = await getConfiguredProviders(env.DB);

        const { body: responseBody, status, headers } = formatSuccessResponse({
            settings: maskApiKeys(newSettings),
            configuredProviders,
        });
        return new Response(responseBody, { status, headers });

    } catch (error) {
        console.error('Failed to update AI settings:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update AI settings', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * POST - Validate API key for a provider
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        const { provider, apiKey } = await validateBody(request, ValidateApiKeySchema);

        const isValid = await validateProviderApiKey(provider, apiKey);

        const { body: responseBody, status, headers } = formatSuccessResponse({
            valid: isValid,
            provider,
        });
        return new Response(responseBody, { status, headers });

    } catch (error) {
        console.error('Failed to validate API key:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to validate API key', 500)
        );
        return new Response(body, { status, headers });
    }
};
