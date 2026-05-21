/**
 * AI Settings Component for Editor Sidebar
 * =========================================
 * Allows users to generate content using AI directly from the editor.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Wand2, Check, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/button';
import { Textarea } from '@/ui/textarea';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Alert, AlertDescription } from '@/ui/alert';
import { Badge } from '@/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';
import { cn } from '@/lib/utils';
import { aiAPI } from '@/services/api';

/**
 * AI Settings Panel for Block Editor Sidebar
 */
export default function AISettings({
    contentType = 'recipe',
    onContentGenerated,
    disabled = false,
}) {
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // Provider/Model configuration
    const [providers, setProviders] = useState([]);
    const [availableModels, setAvailableModels] = useState({});
    const [providerInfo, setProviderInfo] = useState({});
    const [defaults, setDefaults] = useState({});

    // User selections
    const [selectedProvider, setSelectedProvider] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [prompt, setPrompt] = useState('');

    // Generated content preview
    const [generatedContent, setGeneratedContent] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Load available providers
    const loadProviders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await aiAPI.getProviders();
            if (response.data.success) {
                const { configuredProviders, availableModels: models, providerInfo: info, defaults: defs } = response.data.data;
                setProviders(configuredProviders || []);
                setAvailableModels(models || {});
                setProviderInfo(info || {});
                setDefaults(defs || {});

                // Set defaults
                if (defs?.provider && configuredProviders?.includes(defs.provider)) {
                    setSelectedProvider(defs.provider);
                    setSelectedModel(defs.model || '');
                } else if (configuredProviders?.length > 0) {
                    setSelectedProvider(configuredProviders[0]);
                }
            }
        } catch (err) {
            console.error('Failed to load AI providers:', err);
            setError('Failed to load AI configuration. Check Settings > AI.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProviders();
    }, [loadProviders]);

    // Update model when provider changes
    useEffect(() => {
        if (selectedProvider && availableModels[selectedProvider]?.length > 0) {
            // Try to keep the same model if it exists in new provider
            const modelsForProvider = availableModels[selectedProvider];
            const currentModelExists = modelsForProvider.some(m => m.id === selectedModel);
            if (!currentModelExists) {
                setSelectedModel(modelsForProvider[0].id);
            }
        }
    }, [selectedProvider, availableModels, selectedModel]);

    // Generate content
    const handleGenerate = async () => {
        if (!prompt.trim() || !selectedProvider || !selectedModel) return;

        try {
            setGenerating(true);
            setError(null);
            setSuccess(false);
            setGeneratedContent(null);

            const response = await aiAPI.generate({
                prompt: prompt.trim(),
                contentType,
                provider: selectedProvider,
                model: selectedModel,
            });

            if (response.data.success) {
                setGeneratedContent(response.data.data.content);
                setSuccess(true);
            } else {
                throw new Error(response.data.error || 'Generation failed');
            }
        } catch (err) {
            console.error('AI generation failed:', err);
            setError(err.response?.data?.error || err.message || 'Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    // Apply generated content to editor
    const handleApply = () => {
        if (generatedContent && onContentGenerated) {
            onContentGenerated(generatedContent);
            setSuccess(false);
            setGeneratedContent(null);
            setPrompt('');
        }
    };

    // Reset state
    const handleReset = () => {
        setGeneratedContent(null);
        setSuccess(false);
        setError(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (providers.length === 0) {
        return (
            <div className="p-4 space-y-3">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        No AI providers configured. Go to <strong>Settings → AI</strong> to add your API keys.
                    </AlertDescription>
                </Alert>
                <Button variant="outline" size="sm" onClick={loadProviders} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>
        );
    }

    const currentProviderInfo = providerInfo[selectedProvider] || {};
    const currentModels = availableModels[selectedProvider] || [];
    const currentModel = currentModels.find((m) => m.id === selectedModel);

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>AI Content Generator</span>
                <Badge variant="outline" className="text-[10px] ml-auto">
                    {contentType}
                </Badge>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}

            {/* Success with Preview */}
            {success && generatedContent && (
                <div className="space-y-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Content generated!</span>
                    </div>

                    <div className="text-xs space-y-1">
                        {generatedContent.label && (
                            <div><strong>Title:</strong> {generatedContent.label}</div>
                        )}
                        {generatedContent.shortDescription && (
                            <div className="text-muted-foreground line-clamp-2">
                                {generatedContent.shortDescription}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleApply} className="flex-1">
                            <Wand2 className="w-3 h-3 mr-1" />
                            Apply to Editor
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleReset}>
                            Discard
                        </Button>
                    </div>
                </div>
            )}

            {/* Prompt Input */}
            {!success && (
                <>
                    <div className="space-y-2">
                        <Label className="text-xs">Describe your content</Label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                contentType === 'recipe'
                                    ? "e.g., Classic French onion soup with crispy cheese croutons"
                                    : "e.g., 10 tips for meal prepping on a budget"
                            }
                            rows={3}
                            disabled={generating || disabled}
                            className="text-sm resize-none"
                        />
                    </div>

                    {/* Advanced Options */}
                    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                            <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvanced && 'rotate-180')} />
                            Advanced options
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 space-y-3">
                            {/* Provider Selection */}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Provider</Label>
                                <Select value={selectedProvider} onValueChange={setSelectedProvider} disabled={generating}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map((p) => (
                                            <SelectItem key={p} value={p} className="text-xs">
                                                <span className="flex items-center gap-2">
                                                    <span>{providerInfo[p]?.icon}</span>
                                                    <span>{providerInfo[p]?.name || p}</span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Model Selection */}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Model</Label>
                                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={generating}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currentModels.map((m) => (
                                            <SelectItem key={m.id} value={m.id} className="text-xs">
                                                <span className="flex items-center gap-2">
                                                    <span>{m.name}</span>
                                                    {m.description && (
                                                        <span className="text-muted-foreground">({m.description})</span>
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentModel && (
                                <div className="text-xs text-muted-foreground space-y-1">
                                    {currentModel.description && (
                                        <p>{currentModel.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider">
                                        {currentModel.maxTokens && (
                                            <span>Max tokens: {currentModel.maxTokens.toLocaleString()}</span>
                                        )}
                                        {currentModel.contextWindow && (
                                            <span>Context: {currentModel.contextWindow.toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || generating || disabled}
                        className="w-full"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Content
                            </>
                        )}
                    </Button>

                    {/* Current provider indicator */}
                    <div className="text-center text-[10px] text-muted-foreground">
                        Using {currentProviderInfo.icon} {currentProviderInfo.name || selectedProvider}
                    </div>
                </>
            )}
        </div>
    );
}
