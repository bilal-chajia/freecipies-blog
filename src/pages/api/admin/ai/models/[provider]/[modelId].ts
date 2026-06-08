import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { z } from 'zod';
import type { AIProvider, BuiltInProvider, ModelSelection, ProviderConfig } from '@modules/ai';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { getAiSettings, saveAiSettings } from '@modules/ai';
import { validateBody, validateParams } from '@shared/validation';
import { ProviderParam, UpdateModelSchema } from '@shared/validation/schemas/ai';
import { AppError, ErrorCodes, formatErrorResponse, formatSuccessResponse } from '@shared/utils';

export const prerender = false;

async function requireAdmin(request: Request): Promise<Response | undefined> {
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.ADMIN)) {
        return createAuthError('Admin permissions required', 403);
    }
    return undefined;
}

function getModelId(params: Record<string, string | undefined>): string {
    const model_id = params.modelId;
    if (!model_id) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model ID is required', 400);
    return model_id;
}

function getConfig(settings: Awaited<ReturnType<typeof getAiSettings>>, provider: AIProvider) {
    return settings.providers[provider as BuiltInProvider] ?? settings.custom_providers[provider];
}

async function saveConfig(provider: AIProvider, settings: Awaited<ReturnType<typeof getAiSettings>>, config: ProviderConfig): Promise<boolean> {
    if (settings.custom_providers[provider]) {
        return saveAiSettings(env.DB, { custom_providers: { [provider]: config } });
    }
    return saveAiSettings(env.DB, { providers: { [provider as BuiltInProvider]: config } });
}

function updateModel(model: ModelSelection, updates: z.infer<typeof UpdateModelSchema>): ModelSelection {
    return {
        ...model,
        name: updates.name ?? model.name,
        context_window: updates.context_window ?? model.context_window,
        max_tokens: updates.max_tokens ?? model.max_tokens,
        deprecated: updates.deprecated ?? model.deprecated,
        enabled: updates.enabled ?? model.enabled,
        status: updates.deprecated === true ? 'deprecated' : updates.deprecated === false ? 'available' : model.status,
    };
}

export const PUT: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const { provider } = validateParams(params, ProviderParam);
        const model_id = getModelId(params);
        const updates = await validateBody(request, UpdateModelSchema);
        const settings = await getAiSettings(env.DB);
        const config = getConfig(settings, provider);
        if (!config) throw new AppError(ErrorCodes.NOT_FOUND, 'Provider not found', 404);

        const index = config.models.findIndex((model) => model.id === model_id);
        if (index === -1) throw new AppError(ErrorCodes.NOT_FOUND, 'Model not found', 404);

        const models = [...config.models];
        models[index] = updateModel(models[index], updates);
        const success = await saveConfig(provider, settings, { ...config, models });
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update model', 500);

        const { body, status, headers } = formatSuccessResponse({ model: models[index] });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to update model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update model', 500),
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const { provider } = validateParams(params, ProviderParam);
        const model_id = getModelId(params);
        const settings = await getAiSettings(env.DB);
        const config = getConfig(settings, provider);
        if (!config) throw new AppError(ErrorCodes.NOT_FOUND, 'Provider not found', 404);

        const models = config.models.filter((model) => model.id !== model_id);
        if (models.length === config.models.length) throw new AppError(ErrorCodes.NOT_FOUND, 'Model not found', 404);

        const success = await saveConfig(provider, settings, { ...config, models });
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete model', 500);

        const { body, status, headers } = formatSuccessResponse({ success: true, deleted_model_id: model_id });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to delete model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete model', 500),
        );
        return new Response(body, { status, headers });
    }
};

export const PATCH: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const { provider } = validateParams(params, ProviderParam);
        const model_id = getModelId(params);
        const settings = await getAiSettings(env.DB);
        const config = getConfig(settings, provider);
        if (!config) throw new AppError(ErrorCodes.NOT_FOUND, 'Provider not found', 404);

        const index = config.models.findIndex((model) => model.id === model_id);
        if (index === -1) throw new AppError(ErrorCodes.NOT_FOUND, 'Model not found', 404);

        const models = [...config.models];
        models[index] = { ...models[index], enabled: !models[index].enabled };
        const success = await saveConfig(provider, settings, { ...config, models });
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to toggle model', 500);

        const { body, status, headers } = formatSuccessResponse({ model: models[index] });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to toggle model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to toggle model', 500),
        );
        return new Response(body, { status, headers });
    }
};
