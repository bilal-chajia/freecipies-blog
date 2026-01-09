/**
 * AI Models Management API
 * =========================
 * Manage AI models for each provider
 * 
 * GET    /api/admin/ai/models/:provider - List models for provider
 * POST   /api/admin/ai/models/:provider - Add new model
 * PUT    /api/admin/ai/models/:provider/:modelId - Update model
 * DELETE /api/admin/ai/models/:provider/:modelId - Delete model
 * PATCH  /api/admin/ai/models/:provider/:modelId/toggle - Toggle enabled
 */

import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getAISettings, saveAISettings, ALL_PROVIDERS } from '@modules/ai';
import type { AIProvider, AIModel } from '@modules/ai';

export const prerender = false;

/**
 * GET - List all models for a provider
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const provider = params.provider as AIProvider;
        if (!ALL_PROVIDERS.includes(provider)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid provider', 400);
        }

        const settings = await getAISettings(env.DB);
        const providerConfig = settings.providers?.[provider];
        const models = providerConfig?.availableModels || [];

        const { body, status, headers } = formatSuccessResponse({
            provider,
            models
        });

        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to get models:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get models', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * POST - Add a new model to provider
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const provider = params.provider as AIProvider;
        if (!ALL_PROVIDERS.includes(provider)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid provider', 400);
        }

        const body = await request.json();
        const { id, name, description, contextWindow, maxTokens } = body;

        // Validation
        if (!id || typeof id !== 'string') {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model ID required', 400);
        }
        if (!name || typeof name !== 'string') {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model name required', 400);
        }

        const settings = await getAISettings(env.DB);
        const providerConfig = settings.providers?.[provider] || { enabled: false, apiKey: '' };
        const models = providerConfig.availableModels || [];

        // Check if model already exists
        if (models.some(m => m.id === id)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model ID already exists', 400);
        }

        // Add new model
        const newModel: AIModel = {
            id,
            name,
            provider,
            description: description || '',
            contextWindow: contextWindow || undefined,
            maxTokens: maxTokens || undefined,
            enabled: true,
            deprecated: false,
            order: models.length
        };

        models.push(newModel);
        providerConfig.availableModels = models;
        settings.providers[provider] = providerConfig;

        const success = await saveAISettings(env.DB, settings);
        if (!success) {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to save model', 500);
        }

        const { body: responseBody, status, headers } = formatSuccessResponse({
            model: newModel
        });

        return new Response(responseBody, { status, headers });

    } catch (error) {
        console.error('Failed to add model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to add model', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * PUT - Update an existing model
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const provider = params.provider as AIProvider;
        const modelId = params.modelId;

        if (!ALL_PROVIDERS.includes(provider)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid provider', 400);
        }
        if (!modelId) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model ID required', 400);
        }

        const body = await request.json();
        const { name, description, contextWindow, maxTokens, deprecated } = body;

        const settings = await getAISettings(env.DB);
        const providerConfig = settings.providers?.[provider];
        const models = providerConfig?.availableModels || [];

        const modelIndex = models.findIndex(m => m.id === modelId);
        if (modelIndex === -1) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Model not found', 404);
        }

        // Update model
        if (name) models[modelIndex].name = name;
        if (description !== undefined) models[modelIndex].description = description;
        if (contextWindow !== undefined) models[modelIndex].contextWindow = contextWindow;
        if (maxTokens !== undefined) models[modelIndex].maxTokens = maxTokens;
        if (typeof deprecated === 'boolean') models[modelIndex].deprecated = deprecated;

        providerConfig.availableModels = models;
        settings.providers[provider] = providerConfig;

        const success = await saveAISettings(env.DB, settings);
        if (!success) {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update model', 500);
        }

        const { body: responseBody, status, headers } = formatSuccessResponse({
            model: models[modelIndex]
        });

        return new Response(responseBody, { status, headers });

    } catch (error) {
        console.error('Failed to update model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update model', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * DELETE - Remove a model
 */
export const DELETE: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const provider = params.provider as AIProvider;
        const modelId = params.modelId;

        if (!ALL_PROVIDERS.includes(provider)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid provider', 400);
        }
        if (!modelId) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model ID required', 400);
        }

        const settings = await getAISettings(env.DB);
        const providerConfig = settings.providers?.[provider];
        const models = providerConfig?.availableModels || [];

        const filteredModels = models.filter(m => m.id !== modelId);
        if (filteredModels.length === models.length) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Model not found', 404);
        }

        providerConfig.availableModels = filteredModels;
        settings.providers[provider] = providerConfig;

        const success = await saveAISettings(env.DB, settings);
        if (!success) {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete model', 500);
        }

        const { body, status, headers } = formatSuccessResponse({
            success: true,
            deletedModelId: modelId
        });

        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to delete model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete model', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * PATCH - Toggle model enabled/disabled
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const provider = params.provider as AIProvider;
        const modelId = params.modelId;

        if (!ALL_PROVIDERS.includes(provider)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid provider', 400);
        }
        if (!modelId) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model ID required', 400);
        }

        const settings = await getAISettings(env.DB);
        const providerConfig = settings.providers?.[provider];
        const models = providerConfig?.availableModels || [];

        const modelIndex = models.findIndex(m => m.id === modelId);
        if (modelIndex === -1) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Model not found', 404);
        }

        // Toggle enabled
        models[modelIndex].enabled = !models[modelIndex].enabled;

        providerConfig.availableModels = models;
        settings.providers[provider] = providerConfig;

        const success = await saveAISettings(env.DB, settings);
        if (!success) {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to toggle model', 500);
        }

        const { body, status, headers } = formatSuccessResponse({
            model: models[modelIndex]
        });

        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to toggle model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to toggle model', 500)
        );
        return new Response(body, { status, headers });
    }
};
