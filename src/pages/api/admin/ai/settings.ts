/**
 * AI Settings API Endpoint
 * ========================
 * GET/PUT /api/admin/ai/settings
 * 
 * Manage AI provider configuration.
 */

import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
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

export const prerender = false;

/**
 * GET - Retrieve current AI settings
 */
export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check - require admin for settings
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const settings = await getAISettings(env.DB);
        const configuredProviders = await getConfiguredProviders(env.DB);

        // Mask API keys for security (only show last 4 chars)
        const maskedSettings = {
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

        const { body, status, headers } = formatSuccessResponse({
            settings: maskedSettings,
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
export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check - require admin for settings
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const body = await request.json();
        const {
            defaultProvider,
            defaultModel,
            temperature,
            systemPrompt,
            providers,
        } = body;

        // Build update object
        const updates: Partial<AISettings> = {};

        if (defaultProvider && ALL_PROVIDERS.includes(defaultProvider as AIProvider)) {
            updates.defaultProvider = defaultProvider as AIProvider;
        }

        if (defaultModel && typeof defaultModel === 'string') {
            updates.defaultModel = defaultModel;
        }

        if (typeof temperature === 'number' && temperature >= 0 && temperature <= 1) {
            updates.temperature = temperature;
        }

        if (typeof systemPrompt === 'string') {
            updates.systemPrompt = systemPrompt;
        }

        // Handle provider updates (API keys)
        if (providers && typeof providers === 'object') {
            const currentSettings = await getAISettings(env.DB);
            const updatedProviders = { ...currentSettings.providers };

            for (const [providerKey, config] of Object.entries(providers)) {
                if (!ALL_PROVIDERS.includes(providerKey as AIProvider)) continue;

                const providerConfig = config as { apiKey?: string; enabled?: boolean };
                const current = updatedProviders[providerKey as AIProvider] || { apiKey: '', enabled: false };

                // Only update API key if a new one is provided (not masked)
                if (providerConfig.apiKey && !providerConfig.apiKey.startsWith('****')) {
                    current.apiKey = providerConfig.apiKey;
                }

                if (typeof providerConfig.enabled === 'boolean') {
                    current.enabled = providerConfig.enabled;
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

        // Mask API keys
        const maskedSettings = {
            ...newSettings,
            providers: Object.fromEntries(
                Object.entries(newSettings.providers || {}).map(([key, value]) => [
                    key,
                    {
                        ...value,
                        apiKey: value?.apiKey ? `****${value.apiKey.slice(-4)}` : '',
                    },
                ])
            ),
        };

        const { body: responseBody, status, headers } = formatSuccessResponse({
            settings: maskedSettings,
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
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        const body = await request.json();
        const { provider, apiKey } = body;

        if (!provider || !ALL_PROVIDERS.includes(provider as AIProvider)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid provider required', 400);
        }

        if (!apiKey || typeof apiKey !== 'string') {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'API key required', 400);
        }

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
