import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateJWT } from '@modules/auth';
import { validateBody, LoginSchema } from '@shared/validation';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, password } = await validateBody(request, LoginSchema);

    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const adminUser = env.ADMIN_USERNAME || import.meta.env.ADMIN_USERNAME;
    const adminPass = env.ADMIN_PASSWORD || import.meta.env.ADMIN_PASSWORD;

    console.log('[DEBUG LOGIN] Received:', { username, passwordLength: password?.length });
    console.log('[DEBUG LOGIN] Env Config:', { 
      hasSecret: !!jwtSecret, 
      adminUser, 
      adminPass,
      envKeys: Object.keys(env || {}),
      metaEnvKeys: Object.keys(import.meta.env || {})
    });

    if (!jwtSecret || !adminUser || !adminPass) {
      console.error('[DEBUG LOGIN] Missing config keys:', {
        jwtSecret: !!jwtSecret,
        adminUser: !!adminUser,
        adminPass: !!adminPass
      });
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Server configuration error', 500)
      );
      return new Response(body, { status, headers });
    }

    if (username === adminUser && password === adminPass) {
      const token = await generateJWT(
        { sub: adminUser, role: 'admin' },
        jwtSecret,
        '24h'
      );

      const { body, status, headers } = formatSuccessResponse({
        token,
        user: {
          username: adminUser,
          role: 'admin',
        },
      });
      return new Response(body, { status, headers });
    }

    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid credentials', 401)
    );
    return new Response(body, { status, headers });

  } catch (error) {
    console.error('Login error:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Login failed', 500)
    );
    return new Response(body, { status, headers });
  }
};
