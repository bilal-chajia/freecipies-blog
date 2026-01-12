globalThis.process ??= {}; globalThis.process.env ??= {};
import { g as getMediaById, u as updateMedia, d as deleteMedia } from '../../../chunks/media.service_C9yR5oXg.mjs';
import '../../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_D-Ec29oM.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_CIGPYhyT.mjs';
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
const PUT = async ({ request, locals, params }) => {
  const idStr = params.id;
  if (!idStr) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Media ID is required in URL path", 400)
    );
    return new Response(body, { status, headers });
  }
  const id = parseInt(idStr);
  if (isNaN(id)) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid media ID format: '${idStr}' must be a number`, 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Editor role required to replace media files", 403);
    }
    const mediaRecord = await getMediaById(env.DB, id);
    if (!mediaRecord) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, `Media file with ID ${id} not found`, 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid form data: request body must be multipart/form-data", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const file = formData.get("file");
    if (!file) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'No file provided: include a "file" field in form data', 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const oldKeys = getAllR2Keys(mediaRecord.variantsJson);
    for (const key of oldKeys) {
      try {
        await env.IMAGES.delete(key);
      } catch (e) {
        console.warn(`Failed to delete old variant ${key}:`, e);
      }
    }
    const timestamp = Date.now();
    const newKey = `media/${id}/${timestamp}.webp`;
    const cacheBuster = `?v=${timestamp}`;
    const newUrl = `${env.R2_PUBLIC_URL}/${newKey}${cacheBuster}`;
    try {
      const arrayBuffer = await file.arrayBuffer();
      await env.IMAGES.put(newKey, arrayBuffer, {
        httpMetadata: { contentType: "image/webp" }
      });
    } catch (uploadError) {
      console.error("R2 upload failed:", uploadError);
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to upload file to storage", 500)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    try {
      const newVariants = {
        variants: {
          original: { url: newUrl.split("?")[0], r2_key: newKey, width: 0, height: 0 }
        },
        placeholder: ""
      };
      await updateMedia(env.DB, id, {
        variantsJson: JSON.stringify(newVariants),
        name: file.name
      });
    } catch (dbError) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.DATABASE_ERROR, "Database update failed", 500)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse({ success: true, id, url: newUrl });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error replacing media:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to replace media", 500)
    );
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ request, locals, params }) => {
  const idStr = params.id;
  if (!idStr) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Media ID is required in URL path", 400)
    );
    return new Response(body, { status, headers });
  }
  const id = parseInt(idStr);
  if (isNaN(id)) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid media ID format: '${idStr}' must be a number`, 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Editor role required to delete media files", 403);
    }
    const mediaRecord = await getMediaById(env.DB, id);
    if (!mediaRecord) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, `Media file with ID ${id} not found`, 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    let r2DeleteFailed = false;
    const r2Keys = getAllR2Keys(mediaRecord.variantsJson);
    await Promise.all(r2Keys.map(async (key) => {
      try {
        await env.IMAGES.delete(key);
      } catch (r2Error) {
        r2DeleteFailed = true;
        console.warn(`Failed to delete file from R2 (key: ${key}):`, r2Error);
      }
    }));
    try {
      const success = await deleteMedia(env.DB, id);
      if (!success) {
        const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
          new AppError(ErrorCodes.DATABASE_ERROR, `Failed to delete media record with ID ${id} from database`, 500)
        );
        return new Response(body2, { status: status2, headers: headers2 });
      }
    } catch (dbError) {
      console.error("Database delete failed:", dbError);
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.DATABASE_ERROR, `Database error while deleting media ID ${id}`, 500)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse({
      success: true,
      id,
      warning: r2DeleteFailed ? "Some files could not be deleted from storage" : void 0
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting media:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, `Failed to delete media: ${errorMessage}`, 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    PUT,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
