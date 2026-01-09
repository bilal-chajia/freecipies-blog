/**
 * AI Providers API Endpoint
 * =========================
 * GET /api/admin/ai/providers
 * 
 * Returns list of configured providers for editor sidebar.
 * Lighter endpoint for editor use (doesn't require admin role).
 */

import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import {
    getAISettings,
    getConfiguredProviders,
    AVAILABLE_MODELS,
    PROVIDER_INFO,
} from '@modules/ai';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check - editors can use AI
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const settings = await getAISettings(env.DB);
        const configuredProviders = await getConfiguredProviders(env.DB);

        // Only return models for configured providers
        const availableModels = Object.fromEntries(
            configuredProviders.map(p => [p, AVAILABLE_MODELS[p]])
        );

        const { body, status, headers } = formatSuccessResponse({
            configuredProviders,
            availableModels,
            providerInfo: PROVIDER_INFO,
            defaults: {
                provider: settings.defaultProvider,
                model: settings.defaultModel,
                temperature: settings.temperature,
            },
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to get AI providers:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get AI providers', 500)
        );
        return new Response(body, { status, headers });
    }
};
