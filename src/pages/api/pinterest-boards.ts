import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    const db = locals.runtime.env.DB;

    if (slug) {
      // Get single board
      const board = await db.prepare(`
        SELECT * FROM pinterest_boards WHERE slug = ?
      `).bind(slug).first();

      if (!board) {
        return new Response(JSON.stringify({ error: 'Board not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ board }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all boards
    const { results } = await db.prepare(`
      SELECT * FROM pinterest_boards 
      WHERE is_active = 1 
      ORDER BY name ASC
    `).all();

    return new Response(JSON.stringify({ boards: results }), {
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
    const { slug, name, description, board_url } = body;

    if (!slug || !name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    const result = await db.prepare(`
      INSERT INTO pinterest_boards (slug, name, description, board_url)
      VALUES (?, ?, ?, ?)
    `).bind(slug, name, description || '', board_url || '').run();

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
    const { id, slug, name, description, board_url, is_active } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Board ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    await db.prepare(`
      UPDATE pinterest_boards 
      SET slug = ?, name = ?, description = ?, board_url = ?, is_active = ?
      WHERE id = ?
    `).bind(slug, name, description, board_url, is_active ? 1 : 0, id).run();

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
      return new Response(JSON.stringify({ error: 'Board ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    await db.prepare(`DELETE FROM pinterest_boards WHERE id = ?`).bind(id).run();

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

