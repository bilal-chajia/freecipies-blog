import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Check, FileText, Key, Loader2, Plus, Sparkles, Thermometer } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/alert';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Slider } from '@/ui/slider';
import { Switch } from '@/ui/switch';
import { Textarea } from '@/ui/textarea';
import { ProviderIcon } from '@/components/icons/ProviderIcons';
import { ModelManager, type ManagedModel } from '@/components/ModelManager';
import { aiAPI } from '@/services/api';
import { cn } from '@/lib/utils';

export const aiSettingsTabs = [
    { value: 'providers', label: 'Providers', icon: Key },
    { value: 'defaults', label: 'Default Settings', icon: Sparkles },
];

const BUILT_IN_PROVIDERS = [
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

const PROVIDER_CONFIG: Record<string, { name: string; description: string; docsUrl: string }> = {
    gemini: { name: 'Google Gemini', description: 'Google text generation models', docsUrl: 'https://aistudio.google.com/apikey' },
    openai: { name: 'OpenAI', description: 'GPT and reasoning models', docsUrl: 'https://platform.openai.com/api-keys' },
    anthropic: { name: 'Anthropic Claude', description: 'Claude writing and reasoning models', docsUrl: 'https://console.anthropic.com/settings/keys' },
    deepseek: { name: 'DeepSeek', description: 'Chat and reasoner models', docsUrl: 'https://platform.deepseek.com/api_keys' },
    openrouter: { name: 'OpenRouter', description: 'Unified API for many model providers', docsUrl: 'https://openrouter.ai/keys' },
    qwen: { name: 'Alibaba Qwen', description: 'DashScope compatible-mode models', docsUrl: 'https://dashscope.console.aliyun.com/apiKey' },
    zhipu: { name: 'Zhipu GLM', description: 'GLM models via BigModel', docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys' },
    moonshot: { name: 'Moonshot Kimi', description: 'Kimi OpenAI-compatible models', docsUrl: 'https://platform.moonshot.cn/console/api-keys' },
    mistral: { name: 'Mistral AI', description: 'Mistral hosted models', docsUrl: 'https://console.mistral.ai/api-keys' },
    xai: { name: 'xAI Grok', description: 'Grok hosted models', docsUrl: 'https://console.x.ai' },
};

interface ProviderSettings {
    enabled: boolean;
    api_key?: string;
    has_api_key?: boolean;
    api_key_masked?: string;
    models: ManagedModel[];
}

interface CustomProviderSettings extends ProviderSettings {
    label: string;
    base_url: string;
}

interface AISettingsState {
    default_provider: string;
    default_model: string;
    temperature: number;
    system_prompt: string;
    providers: Record<string, ProviderSettings>;
    custom_providers: Record<string, CustomProviderSettings>;
}

interface RegisteredActions {
    onSave: () => Promise<void>;
    isSaving: boolean;
    hasChanges: boolean;
}

interface AISettingsProps {
    activeSection?: string;
    onRegisterActions?: (actions: RegisteredActions | null) => void;
}

const emptySettings: AISettingsState = {
    default_provider: 'gemini',
    default_model: 'gemini-3-flash-preview',
    temperature: 0.7,
    system_prompt: '',
    providers: Object.fromEntries(BUILT_IN_PROVIDERS.map((provider) => [provider, { enabled: false, models: [] }])),
    custom_providers: {},
};

function configuredProviderIds(settings: AISettingsState): string[] {
    const builtIn = Object.entries(settings.providers)
        .filter(([, config]) => config.enabled && (config.has_api_key || config.api_key))
        .map(([provider]) => provider);
    const custom = Object.entries(settings.custom_providers)
        .filter(([, config]) => config.enabled && (config.has_api_key || config.api_key))
        .map(([provider]) => provider);
    return [...builtIn, ...custom];
}

const AISettings = ({ activeSection = 'providers', onRegisterActions }: AISettingsProps) => {
    const [settings, setSettings] = useState<AISettingsState>(emptySettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [customForm, setCustomForm] = useState({ id: '', label: '', base_url: '', api_key: '' });

    const configuredProviders = useMemo(() => configuredProviderIds(settings), [settings]);
    const allProviderIds = useMemo(
        () => [...BUILT_IN_PROVIDERS, ...Object.keys(settings.custom_providers)],
        [settings.custom_providers],
    );

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await aiAPI.getSettings();
            if (response.data.success) {
                const data = response.data.data as AISettingsState;
                setSettings({
                    ...emptySettings,
                    ...data,
                    providers: { ...emptySettings.providers, ...(data.providers || {}) },
                    custom_providers: data.custom_providers || {},
                });
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

    const handleSave = useCallback(async () => {
        try {
            setSaving(true);
            setError(null);
            const response = await aiAPI.updateSettings(settings);
            if (response.data.success) {
                const data = response.data.data as AISettingsState;
                setSettings({
                    ...emptySettings,
                    ...data,
                    providers: { ...emptySettings.providers, ...(data.providers || {}) },
                    custom_providers: data.custom_providers || {},
                });
                setHasChanges(false);
            }
        } catch (err) {
            console.error('Failed to save AI settings:', err);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    }, [settings]);

    useEffect(() => {
        if (!onRegisterActions) return;
        onRegisterActions({ onSave: handleSave, isSaving: saving, hasChanges });
        return () => onRegisterActions(null);
    }, [handleSave, hasChanges, onRegisterActions, saving]);

    const setProvider = (provider: string, patch: Partial<ProviderSettings>) => {
        setSettings((prev) => ({
            ...prev,
            providers: {
                ...prev.providers,
                [provider]: { ...(prev.providers[provider] || { enabled: false, models: [] }), ...patch },
            },
        }));
        setHasChanges(true);
    };

    const setCustomProvider = (provider: string, patch: Partial<CustomProviderSettings>) => {
        setSettings((prev) => ({
            ...prev,
            custom_providers: {
                ...prev.custom_providers,
                [provider]: { ...prev.custom_providers[provider], ...patch },
            },
        }));
        setHasChanges(true);
    };

    const providerConfig = (provider: string): ProviderSettings | CustomProviderSettings =>
        settings.custom_providers[provider] || settings.providers[provider] || { enabled: false, models: [] };

    const providerName = (provider: string): string =>
        settings.custom_providers[provider]?.label || PROVIDER_CONFIG[provider]?.name || provider;

    const providerDescription = (provider: string): string =>
        settings.custom_providers[provider]?.base_url || PROVIDER_CONFIG[provider]?.description || 'OpenAI-compatible provider';

    const handleValidateKey = async (provider: string) => {
        const config = providerConfig(provider);
        if (!config.api_key) return;
        try {
            setValidating(provider);
            const response = await aiAPI.validateApiKey(provider, config.api_key, 'base_url' in config ? config.base_url : undefined);
            if (response.data.data?.valid) {
                if (settings.custom_providers[provider]) setCustomProvider(provider, { enabled: true });
                else setProvider(provider, { enabled: true });
                toast.success('API key valid');
            } else {
                toast.error('API key rejected');
            }
        } catch {
            toast.error('Failed to validate API key');
        } finally {
            setValidating(null);
        }
    };

    const handleCreateCustomProvider = async () => {
        try {
            const response = await aiAPI.customProviders.create({ ...customForm, enabled: true });
            if (response.data.success) {
                toast.success('Custom provider added');
                setCustomForm({ id: '', label: '', base_url: '', api_key: '' });
                await loadSettings();
            }
        } catch {
            toast.error('Failed to add custom provider');
        }
    };

    const handleRemoveCustomProvider = async (provider: string) => {
        try {
            await aiAPI.customProviders.remove(provider);
            toast.success('Custom provider removed');
            await loadSettings();
        } catch {
            toast.error('Failed to remove custom provider');
        }
    };

    const updateSetting = <K extends keyof AISettingsState>(key: K, value: AISettingsState[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

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
                        <p className="text-xs text-muted-foreground">Configure write-only API keys and curated models.</p>
                    </div>

                    <div className="grid gap-4">
                        {allProviderIds.map((provider) => {
                            const config = providerConfig(provider);
                            const isConfigured = configuredProviders.includes(provider);
                            const isCustom = Boolean(settings.custom_providers[provider]);
                            const canEnable = Boolean(config.has_api_key || config.api_key);

                            return (
                                <Card key={provider} className={cn('transition-all', isConfigured && 'border-green-500/50')}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ProviderIcon provider={provider} className="w-6 h-6" />
                                                <div className="space-y-0.5">
                                                    <CardTitle className="text-sm flex items-center gap-1.5">
                                                        {providerName(provider)}
                                                        {isConfigured && (
                                                            <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-500/50">
                                                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                                                Configured
                                                            </Badge>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">{providerDescription(provider)}</CardDescription>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={config.enabled || false}
                                                onCheckedChange={(enabled) => (
                                                    isCustom ? setCustomProvider(provider, { enabled }) : setProvider(provider, { enabled })
                                                )}
                                                disabled={!canEnable}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex gap-1.5 items-center">
                                            <Input
                                                type="password"
                                                placeholder={config.api_key_masked || 'Enter API key...'}
                                                value={config.api_key || ''}
                                                onChange={(e) => (
                                                    isCustom
                                                        ? setCustomProvider(provider, { api_key: e.target.value })
                                                        : setProvider(provider, { api_key: e.target.value })
                                                )}
                                                className="h-8 text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => handleValidateKey(provider)}
                                                disabled={validating === provider || !config.api_key}
                                            >
                                                {validating === provider ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : 'Test'}
                                            </Button>
                                            {!isCustom && (
                                                <a
                                                    href={PROVIDER_CONFIG[provider]?.docsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-muted-foreground hover:text-primary whitespace-nowrap px-1"
                                                >
                                                    Get API key
                                                </a>
                                            )}
                                            {isCustom && (
                                                <Button variant="outline" size="sm" onClick={() => handleRemoveCustomProvider(provider)}>
                                                    Remove
                                                </Button>
                                            )}
                                        </div>

                                        <ModelManager
                                            provider={provider}
                                            models={config.models || []}
                                            onUpdate={loadSettings}
                                            hideHeaderActions={false}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Custom OpenAI-Compatible Provider
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-4">
                            <Input placeholder="id" value={customForm.id} onChange={(e) => setCustomForm((p) => ({ ...p, id: e.target.value }))} />
                            <Input placeholder="label" value={customForm.label} onChange={(e) => setCustomForm((p) => ({ ...p, label: e.target.value }))} />
                            <Input placeholder="https://host/v1" value={customForm.base_url} onChange={(e) => setCustomForm((p) => ({ ...p, base_url: e.target.value }))} />
                            <div className="flex gap-2">
                                <Input type="password" placeholder="api_key" value={customForm.api_key} onChange={(e) => setCustomForm((p) => ({ ...p, api_key: e.target.value }))} />
                                <Button onClick={handleCreateCustomProvider} disabled={!customForm.id || !customForm.label || !customForm.base_url || !customForm.api_key}>
                                    Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeSection === 'defaults' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium">Default Settings</h3>
                        <p className="text-sm text-muted-foreground">Configure default AI behavior for content generation.</p>
                    </div>

                    <div className="grid gap-6 max-w-xl">
                        <div className="space-y-2">
                            <Label>Default Provider</Label>
                            <Select
                                value={settings.default_provider}
                                onValueChange={(value) => updateSetting('default_provider', value)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {configuredProviders.map((provider) => (
                                        <SelectItem key={provider} value={provider}>{providerName(provider)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Default Model</Label>
                            <Select
                                value={settings.default_model}
                                onValueChange={(value) => updateSetting('default_model', value)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(providerConfig(settings.default_provider).models || []).map((model) => (
                                        <SelectItem key={model.id} value={model.id}>{model.name || model.id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Thermometer className="w-4 h-4 text-muted-foreground" />
                                    <Label>Temperature</Label>
                                </div>
                                <Badge variant="secondary">{settings.temperature}</Badge>
                            </div>
                            <Slider
                                value={[settings.temperature]}
                                onValueChange={([value]) => updateSetting('temperature', value)}
                                min={0}
                                max={2}
                                step={0.1}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <Label>System Prompt</Label>
                            </div>
                            <Textarea
                                value={settings.system_prompt}
                                onChange={(e) => updateSetting('system_prompt', e.target.value)}
                                placeholder="Enter a system prompt that defines the AI behavior..."
                                rows={4}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AISettings;
