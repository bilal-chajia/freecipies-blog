import type { APIRoute } from 'astro';
import { incrementViewCount, getArticleBySlug } from '../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
  const { slug } = params;
  const db = locals.runtime.env.DB;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const article = await getArticleBySlug(db, slug);
    // If not found, return 0 views
    return new Response(JSON.stringify({ viewCount: article?.viewCount || 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching view count:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ params, locals }) => {
    const { slug } = params;
    const db = locals.runtime.env.DB;

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Slug is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const success = await incrementViewCount(db, slug);

        if (success) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: 'Article not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error incrementing view count:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
