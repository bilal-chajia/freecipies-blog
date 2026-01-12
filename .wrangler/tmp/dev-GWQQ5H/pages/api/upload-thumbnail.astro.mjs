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

import { d as deleteImage, u as uploadImage } from '../../chunks/r2.service_BByT9ix6.mjs';
import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import '../../chunks/templates.schema_DMbF8Dv3.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_GsDnjv--.mjs';
import { A as AppError, E as ErrorCodes, f as formatErrorResponse, a as formatSuccessResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Storage not configured", 500);
    }
    const bucket = env.IMAGES;
    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, "") : "/images";
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions to upload thumbnails", 403);
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const templateSlug = formData.get("templateSlug") || "untitled";
    const oldThumbnailUrl = formData.get("oldThumbnailUrl") || "";
    if (!file) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "No file provided", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid file type. Only JPEG, PNG, and WebP are allowed.", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    if (oldThumbnailUrl && oldThumbnailUrl.includes("/thumbnails/")) {
      try {
        const urlParts = oldThumbnailUrl.split("/images/");
        if (urlParts.length > 1) {
          const oldKey = urlParts[1];
          await deleteImage(bucket, oldKey);
          console.log(`Deleted old thumbnail: ${oldKey}`);
        }
      } catch (deleteError) {
        console.warn("Failed to delete old thumbnail:", deleteError);
      }
    }
    const result = await uploadImage(
      bucket,
      {
        file,
        filename: file.name,
        contentType: file.type,
        metadata: {
          type: "template-thumbnail",
          templateSlug
        },
        folder: "thumbnails",
        contextSlug: templateSlug
      },
      publicUrl
    );
    const { body, status, headers } = formatSuccessResponse({
      url: result.url,
      key: result.key,
      size: result.size
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, error.message || "Failed to upload thumbnail", 500)
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
