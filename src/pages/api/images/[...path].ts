import type { APIRoute } from 'astro';
import { handleGetImage } from '@server/api/images/get-image.handler';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, request }) => {
  return handleGetImage({ rawPath: params.path, request });
};
