import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { getAiSettings, getConfiguredProviders, getModelsForProvider, PROVIDER_INFO } from '@modules/ai';
import { AppError, ErrorCodes, formatErrorResponse, formatSuccessResponse } from '@shared/utils';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const settings = await getAiSettings(env.DB);
        const configured_providers = await getConfiguredProviders(env.DB);
        const available_models = Object.fromEntries(
            await Promise.all(
                configured_providers.map(async (provider) => [
                    provider,
                    await getModelsForProvider(env.DB, provider),
                ]),
            ),
        );

        const { body, status, headers } = formatSuccessResponse({
            configured_providers,
            available_models,
            provider_info: PROVIDER_INFO,
            defaults: {
                provider: settings.default_provider,
                model: settings.default_model,
                temperature: settings.temperature,
            },
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to get AI providers:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get AI providers', 500),
        );
        return new Response(body, { status, headers });
    }
};
