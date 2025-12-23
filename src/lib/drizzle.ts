// Re-export from shared/database to maintain existing references while centralized
export { createDb, type DrizzleDb } from '@shared/database/drizzle';
export * as schema from '@shared/database/schema';

