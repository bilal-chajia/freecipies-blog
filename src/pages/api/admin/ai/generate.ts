/**
 * AI Generate API Endpoint
 * ========================
 * POST /api/admin/ai/generate
 * 
 * Generates content using the configured AI provider.
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { generateContent } from '@modules/ai';
import type { GenerateContentRequest } from '@modules/ai';
import { validateBody } from '@shared/validation';
import { GenerateSchema } from '@shared/validation/schemas/ai';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Validate & parse body
        const { prompt, contentType, provider, model, temperature } = await validateBody(request, GenerateSchema);

        // Generate content
        const generateRequest: GenerateContentRequest = {
            prompt: prompt.trim(),
            contentType,
            provider: provider || 'gemini',
            model: model || undefined,
            temperature: temperature ?? undefined,
        };

        const result = await generateContent(env.DB, generateRequest);

        if (!result.success) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, result.error || 'Generation failed', 500)
            );
            return new Response(body, { status, headers });
        }

        const { body: responseBody, status, headers } = formatSuccessResponse({
            content: result.data,
            usage: result.usage,
        });
        return new Response(responseBody, { status, headers });

    } catch (error) {
        console.error('AI generation error:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to generate content', 500)
        );
        return new Response(body, { status, headers });
    }
};
