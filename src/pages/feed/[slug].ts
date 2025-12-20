import type { APIRoute } from 'astro';
import { getArticles } from '@modules/articles';
import { getCategoryBySlug } from '@modules/categories';
import type { Env } from '@shared/types';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, site }) => {
    const env = locals.runtime.env as Env;
    const categorySlug = params.slug;
    const baseUrl = site?.toString().replace(/\/$/, '') || 'https://recipes-saas.com';

    if (!categorySlug) {
        return new Response('Category not specified', { status: 400 });
    }

    // Fetch category and its recipes
    let category: any = null;
    let recipes: any[] = [];

    try {
        category = await getCategoryBySlug(env.DB, categorySlug);

        if (!category) {
            return new Response('Category not found', { status: 404 });
        }

        const result = await getArticles(env.DB, {
            type: 'recipe',
            categorySlug: categorySlug,
            limit: 1000
        });
        recipes = result.items;
    } catch (error) {
        console.error('Error fetching category feed:', error);
        return new Response('Error generating feed', { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Helper to get absolute image URL
    const getAbsoluteImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Generate sitemap XML for this category
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <url>
        <loc>${baseUrl}/categories/${categorySlug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    ${recipes.map(recipe => `
    <url>
        <loc>${baseUrl}/recipes/${recipe.slug}</loc>
        <lastmod>${recipe.updatedAt ? new Date(recipe.updatedAt).toISOString().split('T')[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>${recipe.imageUrl ? `
        <image:image>
            <image:loc>${escapeXml(getAbsoluteImageUrl(recipe.imageUrl))}</image:loc>
            <image:title>${escapeXml(recipe.headline)}</image:title>
        </image:image>` : ''}
    </url>`).join('')}
</urlset>`;

    return new Response(sitemap.trim(), {
        status: 200,
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600'
        }
    });
};

function escapeXml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
