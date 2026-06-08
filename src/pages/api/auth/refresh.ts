import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateJWT, verifyAuthToken } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    if (!jwtSecret) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Server configuration error', 500)
      );
      return new Response(body, { status, headers });
    }

    const authHeader = request.headers.get('Authorization');
    const payload = await verifyAuthToken(authHeader, jwtSecret);

    if (!payload) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired session', 401)
      );
      return new Response(body, { status, headers });
    }

    const token = await generateJWT(
      { sub: payload.sub, role: payload.role },
      jwtSecret,
      '24h'
    );

    const { body, status, headers } = formatSuccessResponse({
      token,
      user: {
        username: payload.sub,
        role: payload.role,
      },
    });
    return new Response(body, { status, headers });

  } catch (error) {
    console.error('Refresh error:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to refresh session', 500)
    );
    return new Response(body, { status, headers });
  }
};
