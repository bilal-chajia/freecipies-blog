globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_D-Ec29oM.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../chunks/error-handler_CIGPYhyT.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const ALLOWED_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"];
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions to upload fonts", 403);
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "No file provided", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid font type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`, 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    if (file.size > 5 * 1024 * 1024) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Font file too large (max 5MB)", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const baseName = file.name.replace(ext, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFilename = `${baseName}${ext}`;
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    await fs.mkdir(fontsDir, { recursive: true });
    const filePath = path.join(fontsDir, safeFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    const url = `/fonts/${safeFilename}`;
    const { body, status, headers } = formatSuccessResponse({
      url,
      filename: safeFilename,
      size: file.size
    });
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error("Error uploading font:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to upload font", 500)
    );
    return new Response(body, { status, headers });
  }
};
const GET = async ({ locals }) => {
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    try {
      const files = await fs.readdir(fontsDir);
      const fonts = files.filter((f) => ALLOWED_EXTENSIONS.includes(path.extname(f).toLowerCase())).map((f) => ({
        name: f.replace(path.extname(f), ""),
        filename: f,
        url: `/fonts/${f}`
      }));
      const { body, status, headers } = formatSuccessResponse(fonts);
      return new Response(body, { status, headers });
    } catch {
      const { body, status, headers } = formatSuccessResponse([]);
      return new Response(body, { status, headers });
    }
  } catch (error) {
    console.error("Error listing fonts:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to list fonts", 500)
    );
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions to delete fonts", 403);
    }
    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");
    if (!filename) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Filename is required", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid file type", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const filePath = path.join(fontsDir, filename);
    await fs.unlink(filePath);
    const { body, status, headers } = formatSuccessResponse({ deleted: filename });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting font:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to delete font", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    POST,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
