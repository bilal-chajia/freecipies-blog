import { env } from 'cloudflare:workers';
import { generateContent, type AIProvider, type GenerateContentRequest } from '@modules/ai';
import { AuthRoles, createAuthError, extractAuthContext, hasRole } from '@modules/auth';
import { validateBody } from '@shared/validation';
import { GenerateSchema } from '@shared/validation/schemas/ai';
import { AppError, ErrorCodes, formatErrorResponse, formatSuccessResponse } from '@shared/utils';

export async function handleGenerateContent(request: Request): Promise<Response> {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const { prompt, contentType, provider, model, temperature } = await validateBody(request, GenerateSchema);

        const generateRequest: GenerateContentRequest = {
            prompt: prompt.trim(),
            contentType,
            provider: (provider || 'gemini') as AIProvider,
            model: model || '',
            temperature: temperature ?? undefined,
        };

        const result = await generateContent(env.DB, generateRequest);

        if (!result.success) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, result.error || 'Generation failed', 500)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({
            content: result.data,
            usage: result.usage,
        });

        return new Response(body, { status, headers });
    } catch (error) {
        console.error('AI generation error:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to generate content', 500)
        );
        return new Response(body, { status, headers });
    }
}
