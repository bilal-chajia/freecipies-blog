globalThis.process ??= {}; globalThis.process.env ??= {};
import { g as getImage } from '../../chunks/r2.service_rYWvbcXk.mjs';
import '../../chunks/pinterest.schema_DDOHgYvi.mjs';
import '../../chunks/templates.schema_DniFYo8s.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ params, locals, request }) => {
  try {
    const key = params.key;
    if (!key) {
      return new Response("Image key required", { status: 400 });
    }
    const env = locals.runtime.env;
    const bucket = env.IMAGES;
    const ifNoneMatch = request.headers.get("If-None-Match");
    const r2Key = key;
    const object = await getImage(bucket, r2Key);
    if (!object) {
      return new Response("Image not found", { status: 404 });
    }
    const etag = object.httpEtag;
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }
    const headers = new Headers();
    if (object.httpMetadata) {
      if (object.httpMetadata.contentType) {
        headers.set("Content-Type", object.httpMetadata.contentType);
      }
      if (object.httpMetadata.contentDisposition) {
        headers.set("Content-Disposition", object.httpMetadata.contentDisposition);
      }
      if (object.httpMetadata.cacheControl) {
        headers.set("Cache-Control", object.httpMetadata.cacheControl);
      } else {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }
      if (object.httpMetadata.contentEncoding) {
        headers.set("Content-Encoding", object.httpMetadata.contentEncoding);
      }
      if (object.httpMetadata.contentLanguage) {
        headers.set("Content-Language", object.httpMetadata.contentLanguage);
      }
    }
    headers.set("etag", etag);
    return new Response(object.body, {
      headers
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
