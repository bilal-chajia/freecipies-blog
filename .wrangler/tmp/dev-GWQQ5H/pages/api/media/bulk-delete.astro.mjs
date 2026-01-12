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

import { g as getMediaById, h as hardDeleteMedia } from '../../../chunks/media.service_BzvilGys.mjs';
import '../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_GsDnjv--.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
function getAllR2Keys(variantsJson) {
  if (!variantsJson) return [];
  const keys = [];
  try {
    const data = JSON.parse(variantsJson);
    if (data.variants && typeof data.variants === "object") {
      Object.values(data.variants).forEach((variant) => {
        if (variant?.r2_key) {
          keys.push(variant.r2_key);
        }
      });
    } else {
      const simpleVariant = data.original || data.lg || data.md || data.sm || data.xs;
      if (simpleVariant?.r2_key) keys.push(simpleVariant.r2_key);
    }
  } catch {
  }
  return keys;
}
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Editor role required to delete media files", 403);
    }
    let ids = [];
    try {
      const body2 = await request.json();
      if (Array.isArray(body2.ids)) {
        ids = body2.ids.map((id) => parseInt(id)).filter((id) => !isNaN(id));
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }
    if (ids.length === 0) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "No valid IDs provided", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const stats = {
      processed: 0,
      deleted: 0,
      failed: 0,
      errors: []
    };
    const BATCH_SIZE = 5;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (id) => {
        try {
          const mediaRecord = await getMediaById(env.DB, id);
          if (!mediaRecord) {
            stats.failed++;
            stats.errors.push(`Media ${id} not found`);
            return;
          }
          const r2Keys = getAllR2Keys(mediaRecord.variantsJson);
          await Promise.all(r2Keys.map((key) => env.IMAGES.delete(key).catch((e) => console.warn(`R2 delete failed for ${key}`, e))));
          const success = await hardDeleteMedia(env.DB, id);
          if (success) {
            stats.deleted++;
          } else {
            stats.failed++;
            stats.errors.push(`Failed to delete media ${id} from DB`);
          }
        } catch (err) {
          console.error(`Error deleting media ${id}:`, err);
          stats.failed++;
          stats.errors.push(`Error deleting ${id}: ${err.message}`);
        } finally {
          stats.processed++;
        }
      }));
    }
    const { body, status, headers } = formatSuccessResponse({
      success: true,
      stats
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Bulk delete error:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Bulk delete failed", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    POST,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
