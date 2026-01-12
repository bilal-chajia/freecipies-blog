globalThis.process ??= {}; globalThis.process.env ??= {};
import { u as uploadImage } from '../../chunks/r2.service_rYWvbcXk.mjs';
import { c as createMedia } from '../../chunks/media.service_C9yR5oXg.mjs';
import '../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_D-Ec29oM.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Storage not configured", 500);
    }
    const publicUrl = env.ENVIRONMENT === "production" ? env.R2_PUBLIC_URL : "/images";
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const body = await request.json();
    const { imageUrl, alt, attribution, caption } = body;
    if (!imageUrl) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "No URL provided", 400);
    }
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Failed to fetch image from URL: ${response.statusText}`, 400);
    }
    const blob = await response.blob();
    const rawFilename = imageUrl.split("/").pop()?.split("?")[0] || `import-${Date.now()}`;
    const filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const result = await uploadImage(
      env.IMAGES,
      {
        file: blob,
        filename,
        contentType: blob.type || "image/jpeg",
        folder: "media",
        metadata: {
          alt: alt || "",
          credit: attribution || ""
        }
      },
      publicUrl
    );
    const variants = {
      original: { url: result.url, width: 0, height: 0 },
      lg: { url: result.url, width: 0, height: 0 },
      md: { url: result.url, width: 0, height: 0 },
      sm: { url: result.url, width: 0, height: 0 },
      xs: { url: result.url, width: 0, height: 0 }
    };
    const mediaData = {
      name: filename,
      altText: alt || "",
      caption: caption || "",
      credit: attribution || "",
      mimeType: result.contentType,
      sizeBytes: result.size,
      variantsJson: JSON.stringify(variants),
      focalPointJson: JSON.stringify({ x: 50, y: 50 }),
      aspectRatio: "1:1"
    };
    const newMedia = await createMedia(env.DB, mediaData);
    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to save media record", 500);
    }
    const { body: responseBody, status, headers } = formatSuccessResponse(newMedia);
    return new Response(responseBody, { status: 201, headers });
  } catch (error) {
    console.error("Error uploading from URL:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, "Import from URL failed", 500)
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
