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

import fs from 'node:fs/promises';
import path from 'node:path';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_GsDnjv--.mjs';
import { a as formatSuccessResponse, f as formatErrorResponse, A as AppError, E as ErrorCodes } from '../../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const LOGOS_DIR = path.join(process.cwd(), "public", "logos");
async function ensureLogosDir() {
  try {
    await fs.access(LOGOS_DIR);
  } catch {
    await fs.mkdir(LOGOS_DIR, { recursive: true });
  }
}
function getExtensionFromMimeType(mimeType) {
  const mimeToExt = {
    "image/svg+xml": "svg",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico"
  };
  return mimeToExt[mimeType] || "png";
}
const VALID_LOGO_TYPES = ["main", "dark", "mobile"];
const VALID_IMAGE_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp", "image/gif"];
const FAVICON_SIZES = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 }
];
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    await ensureLogosDir();
    const files = await fs.readdir(LOGOS_DIR);
    const branding = {
      logoMain: null,
      logoDark: null,
      logoMobile: null,
      favicon: null
    };
    for (const file of files) {
      if (file.startsWith("logo-main.")) {
        branding.logoMain = `/logos/${file}`;
      } else if (file.startsWith("logo-dark.")) {
        branding.logoDark = `/logos/${file}`;
      } else if (file.startsWith("logo-mobile.")) {
        branding.logoMobile = `/logos/${file}`;
      } else if (file.startsWith("favicon.") && !file.includes("-")) {
        branding.favicon = `/logos/${file}`;
      }
    }
    const faviconVariants = {};
    for (const { name } of FAVICON_SIZES) {
      if (files.includes(name)) {
        faviconVariants[name] = `/logos/${name}`;
      }
    }
    const { body, status, headers } = formatSuccessResponse({
      ...branding,
      faviconVariants
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Failed to get branding:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to get branding", 500)
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    await ensureLogosDir();
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[2];
    const type = pathParts[3];
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "No file provided", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid file type. Supported: SVG, PNG, JPG, WebP, GIF", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const extension = getExtensionFromMimeType(file.type);
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    if (action === "logo") {
      if (!type || !VALID_LOGO_TYPES.includes(type)) {
        const { body: body3, status: status3, headers: headers3 } = formatErrorResponse(
          new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid logo type. Use: main, dark, or mobile", 400)
        );
        return new Response(body3, { status: status3, headers: headers3 });
      }
      const files = await fs.readdir(LOGOS_DIR);
      for (const existingFile of files) {
        if (existingFile.startsWith(`logo-${type}.`)) {
          try {
            await fs.unlink(path.join(LOGOS_DIR, existingFile));
          } catch (e) {
            if (e.code !== "ENOENT") throw e;
          }
        }
      }
      const filename = `logo-${type}.${extension}`;
      await fs.writeFile(path.join(LOGOS_DIR, filename), uint8Array);
      const { body: body2, status: status2, headers: headers2 } = formatSuccessResponse({
        url: `/logos/${filename}`,
        type,
        filename
      });
      return new Response(body2, { status: status2, headers: headers2 });
    } else if (action === "favicon") {
      const faviconFilename = `favicon.${extension}`;
      await fs.writeFile(path.join(LOGOS_DIR, faviconFilename), uint8Array);
      const { body: body2, status: status2, headers: headers2 } = formatSuccessResponse({
        url: `/logos/${faviconFilename}`,
        filename: faviconFilename,
        sizesToGenerate: FAVICON_SIZES
      });
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid action", 400)
    );
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Failed to upload branding asset:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to upload file", 500)
    );
    return new Response(body, { status, headers });
  }
};
const PUT = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    await ensureLogosDir();
    const formData = await request.formData();
    const file = formData.get("file");
    const filename = formData.get("filename");
    if (!file || !filename) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Missing file or filename", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const validFilenames = FAVICON_SIZES.map((s) => s.name);
    if (!validFilenames.includes(filename)) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid favicon variant filename", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await fs.writeFile(path.join(LOGOS_DIR, filename), uint8Array);
    const { body, status, headers } = formatSuccessResponse({
      url: `/logos/${filename}`,
      filename
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Failed to upload favicon variant:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to upload favicon variant", 500)
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
      return createAuthError("Insufficient permissions", 403);
    }
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[2];
    const type = pathParts[3];
    await ensureLogosDir();
    const files = await fs.readdir(LOGOS_DIR);
    if (action === "logo" && type && VALID_LOGO_TYPES.includes(type)) {
      for (const file of files) {
        if (file.startsWith(`logo-${type}.`)) {
          try {
            await fs.unlink(path.join(LOGOS_DIR, file));
          } catch (e) {
            if (e.code !== "ENOENT") throw e;
          }
        }
      }
      const { body: body2, status: status2, headers: headers2 } = formatSuccessResponse({
        message: `Logo ${type} deleted`
      });
      return new Response(body2, { status: status2, headers: headers2 });
    } else if (action === "favicon") {
      const faviconFiles = files.filter(
        (f) => f.startsWith("favicon") || f.startsWith("apple-touch-icon") || f.startsWith("android-chrome")
      );
      for (const file of faviconFiles) {
        try {
          await fs.unlink(path.join(LOGOS_DIR, file));
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
      }
      const { body: body2, status: status2, headers: headers2 } = formatSuccessResponse({
        message: "Favicon and all variants deleted"
      });
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid delete target", 400)
    );
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Failed to delete branding asset:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Failed to delete file", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    POST,
    PUT,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
