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

import { u as uploadImage } from '../../../chunks/r2.service_BByT9ix6.mjs';
import '../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import '../../../chunks/templates.schema_DMbF8Dv3.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Storage not configured", 500);
    }
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, "") : "/images";
    const formData = await request.formData();
    const file = formData.get("file");
    const variantName = formData.get("variantName");
    const baseName = formData.get("baseName");
    const uploadId = formData.get("uploadId");
    const width = parseInt(formData.get("width")) || 0;
    const height = parseInt(formData.get("height")) || 0;
    if (!file || !variantName || !baseName) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Missing required fields: file, variantName, baseName", 400);
    }
    const suffix = variantName === "original" ? "" : `-${variantName}`;
    const ext = file.name.split(".").pop() || "webp";
    const folder = "media";
    const r2Key = `${folder}/${baseName}${suffix}-${uploadId || Date.now()}.${ext}`;
    const result = await uploadImage(
      env.IMAGES,
      {
        file,
        filename: `${baseName}${suffix}.${ext}`,
        contentType: file.type,
        folder
      },
      publicUrl
    );
    const { body, status, headers } = formatSuccessResponse({
      r2Key: result.key,
      url: result.url,
      width,
      height
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error uploading variant:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, "Variant upload failed", 500)
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
