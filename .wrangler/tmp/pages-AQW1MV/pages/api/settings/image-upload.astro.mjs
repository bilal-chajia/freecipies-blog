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

import '../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { g as getImageUploadSettings, I as IMAGE_UPLOAD_DEFAULTS, u as updateImageUploadSettings, r as resetImageUploadSettings } from '../../../chunks/settings.service_C4TTblSS.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_GsDnjv--.mjs';
import { a as formatSuccessResponse, f as formatErrorResponse, A as AppError, E as ErrorCodes } from '../../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.VIEWER)) {
      return createAuthError("Authentication required", 401);
    }
    const settings = await getImageUploadSettings(env.DB);
    const { body, status, headers } = formatSuccessResponse({
      success: true,
      data: settings,
      defaults: IMAGE_UPLOAD_DEFAULTS
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching image upload settings:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to fetch settings", 500)
    );
    return new Response(body, { status, headers });
  }
};
const PUT = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Editor role required to modify settings", 403);
    }
    let updates;
    try {
      updates = await request.json();
    } catch {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid JSON body", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const validKeys = Object.keys(IMAGE_UPLOAD_DEFAULTS);
    const sanitized = {};
    for (const [key, value] of Object.entries(updates)) {
      if (validKeys.includes(key)) {
        const defaultValue = IMAGE_UPLOAD_DEFAULTS[key];
        if (typeof value === typeof defaultValue) {
          sanitized[key] = value;
        }
      }
    }
    const newSettings = await updateImageUploadSettings(env.DB, sanitized);
    const { body, status, headers } = formatSuccessResponse({
      success: true,
      data: newSettings,
      message: "Settings updated"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error updating image upload settings:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to update settings", 500)
    );
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError("Admin role required to reset settings", 403);
    }
    const settings = await resetImageUploadSettings(env.DB);
    const { body, status, headers } = formatSuccessResponse({
      success: true,
      data: settings,
      message: "Settings reset to defaults"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error resetting image upload settings:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to reset settings", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  PUT,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
