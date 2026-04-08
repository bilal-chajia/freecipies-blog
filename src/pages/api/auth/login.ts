import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateJWT } from '@modules/auth';

export const prerender = false;

/**
 * Handle Admin Login POST request
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, password } = await request.json();

    // Get secrets from Cloudflare env or local import.meta.env
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const adminUser = env.ADMIN_USERNAME || import.meta.env.ADMIN_USERNAME;
    const adminPass = env.ADMIN_PASSWORD || import.meta.env.ADMIN_PASSWORD;

    if (!jwtSecret || !adminUser || !adminPass) {
      console.error('Missing auth environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Simple credential check
    if (username === adminUser && password === adminPass) {
      // Generate JWT
      const token = await generateJWT(
        { sub: adminUser, role: 'admin' },
        jwtSecret,
        '24h'
      );

      return new Response(
        JSON.stringify({
          success: true,
          token,
          user: {
            username: adminUser,
            role: 'admin'
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Invalid credentials
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid credentials' 
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Login failed' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
