/**
 * Migration Script: Add AI Models to Site Settings
 * 
 * This script migrates hardcoded AI models from types.ts to the site_settings database.
 * It adds an `availableModels` array to each provider in the ai_settings JSONB field.
 */

import { db } from '../src/lib/db';
import { AVAILABLE_MODELS } from '../src/modules/ai/types';

async function migrateAIModels() {
    console.log('🚀 Starting AI models migration...\n');

    try {
        // 1. Fetch current site_settings
        const result = await db.query('SELECT ai_settings FROM site_settings LIMIT 1');

        if (result.rows.length === 0) {
            console.error('❌ No site_settings found. Please ensure site_settings table exists.');
            process.exit(1);
        }

        const currentSettings = result.rows[0].ai_settings || { providers: {} };
        console.log('✅ Current settings loaded\n');

        // 2. Migrate models for each provider
        let totalModels = 0;

        for (const [provider, models] of Object.entries(AVAILABLE_MODELS)) {
            console.log(`📦 Migrating ${provider}...`);

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
            console.log(`   ✓ Added ${modelCount} models`);
        }

        console.log(`\n✅ Total models migrated: ${totalModels}\n`);

        // 3. Update database
        console.log('💾 Updating database...');
        await db.query(
            'UPDATE site_settings SET ai_settings = $1 WHERE id = (SELECT id FROM site_settings LIMIT 1)',
            [currentSettings]
        );
        console.log('✅ Database updated successfully!\n');

        // 4. Verify migration
        const verifyResult = await db.query('SELECT ai_settings FROM site_settings LIMIT 1');
        const updatedSettings = verifyResult.rows[0].ai_settings;

        console.log('🔍 Verification:');
        for (const [provider, config] of Object.entries(updatedSettings.providers)) {
            const modelCount = config.availableModels?.length || 0;
            console.log(`   ${provider}: ${modelCount} models`);
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await db.end();
    }
}

// Run migration
migrateAIModels();
