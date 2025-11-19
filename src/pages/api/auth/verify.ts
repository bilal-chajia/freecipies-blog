import type { APIRoute } from 'astro';
import { verifyAuthToken } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env || {};
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        if (!jwtSecret) {
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const authHeader = request.headers.get('Authorization');
        const token = await verifyAuthToken(authHeader, jwtSecret);

        if (!token) {
            return new Response(JSON.stringify({ valid: false }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            valid: true,
            user: {
                username: token.sub,
                role: token.role
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Verification failed' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
