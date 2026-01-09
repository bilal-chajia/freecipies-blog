/**
 * Migration Button Component
 * ===========================
 * Simple button to trigger AI models migration
 * Only shows if models haven't been migrated yet
 */

import React, { useState, useEffect } from 'react';
import { Database, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import { Alert, AlertDescription } from '@/ui/alert';
import api from '@/services/api';

export function MigrateModelsButton({ onSuccess, settings }) {
    const [migrating, setMigrating] = useState(false);
    const [result, setResult] = useState(null);
    const [shouldShow, setShouldShow] = useState(false);

    // Check if migration is needed
    useEffect(() => {
        if (!settings?.providers) {
            setShouldShow(false);
            return;
        }

        // Check if any provider has availableModels
        const hasModels = Object.values(settings.providers).some(
            provider => provider?.availableModels && provider.availableModels.length > 0
        );

        // Only show button if no models exist yet
        setShouldShow(!hasModels);
    }, [settings]);

    const handleMigrate = async () => {
        if (!confirm('This will populate the database with all available AI models from types.ts. Continue?')) {
            return;
        }

        try {
            setMigrating(true);
            setResult(null);
            const response = await api.post('/admin/ai/migrate-models');

            if (response.data.success) {
                setResult({
                    type: 'success',
                    message: `Successfully migrated ${response.data.data.totalModels} models!`
                });
                setShouldShow(false); // Hide button after successful migration
                onSuccess?.();
            }
        } catch (err) {
            console.error('Failed to migrate models:', err);
            setResult({
                type: 'error',
                message: 'Failed to migrate models. Check console for details.'
            });
        } finally {
            setMigrating(false);
        }
    };

    // Don't render if models already exist
    if (!shouldShow && !result) {
        return null;
    }

    return (
        <div className="space-y-3">
            {shouldShow && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div>
                        <h4 className="text-sm font-medium">Initial Setup Required</h4>
                        <p className="text-xs text-muted-foreground">
                            Populate database with all available AI models (~60 models)
                        </p>
                    </div>
                    <Button
                        onClick={handleMigrate}
                        disabled={migrating}
                        className="flex items-center gap-1.5 h-8 px-3 text-xs"
                    >
                        {migrating ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Migrating...
                            </>
                        ) : (
                            <>
                                <Database className="h-3.5 w-3.5" />
                                Migrate Models
                            </>
                        )}
                    </Button>
                </div>
            )}

            {result && (
                <Alert variant={result.type === 'error' ? 'destructive' : 'default'}>
                    {result.type === 'success' && <CheckCircle className="h-4 w-4" />}
                    <AlertDescription>{result.message}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
