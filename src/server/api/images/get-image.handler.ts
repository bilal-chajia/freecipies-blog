import { AppError, ErrorCodes, formatErrorResponse } from "@shared/utils";
import { validate, z } from "@shared/validation";
import { getCloudflareEnv, getR2PublicUrl } from "@server/cloudflare/env";

const ImagePathSchema = z
  .string()
  .min(1, "Image path is required")
  .refine((path) => !path.includes(".."), "Invalid image path");

interface GetImageHandlerContext {
  rawPath: string | string[] | undefined;
  request: Request;
}

const proxyFromPublicR2 = async (
  key: string,
  request: Request,
): Promise<Response | null> => {
  const r2PublicUrl = getR2PublicUrl();
  if (!r2PublicUrl) return null;

  const imageUrl = `${r2PublicUrl.replace(/\/$/, "")}/${key}`;
  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        "If-None-Match": request.headers.get("If-None-Match") || "",
      },
    });

    if (!upstream.ok && upstream.status !== 304) return null;

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get("Content-Type");
    const cacheControl = upstream.headers.get("Cache-Control");
    const etag = upstream.headers.get("ETag");

    if (contentType) responseHeaders.set("Content-Type", contentType);
    responseHeaders.set(
      "Cache-Control",
      cacheControl || "public, max-age=31536000, immutable",
    );
    if (etag) responseHeaders.set("ETag", etag);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return null;
  }
};

const errorResponse = (error: AppError): Response => {
  const { body, status, headers } = formatErrorResponse(error);
  return new Response(body, { status, headers });
};

export const handleGetImage = async ({
  rawPath,
  request,
}: GetImageHandlerContext): Promise<Response> => {
  const rawKey = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
  const key = validate(ImagePathSchema, rawKey);
  const env = getCloudflareEnv();

  if (!env.IMAGES) {
    const publicFallback = await proxyFromPublicR2(key, request);
    if (publicFallback) return publicFallback;

    return errorResponse(
      new AppError(
        ErrorCodes.INTERNAL_ERROR,
        "Storage not configured and no R2_PUBLIC_URL fallback available",
        503,
      ),
    );
  }

  const ifNoneMatch = request.headers.get("If-None-Match");
  let object = await env.IMAGES.get(key);

  if (!object && key.startsWith("media/")) {
    object = await env.IMAGES.get(key.replace("media/", ""));
  }

  if (!object) {
    const publicFallback = await proxyFromPublicR2(key, request);
    if (publicFallback) return publicFallback;

    return errorResponse(
      new AppError(ErrorCodes.NOT_FOUND, `Image not found: ${key}`, 404),
    );
  }

  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304 });
  }

  const headers = new Headers();
  const metadata = object.httpMetadata;

  if (metadata?.contentType) headers.set("Content-Type", metadata.contentType);
  if (metadata?.contentDisposition) {
    headers.set("Content-Disposition", metadata.contentDisposition);
  }
  headers.set(
    "Cache-Control",
    metadata?.cacheControl || "public, max-age=31536000, immutable",
  );
  if (metadata?.contentEncoding) {
    headers.set("Content-Encoding", metadata.contentEncoding);
  }
  if (metadata?.contentLanguage) {
    headers.set("Content-Language", metadata.contentLanguage);
  }
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/octet-stream");
  }
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");

  return new Response(await object.arrayBuffer(), { status: 200, headers });
};
