import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { getAiSettings, replaceAiSettings, saveAiSettings } from '@modules/ai';
import { stripApiKeys } from '@modules/ai/api-key';
import { validateBody } from '@shared/validation';
import { UpdateCustomProviderSchema } from '@shared/validation/schemas/ai';
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

function getId(params: Record<string, string | undefined>): string {
    const id = params.id;
    if (!id) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Provider id is required', 400);
    return id;
}

export const PUT: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const id = getId(params);
        const patch = await validateBody(request, UpdateCustomProviderSchema);
        const settings = await getAiSettings(env.DB);
        if (!settings.custom_providers[id]) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Custom provider not found', 404);
        }

        const success = await saveAiSettings(env.DB, { custom_providers: { [id]: patch } });
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update custom provider', 500);

        const updated = await getAiSettings(env.DB);
        const { body, status, headers } = formatSuccessResponse(stripApiKeys(updated).custom_providers[id]);
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to update custom provider:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update custom provider', 500),
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const id = getId(params);
        const settings = await getAiSettings(env.DB);
        if (!settings.custom_providers[id]) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Custom provider not found', 404);
        }

        const { [id]: _removed, ...custom_providers } = settings.custom_providers;
        const success = await replaceAiSettings(env.DB, { ...settings, custom_providers });
        if (!success) throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete custom provider', 500);

        const { body, status, headers } = formatSuccessResponse({ success: true, deleted_provider: id });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to delete custom provider:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete custom provider', 500),
        );
        return new Response(body, { status, headers });
    }
};
