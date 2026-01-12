if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

export { renderers } from '../../../renderers.mjs';

const GET = async ({ params, locals, site }) => {
  try {
    const boardSlug = params.board;
    const siteUrl = site?.toString() || "https://recipes-saas.com";
    const db = locals.runtime?.env?.DB;
    if (!db) {
      throw new Error("Database not available");
    }
    const board = await db.prepare(`
      SELECT * FROM pinterest_boards 
      WHERE slug = ? AND is_active = 1
    `).bind(boardSlug).first();
    if (!board) {
      return new Response("Board not found", { status: 404 });
    }
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
    const pins = results;
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
    <lastBuildDate>${(/* @__PURE__ */ new Date()).toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <image>
      <url>${siteUrl}/logo.png</url>
      <title>${escapeXml(board.name)}</title>
      <link>${siteUrl}</link>
    </image>
    ${pins.map((pin) => {
      const pinUrl = pin.article_slug ? `${siteUrl}/recipes/${pin.article_slug}#pin-${pin.id}` : `${siteUrl}/pins/${pin.id}`;
      const pubDate = pin.created_at ? new Date(pin.created_at).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
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
        ${pin.image_alt ? `<media:text type="plain">${escapeXml(pin.image_alt)}</media:text>` : ""}
      </media:content>
      <enclosure url="${escapeXml(pin.image_url)}" type="image/jpeg" length="0"/>
      ${pin.article_label ? `<dc:creator>${escapeXml(pin.article_label)}</dc:creator>` : ""}
      <category>${escapeXml(board.name)}</category>
    </item>`;
    }).join("\n")}
  </channel>
</rss>`;
    return new Response(rss, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300"
        // 5 minutes cache
      }
    });
  } catch (error) {
    console.error("Pinterest RSS generation error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Error</title>
    <description>Failed to generate RSS feed</description>
    <link>${site?.toString() || "https://recipes-saas.com"}</link>
  </channel>
</rss>`, {
      status: 500,
      headers: {
        "Content-Type": "application/xml; charset=utf-8"
      }
    });
  }
};
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
async function getStaticPaths() {
  return [];
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  getStaticPaths
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
