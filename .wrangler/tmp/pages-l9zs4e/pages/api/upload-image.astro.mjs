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

import { u as uploadImage } from '../../chunks/r2.service_BByT9ix6.mjs';
import { c as createMedia } from '../../chunks/media.service_BzvilGys.mjs';
import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Storage not configured", 500);
    }
    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, "") : "/images";
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const alt = formData.get("alt");
    const attribution = formData.get("attribution");
    const caption = formData.get("caption");
    if (!file) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "No file uploaded", 400);
    }
    const result = await uploadImage(
      env.IMAGES,
      {
        file,
        filename: file.name,
        contentType: file.type,
        folder: "media",
        metadata: {
          alt: alt || "",
          credit: attribution || ""
        }
      },
      publicUrl
    );
    const variants = {
      original: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      lg: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      md: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      sm: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      xs: { url: result.url, width: 0, height: 0, sizeBytes: result.size }
    };
    const mediaData = {
      name: file.name,
      altText: alt || "",
      caption: caption || "",
      credit: attribution || "",
      mimeType: result.contentType,
      variantsJson: JSON.stringify(variants),
      focalPointJson: JSON.stringify({ x: 50, y: 50 }),
      aspectRatio: "1:1"
      // Placeholder
    };
    const newMedia = await createMedia(env.DB, mediaData);
    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to save media record", 500);
    }
    const { body, status, headers } = formatSuccessResponse(newMedia);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error("Error uploading image:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, "Upload failed", 500)
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
