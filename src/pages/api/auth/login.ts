import type { APIRoute } from 'astro';
import { generateJWT, AuthRoles } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const body = await request.json();
        const { username, password } = body;

        // Get credentials from environment variables
        // In a real app, you might want to check against a database
        const env = (locals as any).runtime?.env || {};
        const adminUsername = env.ADMIN_USERNAME || import.meta.env.ADMIN_USERNAME;
        const adminPassword = env.ADMIN_PASSWORD || import.meta.env.ADMIN_PASSWORD;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        if (!adminUsername || !adminPassword || !jwtSecret) {
            console.error('Missing admin configuration');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate credentials
        if (username !== adminUsername || password !== adminPassword) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate token
        const token = await generateJWT(
            { sub: username, role: AuthRoles.ADMIN },
            jwtSecret,
            '24h'
        );

        return new Response(JSON.stringify({
            token,
            user: {
                username,
                role: AuthRoles.ADMIN
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
