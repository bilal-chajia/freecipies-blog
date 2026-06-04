/**
 * Authentication & Authorization utilities
 * Handles JWT token validation, role-based access control, and auth middleware
 */
import { SignJWT, jwtVerify } from 'jose';

export interface AuthToken {
  sub: string; // user ID
  role: 'admin' | 'editor' | 'viewer';
  exp: number; // expiration timestamp
  iat: number; // issued at timestamp
}

export interface AuthContext {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  isAuthenticated: boolean;
}

export const AuthRoles = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

/**
 * Generate JWT token
 */
export async function generateJWT(
  payload: { sub: string; role: string },
  secret: string,
  expiresIn: string = '24h'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Verify JWT token from Authorization header
 */
export async function verifyAuthToken(
  authHeader: string | null,
  secret: string
): Promise<AuthToken | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.sub === 'string' &&
      (payload.role === 'admin' || payload.role === 'editor' || payload.role === 'viewer')
    ) {
      return {
        sub: payload.sub,
        role: payload.role,
        exp: typeof payload.exp === 'number' ? payload.exp : 0,
        iat: typeof payload.iat === 'number' ? payload.iat : 0,
      };
    }
    return null;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(
  authContext: AuthContext | null,
  requiredRole: string
): boolean {
  if (!authContext?.isAuthenticated) {
    return false;
  }

  const roleHierarchy: Record<string, number> = {
    admin: 3,
    editor: 2,
    viewer: 1,
  };

  const userRoleLevel = roleHierarchy[authContext.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Extract auth context from request
 */
export async function extractAuthContext(
  request: Request,
  secret: string
): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization');
  const token = await verifyAuthToken(authHeader, secret);

  if (!token) {
    return {
      userId: '',
      role: 'viewer',
      isAuthenticated: false,
    };
  }

  return {
    userId: token.sub,
    role: token.role,
    isAuthenticated: true,
  };
}

/**
 * Create authorization response
 */
export function createAuthError(message: string, status_code: number = 401): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: status_code === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
    }),
    {
      status: status_code,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
