/**
 * AI Settings Tab
 * ================
 * Configuration page for AI providers (Gemini, OpenAI, Anthropic).
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Sparkles, Key, Check, X, Loader2, AlertCircle, Eye, EyeOff, Thermometer, FileText, Plus } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Label } from '@/ui/label.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Slider } from '@/ui/slider.jsx';
import { Badge } from '@/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Alert, AlertDescription } from '@/ui/alert.jsx';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { ProviderIcon } from '@/components/icons/ProviderIcons.jsx';
import { ModelManager } from '@/components/ModelManager.jsx';
import { MigrateModelsButton } from '@/components/MigrateModelsButton.jsx';
import { BulkImportModels } from '@/components/BulkImportModels.jsx';

// Tabs configuration for this settings page
export const aiSettingsTabs = [
    { value: 'providers', label: 'Providers', icon: Key },
    { value: 'defaults', label: 'Default Settings', icon: Sparkles },
];

const PROVIDER_ORDER = [
    'gemini',
    'openai',
    'anthropic',
    'deepseek',
    'openrouter',
    'qwen',
    'zhipu',
    'moonshot',
    'mistral',
    'xai',
];

// Provider display info - January 2026
const PROVIDER_CONFIG = {
    gemini: {
        name: 'Google Gemini',
        icon: '✨',
        description: 'Gemini 3 Flash/Pro, 2.5 - Latest Google AI',
        docsUrl: 'https://aistudio.google.com/apikey',
    },
    openai: {
        name: 'OpenAI',
        icon: '🤖',
        description: 'GPT-5, o3 reasoning - Flagship models',
        docsUrl: 'https://platform.openai.com/api-keys',
    },
    anthropic: {
        name: 'Anthropic Claude',
        icon: '🧠',
        description: 'Claude Sonnet/Opus 4.5 - Best for writing',
        docsUrl: 'https://console.anthropic.com/settings/keys',
    },
    deepseek: {
        name: 'DeepSeek',
        icon: '🔭',
        description: 'DeepSeek V3.2, R1 - Affordable & powerful',
        docsUrl: 'https://platform.deepseek.com/api_keys',
    },
    openrouter: {
        name: 'OpenRouter',
        icon: '🌐',
        description: '300+ models via unified API',
        docsUrl: 'https://openrouter.ai/keys',
    },
    qwen: {
        name: 'Alibaba Qwen',
        icon: '☁️',
        description: 'Qwen3 Max, Plus - 1T+ params',
        docsUrl: 'https://dashscope.console.aliyun.com/apiKey',
    },
    zhipu: {
        name: 'Zhipu GLM',
        icon: '🧊',
        description: 'GLM-4.7, 4.6, 4.5 - Tsinghua AI',
        docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    },
    moonshot: {
        name: 'Moonshot Kimi',
        icon: '🌙',
        description: 'Kimi K2 Thinking - 1T params, 256K context',
        docsUrl: 'https://platform.moonshot.cn/console/api-keys',
    },
    mistral: {
        name: 'Mistral AI',
        icon: '🌀',
        description: 'Mistral Large 3, Ministral - Open source',
        docsUrl: 'https://console.mistral.ai/api-keys',
    },
    xai: {
        name: 'xAI Grok',
        icon: '⚡',
        description: 'Grok 4.1, 4, 3 - Advanced reasoning',
        docsUrl: 'https://console.x.ai',
    },
};

const AISettings = ({ activeSection = 'providers', onRegisterActions }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState(null);
    const [error, setError] = useState(null);
    const [showKeys, setShowKeys] = useState({});
    const [addModelDialogProvider, setAddModelDialogProvider] = useState(null);
    const mergeSettingsData = useCallback((prev, incoming = {}) => {
        const providers = { ...(prev.providers || {}) };
        if (incoming.providers) {
            Object.entries(incoming.providers).forEach(([key, value]) => {
                providers[key] = {
                    ...providers[key],
                    ...value,
                };
            });
        }
        return {
            ...prev,
            ...incoming,
            providers,
        };
    }, []);

    // Settings state
    const [settings, setSettings] = useState({
        defaultProvider: 'gemini',
        defaultModel: 'gemini-3-flash-preview',
        temperature: 0.7,
        systemPrompt: '',
        providers: {
            gemini: { apiKey: '', enabled: false },
            openai: { apiKey: '', enabled: false },
            anthropic: { apiKey: '', enabled: false },
            deepseek: { apiKey: '', enabled: false },
            openrouter: { apiKey: '', enabled: false },
            qwen: { apiKey: '', enabled: false },
            zhipu: { apiKey: '', enabled: false },
            moonshot: { apiKey: '', enabled: false },
            mistral: { apiKey: '', enabled: false },
            xai: { apiKey: '', enabled: false },
        },
    });

    const [availableModels, setAvailableModels] = useState({});
    const [configuredProviders, setConfiguredProviders] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Load settings
    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/admin/ai/settings');
            if (response.data.success) {
                const { settings: loadedSettings, configuredProviders: configured, availableModels: models } = response.data.data;
                const payload = loadedSettings || {};
                setSettings(prev => mergeSettingsData(prev, payload));
                setConfiguredProviders(configured || []);
                setAvailableModels(models || {});
                setHasChanges(false);
            }
        } catch (err) {
            console.error('Failed to load AI settings:', err);
            setError('Failed to load AI settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Save settings
    const handleSave = useCallback(async () => {
        try {
            setSaving(true);
            setError(null);
            const response = await api.put('/admin/ai/settings', settings);
            if (response.data.success) {
                const { settings: updatedSettings, configuredProviders: configured } = response.data.data;
                const payload = updatedSettings || {};
                setSettings(prev => mergeSettingsData(prev, payload));
                setConfiguredProviders(configured || []);
                setHasChanges(false);
            }
        } catch (err) {
            console.error('Failed to save AI settings:', err);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    }, [settings, mergeSettingsData]);

    // Validate API key
    const handleValidateKey = async (provider) => {
        const apiKey = settings.providers[provider]?.apiKey;
        if (!apiKey || apiKey.startsWith('****')) {
            return;
        }

        try {
            setValidating(provider);
            const response = await api.post('/admin/ai/settings', { provider, apiKey });
            if (response.data.success && response.data.data.valid) {
                setSettings(prev => ({
                    ...prev,
                    providers: {
                        ...prev.providers,
                        [provider]: {
                            ...prev.providers[provider],
                            enabled: true,
                        },
                    },
                }));
            }
        } catch (err) {
            console.error('Failed to validate API key:', err);
        } finally {
            setValidating(null);
        }
    };

    // Handle provider changes
    const handleProviderChange = (provider, field, value) => {
        setSettings(prev => ({
            ...prev,
            providers: {
                ...prev.providers,
                [provider]: {
                    ...prev.providers[provider],
                    [field]: value,
                },
            },
        }));
        setHasChanges(true);
    };

    // Handle general settings changes
    const handleSettingChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    // Handle model migration
    const handleMigrateModels = async () => {
        toast.info('Starting model migration...');

        try {
            setMigrating(true);
            const response = await api.post('/admin/ai/migrate-models');
            if (response.data.success) {
                toast.success(`Successfully migrated ${response.data.data.totalModels} models!`);
                await loadSettings(); // Reload to show new models
            }
        } catch (err) {
            console.error('Failed to migrate models:', err);
            toast.error('Failed to migrate models. Check console for details.');
        } finally {
            setMigrating(false);
        }
    };

    useEffect(() => {
        if (!onRegisterActions) return;
        onRegisterActions({
            onSave: handleSave,
            isSaving: saving,
            hasChanges,
        });
    }, [handleSave, hasChanges, onRegisterActions, saving]);

    useEffect(() => {
        return () => {
            if (onRegisterActions) {
                onRegisterActions(null);
            }
        };
    }, [onRegisterActions]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {activeSection === 'providers' && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-base font-medium">AI Providers</h3>
                        <p className="text-xs text-muted-foreground">
                            Configure API keys for AI content generation
                        </p>
                    </div>

                    {/* Migration Button - Only shows if models not yet migrated */}
                    <MigrateModelsButton onSuccess={loadSettings} settings={settings} />

                    <div className="grid gap-4">
                        {Object.entries(PROVIDER_CONFIG).map(([key, config]) => {
                            const providerKey = key;
                            const providerSettings = settings.providers[providerKey] || {};
                            const isConfigured = configuredProviders.includes(providerKey);
                            const isValidating = validating === providerKey;
                            const showKey = showKeys[providerKey];

                            return (
                                <Card key={providerKey} className={cn(
                                    'transition-all',
                                    isConfigured && 'border-green-500/50'
                                )}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ProviderIcon provider={providerKey} className="w-6 h-6" />
                                                <div className="space-y-0.5">
                                                    <CardTitle className="text-sm flex items-center gap-1.5">
                                                        {config.name}
                                                        {isConfigured && (
                                                            <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-500/50">
                                                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                                                Configured
                                                            </Badge>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">{config.description}</CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Header Actions: Bulk Import & Add Model */}
                                                <div className="flex items-center gap-1 mr-2">
                                                    <BulkImportModels
                                                        provider={providerKey}
                                                        onSuccess={loadSettings}
                                                        iconOnly={true}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className="h-9 w-9 p-0 rounded-full"
                                                        onClick={() => setAddModelDialogProvider(providerKey)}
                                                        title="Add Model"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Switch
                                                    checked={providerSettings.enabled || false}
                                                    onCheckedChange={(checked) => handleProviderChange(providerKey, 'enabled', checked)}
                                                    disabled={!providerSettings.apiKey}
                                                />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex gap-1.5 items-center">
                                            <div className="flex-1 relative">
                                                <Input
                                                    type={showKey ? 'text' : 'password'}
                                                    placeholder="Enter API key..."
                                                    value={providerSettings.apiKey || ''}
                                                    onChange={(e) => handleProviderChange(providerKey, 'apiKey', e.target.value)}
                                                    className="pr-9 h-8 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKeys(prev => ({ ...prev, [providerKey]: !prev[providerKey] }))}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => handleValidateKey(providerKey)}
                                                disabled={isValidating || !providerSettings.apiKey || providerSettings.apiKey.startsWith('****')}
                                            >
                                                {isValidating ? (
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    'Test'
                                                )}
                                            </Button>

                                            {/* Get API Key Link */}
                                            <a
                                                href={config.docsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-muted-foreground hover:text-primary whitespace-nowrap px-1"
                                            >
                                                Get API key →
                                            </a>
                                        </div>

                                        {/* Model Manager */}
                                        <ModelManager
                                            provider={providerKey}
                                            models={providerSettings.availableModels || []}
                                            onUpdate={loadSettings}
                                            hideHeaderActions={true}
                                            isAddDialogOpen={addModelDialogProvider === providerKey}
                                            onAddDialogChange={(open) => {
                                                if (!open) setAddModelDialogProvider(null);
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeSection === 'defaults' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium">Default Settings</h3>
                        <p className="text-sm text-muted-foreground">
                            Configure default AI behavior for content generation
                        </p>
                    </div>

                    <div className="grid gap-6 max-w-xl">
                        {/* Default Provider */}
                        <div className="space-y-2">
                            <Label>Default Provider</Label>
                            <Select
                                value={settings.defaultProvider}
                                onValueChange={(value) => handleSettingChange('defaultProvider', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(PROVIDER_CONFIG).map(([key, config]) => (
                                        <SelectItem key={key} value={key} disabled={!configuredProviders.includes(key)}>
                                            <span className="flex items-center gap-2">
                                                <span>{config.icon}</span>
                                                <span>{config.name}</span>
                                                {!configuredProviders.includes(key) && (
                                                    <span className="text-muted-foreground">(not configured)</span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Default Model */}
                        <div className="space-y-2">
                            <Label>Default Model</Label>
                            <Select
                                value={settings.defaultModel}
                                onValueChange={(value) => handleSettingChange('defaultModel', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(availableModels[settings.defaultProvider] || []).map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            <span className="flex items-center gap-2">
                                                <span>{model.name}</span>
                                                {model.description && (
                                                    <span className="text-muted-foreground text-xs">({model.description})</span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Temperature */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <Thermometer className="w-4 h-4" />
                                    Temperature
                                </Label>
                                <span className="text-sm font-mono text-muted-foreground">
                                    {settings.temperature.toFixed(1)}
                                </span>
                            </div>
                            <Slider
                                value={[settings.temperature]}
                                onValueChange={([value]) => handleSettingChange('temperature', value)}
                                min={0}
                                max={1}
                                step={0.1}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Lower = more focused, Higher = more creative
                            </p>
                        </div>

                        {/* System Prompt */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Custom System Prompt (Optional)
                            </Label>
                            <Textarea
                                value={settings.systemPrompt}
                                onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
                                placeholder="Add custom instructions for the AI (e.g., 'Write in a friendly, casual tone...')"
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                Added to the default prompts for recipe/article generation
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AISettings;
