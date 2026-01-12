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
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../renderers.mjs';

const SEED_IMAGES = [
  { name: "Breakfast", url: "https://images.unsplash.com/photo-1533089862017-5614387e0748?w=800&q=80", folder: "categories", slug: "breakfast" },
  { name: "Desserts", url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80", folder: "categories", slug: "desserts" },
  { name: "Dinner", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80", folder: "categories", slug: "dinner" },
  { name: "Healthy", url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80", folder: "categories", slug: "healthy" },
  { name: "Vegan", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80", folder: "categories", slug: "vegan" },
  { name: "Baking", url: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800&q=80", folder: "categories", slug: "baking" }
];
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Storage not configured", 500);
    }
    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, "") : "/images";
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const results = [];
    for (const img of SEED_IMAGES) {
      try {
        const response = await fetch(img.url);
        if (!response.ok) {
          console.warn(`Failed to fetch ${img.url}`);
          continue;
        }
        const blob = await response.blob();
        const uploadResult = await uploadImage(
          env.IMAGES,
          {
            file: blob,
            filename: `${img.slug}.jpg`,
            contentType: blob.type,
            folder: img.folder,
            metadata: { alt: img.name }
          },
          publicUrl
        );
        const variants = {
          original: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size },
          // Approximate
          lg: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size },
          md: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size },
          sm: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size },
          xs: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size }
        };
        const mediaData = {
          name: img.name,
          altText: img.name,
          caption: `Default cover for ${img.slug}`,
          credit: "Unsplash",
          mimeType: uploadResult.contentType,
          variantsJson: JSON.stringify(variants),
          focalPointJson: JSON.stringify({ x: 50, y: 50 }),
          aspectRatio: "4:3"
        };
        const newMedia = await createMedia(env.DB, mediaData);
        if (newMedia) {
          results.push({ id: newMedia.id, name: newMedia.name });
          const imageJson = JSON.stringify({
            media_id: newMedia.id,
            alt: newMedia.altText,
            placeholder: uploadResult.url,
            // simplistic placeholder
            aspectRatio: "4:3",
            variants
          });
          await env.DB.prepare(`UPDATE categories SET cover_image_json = ? WHERE slug = ?`).bind(imageJson, img.slug).run();
        }
      } catch (innerError) {
        console.error(`Failed to seed ${img.name}:`, innerError);
      }
    }
    const { body, status, headers } = formatSuccessResponse({
      success: true,
      message: `Seeded ${results.length} images`,
      seeded: results
    });
    return new Response(body, { status: 200, headers });
  } catch (error) {
    console.error("Seeding completely failed:", error);
    return new Response(JSON.stringify({ error: "Seeding failed" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
