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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
}
function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function handleListTemplates(db, activeOnly = true) {
  try {
    let query = `
      SELECT 
        id, slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active,
        created_at, updated_at
      FROM pin_templates
      WHERE 1=1
    `;
    if (activeOnly) {
      query += " AND is_active = 1";
    }
    query += " ORDER BY created_at DESC";
    const result = await db.prepare(query).all();
    const templates = (result.results || []).map((t) => ({
      ...t,
      elements: t.elements_json ? JSON.parse(t.elements_json) : []
    }));
    return jsonResponse(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return errorResponse("Failed to fetch templates", 500);
  }
}
async function handleGetTemplate(db, slug) {
  try {
    if (!slug) {
      return errorResponse("Slug is required", 400);
    }
    const result = await db.prepare(`
      SELECT 
        id, slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active,
        created_at, updated_at
      FROM pin_templates
      WHERE slug = ?1
    `).bind(slug).first();
    if (!result) {
      return errorResponse("Template not found", 404);
    }
    const template = {
      ...result,
      elements: result.elements_json ? JSON.parse(result.elements_json) : []
    };
    return jsonResponse(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return errorResponse("Failed to fetch template", 500);
  }
}
async function handleCreateTemplate(db, body) {
  try {
    const {
      slug,
      name,
      description = "",
      thumbnail_url = null,
      width = 1e3,
      height = 1500,
      category = "general",
      elements_json = "[]",
      is_active = true
    } = body;
    if (!slug || !name) {
      return errorResponse("Slug and name are required", 400);
    }
    const elementsStr = typeof elements_json === "string" ? elements_json : JSON.stringify(elements_json);
    const result = await db.prepare(`
      INSERT INTO pin_templates (
        slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    `).bind(
      slug,
      name,
      description,
      thumbnail_url,
      width,
      height,
      category,
      elementsStr,
      is_active ? 1 : 0
    ).run();
    if (!result.success) {
      return errorResponse("Failed to create template", 500);
    }
    return jsonResponse({
      id: result.meta?.last_row_id,
      slug,
      message: "Template created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating template:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return errorResponse("Template with this slug already exists", 409);
    }
    return errorResponse("Failed to create template", 500);
  }
}
async function handleUpdateTemplate(db, slug, body) {
  try {
    if (!slug) {
      return errorResponse("Slug is required", 400);
    }
    const {
      name,
      description,
      thumbnail_url,
      width,
      height,
      category,
      elements_json,
      is_active,
      slug: newSlug
    } = body;
    const elementsStr = elements_json !== void 0 ? typeof elements_json === "string" ? elements_json : JSON.stringify(elements_json) : void 0;
    const updates = [];
    const updateParams = [];
    let paramIndex = 1;
    if (name !== void 0) {
      updates.push(`name = ?${paramIndex++}`);
      updateParams.push(name);
    }
    if (description !== void 0) {
      updates.push(`description = ?${paramIndex++}`);
      updateParams.push(description);
    }
    if (thumbnail_url !== void 0) {
      updates.push(`thumbnail_url = ?${paramIndex++}`);
      updateParams.push(thumbnail_url);
    }
    if (width !== void 0) {
      updates.push(`width = ?${paramIndex++}`);
      updateParams.push(width);
    }
    if (height !== void 0) {
      updates.push(`height = ?${paramIndex++}`);
      updateParams.push(height);
    }
    if (category !== void 0) {
      updates.push(`category = ?${paramIndex++}`);
      updateParams.push(category);
    }
    if (elementsStr !== void 0) {
      updates.push(`elements_json = ?${paramIndex++}`);
      updateParams.push(elementsStr);
    }
    if (is_active !== void 0) {
      updates.push(`is_active = ?${paramIndex++}`);
      updateParams.push(is_active ? 1 : 0);
    }
    if (newSlug !== void 0 && newSlug !== slug) {
      updates.push(`slug = ?${paramIndex++}`);
      updateParams.push(newSlug);
    }
    if (updates.length === 0) {
      return errorResponse("No updates provided", 400);
    }
    updateParams.push(slug);
    const query = `
      UPDATE pin_templates 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?${paramIndex}
    `;
    const result = await db.prepare(query).bind(...updateParams).run();
    if (result.meta?.changes === 0) {
      return errorResponse("Template not found", 404);
    }
    return jsonResponse({
      slug: newSlug || slug,
      message: "Template updated successfully"
    });
  } catch (error) {
    console.error("Error updating template:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return errorResponse("Template with this slug already exists", 409);
    }
    return errorResponse("Failed to update template", 500);
  }
}
async function handleDeleteTemplate(db, slug) {
  try {
    if (!slug) {
      return errorResponse("Slug is required", 400);
    }
    const result = await db.prepare(`
      DELETE FROM pin_templates WHERE slug = ?1
    `).bind(slug).run();
    if (result.meta?.changes === 0) {
      return errorResponse("Template not found", 404);
    }
    return jsonResponse({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return errorResponse("Failed to delete template", 500);
  }
}

export { handleUpdateTemplate as a, handleDeleteTemplate as b, handleListTemplates as c, handleCreateTemplate as d, handleGetTemplate as h };
