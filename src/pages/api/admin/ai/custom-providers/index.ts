import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { ALL_PROVIDERS, getAiSettings, saveAiSettings } from '@modules/ai';
import { stripApiKeys } from '@modules/ai/api-key';
import { validateBody } from '@shared/validation';
import { CreateCustomProviderSchema } from '@shared/validation/schemas/ai';
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

export const GET: APIRoute = async ({ request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const settings = await getAiSettings(env.DB);
        const { body, status, headers } = formatSuccessResponse(stripApiKeys(settings).custom_providers);
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to list custom providers:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to list custom providers', 500),
        );
        return new Response(body, { status, headers });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const { id, label, base_url, api_key, enabled, api_format, auth_style } = await validateBody(request, CreateCustomProviderSchema);
        const settings = await getAiSettings(env.DB);
        if (ALL_PROVIDERS.includes(id as (typeof ALL_PROVIDERS)[number])) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Custom provider id cannot match a built-in provider', 400);
        }
        if (settings.custom_providers[id]) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Custom provider already exists', 400);
        }

        const success = await saveAiSettings(env.DB, {
            custom_providers: {
                [id]: {
                    label,
                    base_url,
                    api_key,
                    enabled: enabled ?? true,
                    models: [],
                    api_format: api_format ?? 'openai',
                    auth_style: auth_style ?? 'bearer',
                },
            },
        });
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create custom provider', 500);

        const updated = await getAiSettings(env.DB);
        const { body, status, headers } = formatSuccessResponse(stripApiKeys(updated).custom_providers[id]);
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to create custom provider:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create custom provider', 500),
        );
        return new Response(body, { status, headers });
    }
};
