import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { createProvider, getAiSettings, saveAiSettings } from '@modules/ai';
import type { AiSettingsPatch } from '@modules/ai';
import { stripApiKeys } from '@modules/ai/api-key';
import { validateBody } from '@shared/validation';
import { UpdateSettingsSchema, ValidateApiKeySchema } from '@shared/validation/schemas/ai';
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

        const { body, status, headers } = formatSuccessResponse(stripApiKeys(await getAiSettings(env.DB)));
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to get AI settings:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get AI settings', 500),
        );
        return new Response(body, { status, headers });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const body = await validateBody(request, UpdateSettingsSchema) as AiSettingsPatch;
        const success = await saveAiSettings(env.DB, body);
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to save settings', 500);

        const { body: responseBody, status, headers } = formatSuccessResponse(stripApiKeys(await getAiSettings(env.DB)));
        return new Response(responseBody, { status, headers });
    } catch (error) {
        console.error('Failed to update AI settings:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update AI settings', 500),
        );
        return new Response(body, { status, headers });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;

        const { provider, api_key, base_url, api_format, auth_style } = await validateBody(request, ValidateApiKeySchema);
        const isValid = await createProvider(provider, api_key, base_url, { apiFormat: api_format, authStyle: auth_style }).validateApiKey(api_key);

        const { body, status, headers } = formatSuccessResponse({
            valid: isValid,
            provider,
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to validate API key:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to validate API key', 500),
        );
        return new Response(body, { status, headers });
    }
};
