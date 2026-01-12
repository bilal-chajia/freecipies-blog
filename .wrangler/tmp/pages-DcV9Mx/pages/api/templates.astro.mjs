globalThis.process ??= {}; globalThis.process.env ??= {};
import { A as AppError, E as ErrorCodes, f as formatErrorResponse } from '../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_D-Ec29oM.mjs';
import '../../chunks/templates.schema_DniFYo8s.mjs';
import { c as handleListTemplates, d as handleCreateTemplate } from '../../chunks/handlers_BriOmYv8.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const url = new URL(request.url);
    const isActive = url.searchParams.get("is_active") !== "false";
    return handleListTemplates(env.DB, isActive);
  } catch (error) {
    console.error("Error fetching templates:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, error.message || "Failed to fetch templates", 500)
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ request, locals }) => {
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
    const body = await request.json();
    return handleCreateTemplate(env.DB, body);
  } catch (error) {
    console.error("Error creating template:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, error.message || "Failed to create template", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    POST,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
