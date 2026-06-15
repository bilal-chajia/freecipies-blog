import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { AIProvider, BuiltInProvider, CustomProviderConfig } from '@modules/ai';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { createProvider, getAiSettings } from '@modules/ai';
import { reconcileSelection } from '@modules/ai/discovery/reconcile';
import { validateParams } from '@shared/validation';
import { ProviderParam } from '@shared/validation/schemas/ai';
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

export const GET: APIRoute = async ({ params, request }) => {
    try {
        const authError = await requireAdmin(request);
        if (authError) return authError;
        if (!env?.DB) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);

        const { provider } = validateParams(params, ProviderParam);
        const settings = await getAiSettings(env.DB);
        const cfg = settings.providers[provider as BuiltInProvider] ?? settings.custom_providers[provider];
        if (!cfg?.api_key) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, `No API key configured for ${provider}`, 400);
        }

        const customCfg = cfg as CustomProviderConfig;
        const impl = createProvider(provider as AIProvider, cfg.api_key, customCfg.base_url, {
            apiFormat: customCfg.api_format,
            authStyle: customCfg.auth_style,
        });
        const { supported, models } = await impl.listModels(cfg.api_key);
        const view = reconcileSelection(cfg.models ?? [], models);

        const { body, status, headers } = formatSuccessResponse({ supported, models: view });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to discover models:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to discover models', 500),
        );
        return new Response(body, { status, headers });
    }
};
