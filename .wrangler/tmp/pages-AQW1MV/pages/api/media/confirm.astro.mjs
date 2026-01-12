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

import { c as createMedia } from '../../../chunks/media.service_BzvilGys.mjs';
import '../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const body = await request.json();
    if (!body.name || !body.altText || !body.variants) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Missing required fields: name, altText, variants", 400);
    }
    const requiredVariants = ["lg", "md", "sm", "xs"];
    for (const v of requiredVariants) {
      if (!body.variants[v]) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, `Missing required variant: ${v}`, 400);
      }
    }
    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, "") : "/images";
    const variantsJson = {
      variants: {},
      placeholder: body.placeholder || ""
    };
    for (const [key, variant] of Object.entries(body.variants)) {
      if (variant) {
        variantsJson.variants[key] = {
          url: `${publicUrl}/${variant.r2Key}`,
          r2_key: variant.r2Key,
          width: variant.width,
          height: variant.height,
          sizeBytes: variant.sizeBytes
        };
      }
    }
    const focalPointJson = body.focalPoint ? JSON.stringify(body.focalPoint) : '{"x": 50, "y": 50}';
    const mediaData = {
      name: body.name,
      altText: body.altText,
      caption: body.caption || "",
      credit: body.credit || "",
      mimeType: body.mimeType || "image/webp",
      aspectRatio: body.aspectRatio || null,
      variantsJson: JSON.stringify(variantsJson),
      focalPointJson
    };
    const newMedia = await createMedia(env.DB, mediaData);
    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to create media record", 500);
    }
    const { body: responseBody, status, headers } = formatSuccessResponse(newMedia);
    return new Response(responseBody, { status: 201, headers });
  } catch (error) {
    console.error("Error confirming upload:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to confirm upload", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
