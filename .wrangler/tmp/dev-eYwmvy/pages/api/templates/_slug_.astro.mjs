globalThis.process ??= {}; globalThis.process.env ??= {};
import { A as AppError, E as ErrorCodes, f as formatErrorResponse } from '../../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_D-Ec29oM.mjs';
import '../../../chunks/templates.schema_DniFYo8s.mjs';
import { h as handleGetTemplate, a as handleUpdateTemplate, b as handleDeleteTemplate } from '../../../chunks/handlers_BriOmYv8.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ params, locals }) => {
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const { slug } = params;
    return handleGetTemplate(env.DB, slug || "");
  } catch (error) {
    console.error("Error fetching template:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, error.message || "Failed to fetch template", 500)
    );
    return new Response(body, { status, headers });
  }
};
const PUT = async ({ params, request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const { slug } = params;
    const body = await request.json();
    return handleUpdateTemplate(env.DB, slug || "", body);
  } catch (error) {
    console.error("Error updating template:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, error.message || "Failed to update template", 500)
    );
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ params, request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const { slug } = params;
    return handleDeleteTemplate(env.DB, slug || "");
  } catch (error) {
    console.error("Error deleting template:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, error.message || "Failed to delete template", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    PUT,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
