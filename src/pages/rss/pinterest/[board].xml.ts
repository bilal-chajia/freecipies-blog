import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals, site }) => {
  try {
    const boardSlug = params.board;
    const siteUrl = site?.toString() || 'https://recipes-saas.com';

    const db = locals.runtime?.env?.DB;

    if (!db) {
      throw new Error('Database not available');
    }

    // Get board info
    const board = await db.prepare(`
      SELECT * FROM pinterest_boards 
      WHERE slug = ? AND is_active = 1
    `).bind(boardSlug).first() as any;

    if (!board) {
      return new Response('Board not found', { status: 404 });
    }

    // Get pins created in last 24 hours for this board
    const { results } = await db.prepare(`
      SELECT 
        p.*,
        a.slug as article_slug,
        a.label as article_label,
        a.headline as article_headline
      FROM pinterest_pins p
      LEFT JOIN articles a ON p.article_id = a.id
      WHERE p.board_id = ?
        AND p.created_at >= datetime('now', '-24 hours')
      ORDER BY p.created_at DESC
    `).bind(board.id).all();

    const pins = results as any[];

    // Generate RSS feed
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(board.name)} - Freecipies Pinterest</title>
    <description>${escapeXml(board.description || `Latest pins for ${board.name}`)}</description>
    <link>${siteUrl}/rss/pinterest/${boardSlug}.xml</link>
    <atom:link href="${siteUrl}/rss/pinterest/${boardSlug}.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <image>
      <url>${siteUrl}/logo.png</url>
      <title>${escapeXml(board.name)}</title>
      <link>${siteUrl}</link>
    </image>
    ${pins.map(pin => {
      const pinUrl = pin.article_slug
        ? `${siteUrl}/recipes/${pin.article_slug}#pin-${pin.id}`
        : `${siteUrl}/pins/${pin.id}`;

      const pubDate = pin.created_at
        ? new Date(pin.created_at).toUTCString()
        : new Date().toUTCString();

      return `
    <item>
      <title>${escapeXml(pin.title)}</title>
      <link>${pinUrl}</link>
      <guid isPermaLink="true">${pinUrl}</guid>
      <description>${escapeXml(pin.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <media:content url="${escapeXml(pin.image_url)}" type="image/jpeg" width="${pin.image_width}" height="${pin.image_height}">
        <media:title>${escapeXml(pin.title)}</media:title>
        <media:description>${escapeXml(pin.description)}</media:description>
        ${pin.image_alt ? `<media:text type="plain">${escapeXml(pin.image_alt)}</media:text>` : ''}
      </media:content>
      <enclosure url="${escapeXml(pin.image_url)}" type="image/jpeg" length="0"/>
      ${pin.article_label ? `<dc:creator>${escapeXml(pin.article_label)}</dc:creator>` : ''}
      <category>${escapeXml(board.name)}</category>
    </item>`;
    }).join('\n')}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
      },
    });
  } catch (error) {
    console.error('Pinterest RSS generation error:', error);

    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Error</title>
    <description>Failed to generate RSS feed</description>
    <link>${site?.toString() || 'https://recipes-saas.com'}</link>
  </channel>
</rss>`, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
};

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate static paths for all boards (optional, for static generation)
export async function getStaticPaths() {
  // This would be populated from your database
  // For now, return empty array (dynamic routes only)
  return [];
}

