import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const articleId = url.searchParams.get('article_id');

    if (!articleId) {
      return new Response(JSON.stringify({ error: 'article_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    const { results } = await db.prepare(`
      SELECT * FROM pinterest_pins 
      WHERE article_id = ? 
      ORDER BY is_primary DESC, sort_order ASC
    `).bind(articleId).all();

    return new Response(JSON.stringify({ pins: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { article_id, board_id, title, description, image_url, image_alt, image_width, image_height, is_primary, sort_order } = body;

    if (!article_id || !title || !description || !image_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    // If this is set as primary, unset other primary pins for this article
    if (is_primary) {
      await db.prepare(`
        UPDATE pinterest_pins SET is_primary = 0 WHERE article_id = ?
      `).bind(article_id).run();
    }

    const result = await db.prepare(`
      INSERT INTO pinterest_pins 
      (article_id, board_id, title, description, image_url, image_alt, image_width, image_height, is_primary, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      article_id,
      board_id || null,
      title,
      description,
      image_url,
      image_alt || '',
      image_width || 1000,
      image_height || 1500,
      is_primary ? 1 : 0,
      sort_order || 0
    ).run();

    return new Response(JSON.stringify({
      success: true,
      id: result.meta.last_row_id
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { id, board_id, title, description, image_url, image_alt, image_width, image_height, is_primary, sort_order, pin_url } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Pin ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    // Get article_id for this pin
    const pin = await db.prepare(`SELECT article_id FROM pinterest_pins WHERE id = ?`).bind(id).first();

    if (!pin) {
      return new Response(JSON.stringify({ error: 'Pin not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If this is set as primary, unset other primary pins for this article
    if (is_primary) {
      await db.prepare(`
        UPDATE pinterest_pins SET is_primary = 0 WHERE article_id = ? AND id != ?
      `).bind(pin.article_id, id).run();
    }

    await db.prepare(`
      UPDATE pinterest_pins 
      SET board_id = ?, title = ?, description = ?, image_url = ?, image_alt = ?, 
          image_width = ?, image_height = ?, is_primary = ?, sort_order = ?, pin_url = ?
      WHERE id = ?
    `).bind(
      board_id || null,
      title,
      description,
      image_url,
      image_alt,
      image_width,
      image_height,
      is_primary ? 1 : 0,
      sort_order,
      pin_url || null,
      id
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Pin ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    await db.prepare(`DELETE FROM pinterest_pins WHERE id = ?`).bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

