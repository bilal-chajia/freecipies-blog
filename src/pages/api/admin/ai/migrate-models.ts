/**
 * AI Models Migration API Endpoint
 * ==================================
 * POST /api/admin/ai/migrate-models
 * 
 * Migrates hardcoded AI models from types.ts to site_settings database.
 */

import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getAISettings, saveAISettings, AVAILABLE_MODELS } from '@modules/ai';

export const prerender = false;

/**
 * POST - Run migration to add models to site_settings
 */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check - require admin
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin permissions required', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        console.log('🚀 Starting AI models migration...');

        // 1. Get current settings
        const currentSettings = await getAISettings(env.DB);
        console.log('✅ Current settings loaded');

        // 2. Migrate models for each provider
        let totalModels = 0;
        const migrationLog: string[] = [];

        for (const [provider, models] of Object.entries(AVAILABLE_MODELS)) {
            console.log(`📦 Migrating ${provider}...`);
            migrationLog.push(`Migrating ${provider}...`);

            // Ensure provider exists in settings
            if (!currentSettings.providers[provider]) {
                currentSettings.providers[provider] = {
                    enabled: false,
                    apiKey: ''
                };
            }

            // Add availableModels array with metadata
            currentSettings.providers[provider].availableModels = models.map((model, index) => ({
                id: model.id,
                name: model.name,
                description: model.description || '',
                contextWindow: model.contextWindow,
                maxTokens: model.maxTokens,
                enabled: true, // Enable all models by default
                deprecated: model.description?.includes('DEPRECATED') || false,
                order: index
            }));

            const modelCount = models.length;
            totalModels += modelCount;
            migrationLog.push(`  ✓ Added ${modelCount} models to ${provider}`);
            console.log(`   ✓ Added ${modelCount} models`);
        }

        console.log(`✅ Total models migrated: ${totalModels}`);
        migrationLog.push(`Total models migrated: ${totalModels}`);

        // 3. Save updated settings
        console.log('💾 Updating database...');
        const success = await saveAISettings(env.DB, currentSettings);

        if (!success) {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to save migrated models', 500);
        }

        console.log('✅ Database updated successfully!');
        migrationLog.push('Database updated successfully!');

        // 4. Verify migration
        const verifiedSettings = await getAISettings(env.DB);
        const verification: Record<string, number> = {};

        for (const [provider, config] of Object.entries(verifiedSettings.providers)) {
            const modelCount = config.availableModels?.length || 0;
            verification[provider] = modelCount;
            console.log(`   ${provider}: ${modelCount} models`);
        }

        console.log('✅ Migration completed successfully!');
        migrationLog.push('Migration completed successfully!');

        const { body, status, headers } = formatSuccessResponse({
            success: true,
            totalModels,
            verification,
            log: migrationLog
        });

        return new Response(body, { status, headers });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Migration failed', 500)
        );
        return new Response(body, { status, headers });
    }
};
