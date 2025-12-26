import type { APIRoute } from 'astro';
import { getArticles } from '@modules/articles';
import { getCategories } from '@modules/categories';
import { getTags } from '@modules/tags';
import { getAuthors } from '@modules/authors';
import { extractImage } from '@shared/utils';
import type { Env } from '@shared/types';

export const prerender = false;

export const GET: APIRoute = async ({ locals, site }) => {
    const env = locals.runtime.env as Env;
    const baseUrl = site?.toString().replace(/\/$/, '') || 'https://recipes-saas.com';

    // Fetch all data for sitemap dynamically from database
    let recipes: any[] = [];
    let categories: any[] = [];
    let tags: any[] = [];
    let authors: any[] = [];

    try {
        const [recipesResult, categoriesResult, tagsResult, authorsResult] = await Promise.all([
            getArticles(env.DB, { type: 'recipe', limit: 1000 }),
            getCategories(env.DB, { isOnline: true }),
            getTags(env.DB, { isOnline: true }),
            getAuthors(env.DB, { isOnline: true })
        ]);

        recipes = recipesResult.items;
        categories = categoriesResult;
        tags = tagsResult;
        authors = authorsResult;
    } catch (error) {
        console.error('Error fetching data for sitemap:', error);
    }

    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/recipes', priority: '0.9', changefreq: 'daily' },
        { url: '/categories', priority: '0.8', changefreq: 'weekly' },
        { url: '/tags', priority: '0.8', changefreq: 'weekly' },
        { url: '/authors', priority: '0.7', changefreq: 'weekly' },
        { url: '/contact', priority: '0.5', changefreq: 'monthly' },
        { url: '/faqs', priority: '0.5', changefreq: 'monthly' },
        { url: '/about', priority: '0.6', changefreq: 'monthly' },
    ];

    // Helper to get absolute image URL
    const getAbsoluteImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const getRecipeImageUrl = (recipe: any) => {
        const cover = extractImage(recipe.imagesJson, 'cover', 1200);
        const thumbnail = extractImage(recipe.imagesJson, 'thumbnail', 1200);
        return cover.imageUrl || thumbnail.imageUrl || recipe.imageUrl || '';
    };

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    ${staticPages.map(page => `
    <url>
        <loc>${baseUrl}${page.url}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`).join('')}
    ${recipes.map(recipe => {
        const imageUrl = getRecipeImageUrl(recipe);
        return `
    <url>
        <loc>${baseUrl}/recipes/${recipe.slug}</loc>
        <lastmod>${recipe.updatedAt ? new Date(recipe.updatedAt).toISOString().split('T')[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>${imageUrl ? `
        <image:image>
            <image:loc>${escapeXml(getAbsoluteImageUrl(imageUrl))}</image:loc>
            <image:title>${escapeXml(recipe.headline)}</image:title>
        </image:image>` : ''}
    </url>`;
    }).join('')}
    ${categories.map(cat => `
    <url>
        <loc>${baseUrl}/categories/${cat.slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`).join('')}
    ${tags.map(tag => `
    <url>
        <loc>${baseUrl}/tags/${tag.slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`).join('')}
    ${authors.map(author => `
    <url>
        <loc>${baseUrl}/authors/${author.slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`).join('')}
</urlset>`;

    return new Response(sitemap.trim(), {
        status: 200,
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
    });
};

// Helper to escape XML special characters
function escapeXml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
