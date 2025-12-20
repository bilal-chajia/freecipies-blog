/**
 * Auth Module - TypeScript Types
 * Additional types not defined in the service
 */

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  error?: string;
}
