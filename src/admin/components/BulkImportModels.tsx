/**
 * Bulk Import Models Component
 * =============================
 * Import multiple AI models at once via JSON
 */

import React, { useState } from 'react';
import { Upload, FileJson, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Alert, AlertDescription } from '@/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import api from '@/services/api';

export function BulkImportModels({ provider, onSuccess, iconOnly = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [result, setResult] = useState(null);

    const exampleJson = JSON.stringify([
        {
            id: "gpt-4o-mini",
            name: "GPT-4o Mini",
            description: "Affordable and intelligent small model",
            contextWindow: 128000,
            maxTokens: 16384
        },
        {
            id: "gpt-4-turbo",
            name: "GPT-4 Turbo",
            description: "Latest GPT-4 Turbo with vision",
            contextWindow: 128000,
            maxTokens: 4096
        }
    ], null, 2);

    const handleImport = async () => {
        setResult(null);

        try {
            // Parse JSON
            const models = JSON.parse(jsonInput);

            if (!Array.isArray(models)) {
                setResult({
                    type: 'error',
                    message: 'JSON must be an array of models'
                });
                return;
            }

            // Validate each model
            for (const model of models) {
                if (!model.id || !model.name) {
                    setResult({
                        type: 'error',
                        message: 'Each model must have "id" and "name" fields'
                    });
                    return;
                }
            }

            setImporting(true);

            // Import each model
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const model of models) {
                try {
                    const response = await api.post(`/admin/ai/models/${provider}`, {
                        id: model.id,
                        name: model.name,
                        description: model.description || '',
                        contextWindow: model.contextWindow,
                        maxTokens: model.maxTokens,
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                        errors.push(`${model.id}: ${response.data?.message || 'Failed'}`);
                    }
                } catch (err) {
                    errorCount++;
                    errors.push(`${model.id}: ${err.message}`);
                }
            }

            setResult({
                type: errorCount === 0 ? 'success' : 'warning',
                message: `Imported ${successCount} models successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
                errors: errors.length > 0 ? errors : undefined
            });

            if (successCount > 0) {
                onSuccess?.();
                if (errorCount === 0) {
                    setTimeout(() => {
                        setIsOpen(false);
                        setJsonInput('');
                        setResult(null);
                    }, 2000);
                }
            }

        } catch (err) {
            setResult({
                type: 'error',
                message: `Invalid JSON: ${err.message}`
            });
        } finally {
            setImporting(false);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size={iconOnly ? "sm" : "sm"}
                onClick={() => setIsOpen(true)}
                className={iconOnly ? "h-7 w-7 p-0 rounded-full" : "flex items-center gap-1.5 px-2 text-xs"}
                title="Bulk Import"
            >
                <Upload className={iconOnly ? "h-3 w-3" : "h-3.5 w-3.5"} />
                {!iconOnly && "Bulk Import"}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Bulk Import Models</DialogTitle>
                        <DialogDescription>
                            Import multiple models for {provider} using JSON format
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="json-input" className="text-xs">JSON Array of Models</Label>
                            <Textarea
                                id="json-input"
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder={exampleJson}
                                className="font-mono text-xs h-48"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Required fields: <code>id</code>, <code>name</code>
                                <br />
                                Optional: <code>description</code>, <code>contextWindow</code>, <code>maxTokens</code>
                            </p>
                        </div>

                        <details className="text-sm">
                            <summary className="cursor-pointer font-medium mb-2">Show example JSON</summary>
                            <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                                <code>{exampleJson}</code>
                            </pre>
                        </details>

                        {result && (
                            <Alert variant={result.type === 'error' ? 'destructive' : 'default'}>
                                {result.type === 'success' && <CheckCircle className="h-4 w-4" />}
                                {result.type === 'error' && <AlertCircle className="h-4 w-4" />}
                                <AlertDescription>
                                    {result.message}
                                    {result.errors && (
                                        <ul className="mt-2 list-disc list-inside text-xs">
                                            {result.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)} disabled={importing}>
                            Cancel
                        </Button>
                        <Button onClick={handleImport} disabled={importing || !jsonInput.trim()} size="sm" className="h-8">
                            {importing ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <FileJson className="h-3.5 w-3.5 mr-1.5" />
                                    Import Models
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
