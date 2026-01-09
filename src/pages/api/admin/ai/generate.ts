/**
 * AI Generate API Endpoint
 * ========================
 * POST /api/admin/ai/generate
 * 
 * Generates content using the configured AI provider.
 */

import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { generateContent } from '@modules/ai';
import type { GenerateContentRequest } from '@modules/ai';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Parse request body
        const body = await request.json();
        const { prompt, contentType, provider, model, temperature } = body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'A valid prompt is required (min 3 characters)', 400);
        }

        if (!contentType || !['recipe', 'article', 'roundup'].includes(contentType)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid contentType required: recipe, article, or roundup', 400);
        }

        // Generate content
        const generateRequest: GenerateContentRequest = {
            prompt: prompt.trim(),
            contentType,
            provider: provider || 'gemini',
            model: model || undefined,
            temperature: typeof temperature === 'number' ? temperature : undefined,
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
