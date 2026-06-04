import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { AIProvider, BuiltInProvider, ModelSelection, ProviderConfig } from '@modules/ai';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { getAiSettings, saveAiSettings } from '@modules/ai';
import { validateBody, validateParams } from '@shared/validation';
import { AddModelSchema, ProviderParam } from '@shared/validation/schemas/ai';
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

function getConfig(settings: Awaited<ReturnType<typeof getAiSettings>>, provider: AIProvider) {
    return settings.providers[provider as BuiltInProvider] ?? settings.custom_providers[provider];
}

function providerPatch(provider: AIProvider, config: ProviderConfig) {
    return { providers: { [provider as BuiltInProvider]: config } };
}

export const GET: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const { provider } = validateParams(params, ProviderParam);
        const settings = await getAiSettings(env.DB);
        const models = getConfig(settings, provider)?.models ?? [];

        const { body, status, headers } = formatSuccessResponse({ provider, models });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to get models:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get models', 500),
        );
        return new Response(body, { status, headers });
    }
};

export const POST: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const { provider } = validateParams(params, ProviderParam);
        const { id, name, context_window, max_tokens } = await validateBody(request, AddModelSchema);
        const settings = await getAiSettings(env.DB);
        const current = getConfig(settings, provider) ?? { enabled: false, api_key: '', models: [] };
        const models = [...current.models];

        if (models.some((model) => model.id === id)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Model ID already exists', 400);
        }

        const model: ModelSelection = {
            id,
            name,
            context_window,
            max_tokens,
            modality: 'text',
            enabled: true,
            order: models.length,
            deprecated: false,
            status: 'available',
            source: 'manual',
        };

        const next = { ...current, models: [...models, model] };
        const success = settings.custom_providers[provider]
            ? await saveAiSettings(env.DB, { custom_providers: { [provider]: next } })
            : await saveAiSettings(env.DB, providerPatch(provider, next));
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to save model', 500);

        const { body, status, headers } = formatSuccessResponse({ model });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to add model:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to add model', 500),
        );
        return new Response(body, { status, headers });
    }
};
