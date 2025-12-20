import type { APIRoute } from 'astro';
import { generateJWT, verifyAuthToken, AuthRoles } from '@modules/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env || {};
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        if (!jwtSecret) {
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
        }

        const authHeader = request.headers.get('Authorization');
        // Verify existing token - must be valid (not expired) to refresh
        const payload = await verifyAuthToken(authHeader, jwtSecret);

        if (!payload) {
            return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate new token with extended expiration
        const token = await generateJWT(
            { sub: payload.sub, role: payload.role },
            jwtSecret,
            '24h'
        );

        return new Response(JSON.stringify({
            token,
            user: {
                username: payload.sub,
                role: payload.role
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Refresh error:', error);
        return new Response(JSON.stringify({ error: 'Failed to refresh session' }), { status: 500 });
    }
};
