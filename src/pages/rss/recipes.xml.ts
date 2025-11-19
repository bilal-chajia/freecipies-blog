import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, site }) => {
  try {
    const siteUrl = site?.toString() || 'https://freecipies.com';

    // Fetch recent articles from D1
    const db = locals.runtime?.env?.DB;

    let articles: any[] = [];
    if (db) {
      const { results } = await db.prepare(`
        SELECT 
          slug, label, headline, short_description, 
          image_url, published_at, author_slug, category_slug
        FROM articles 
        WHERE is_online = 1 
        ORDER BY published_at DESC 
        LIMIT 50
      `).all();
      articles = results || [];
    }

    // Generate RSS feed
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Freecipies - Easy and Quick Recipes</title>
    <description>Discover delicious, easy-to-follow recipes with everyday ingredients. From quick weeknight dinners to impressive desserts.</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${siteUrl}/logo.png</url>
      <title>Freecipies</title>
      <link>${siteUrl}</link>
    </image>
    ${articles.map(article => `
    <item>
      <title>${escapeXml(article.headline || article.label)}</title>
      <link>${siteUrl}/recipes/${article.slug}</link>
      <guid isPermaLink="true">${siteUrl}/recipes/${article.slug}</guid>
      <description>${escapeXml(article.short_description || '')}</description>
      <pubDate>${article.published_at ? new Date(article.published_at).toUTCString() : new Date().toUTCString()}</pubDate>
      ${article.author_slug ? `<dc:creator>${escapeXml(article.author_slug)}</dc:creator>` : ''}
      ${article.category_slug ? `<category>${escapeXml(article.category_slug)}</category>` : ''}
      ${article.image_url ? `<enclosure url="${escapeXml(article.image_url)}" type="image/jpeg"/>` : ''}
    </item>`).join('\n')}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('RSS generation error:', error);

    // Return minimal RSS feed on error
    const siteUrl = site?.toString() || 'https://freecipies.com';
    const fallbackRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Freecipies</title>
    <description>Easy and Quick Recipes</description>
    <link>${siteUrl}</link>
  </channel>
</rss>`;

    return new Response(fallbackRss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
};

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

