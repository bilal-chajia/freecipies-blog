import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyAuthToken } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    if (!jwtSecret) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Server configuration error', 500)
      );
      return new Response(body, { status, headers });
    }

    const authHeader = request.headers.get('Authorization');
    const token = await verifyAuthToken(authHeader, jwtSecret);

    if (!token) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired session', 401)
      );
      return new Response(body, { status, headers });
    }

    const { body, status, headers } = formatSuccessResponse({
      valid: true,
      user: {
        username: token.sub,
        role: token.role,
      },
    });
    return new Response(body, { status, headers });

  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Verification failed', 400)
    );
    return new Response(body, { status, headers });
  }
};
