import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Monitor, DollarSign, Cpu, Layout, Code2, ShieldCheck, Zap, Info, Settings2, BarChart3 } from 'lucide-react';

const AdsSettings = ({ formData, handleInputChange }) => {
    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20 pb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Monitor className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Monetization Engine</CardTitle>
                                <CardDescription>Master control for advertising delivery and network management.</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-xl border border-border/50">
                            <Label htmlFor="adsEnabled" className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">Network Status</Label>
                            <Switch
                                id="adsEnabled"
                                checked={formData.adsEnabled}
                                onCheckedChange={(checked) => handleInputChange('adsEnabled', checked)}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                        <Label htmlFor="adNetwork" className="text-sm font-bold flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 opacity-60" />
                            Primary Ad Provider
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { id: 'none', label: 'Disabled', icon: ShieldCheck, color: 'text-muted-foreground' },
                                { id: 'google-adsense', label: 'AdSense', icon: DollarSign, color: 'text-amber-500' },
                                { id: 'ezoic', label: 'Ezoic', icon: Zap, color: 'text-blue-500' },
                                { id: 'hb-agency', label: 'HB Agency', icon: BarChart3, color: 'text-indigo-500' },
                                { id: 'custom', label: 'Custom', icon: Code2, color: 'text-emerald-500' },
                            ].map((network) => (
                                <button
                                    key={network.id}
                                    disabled={!formData.adsEnabled && network.id !== 'none'}
                                    onClick={() => handleInputChange('adNetwork', network.id)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-3 ${formData.adNetwork === network.id
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-transparent bg-muted/20 hover:bg-muted/30'
                                        } ${(!formData.adsEnabled && network.id !== 'none') ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <network.icon className={`w-6 h-6 ${formData.adNetwork === network.id ? 'text-primary' : network.color}`} />
                                    <span className={`text-[11px] font-bold uppercase tracking-tighter ${formData.adNetwork === network.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {network.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ezoic Settings */}
            {formData.adNetwork === 'ezoic' && (
                <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/50 bg-muted/20 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <Zap className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Ezoic Integration</CardTitle>
                                <CardDescription>Advanced AI-driven ad placeholders and identity.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label htmlFor="ezoicPublisherId" className="text-sm font-bold">Publisher ID</Label>
                                <Input
                                    id="ezoicPublisherId"
                                    value={formData.ezoic.publisherId}
                                    onChange={(e) => handleInputChange('ezoic', {
                                        ...formData.ezoic,
                                        publisherId: e.target.value
                                    })}
                                    className="h-11 px-4 bg-muted/30 border-none ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all font-medium"
                                    placeholder="e.g. 12345"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="ezoicDomainId" className="text-sm font-bold">Domain ID</Label>
                                <Input
                                    id="ezoicDomainId"
                                    value={formData.ezoic.domainId}
                                    onChange={(e) => handleInputChange('ezoic', {
                                        ...formData.ezoic,
                                        domainId: e.target.value
                                    })}
                                    className="h-11 px-4 bg-muted/30 border-none ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all font-medium"
                                    placeholder="example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="ezoicApiKey" className="text-sm font-bold flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 opacity-60" />
                                API Key
                            </Label>
                            <Input
                                id="ezoicApiKey"
                                type="password"
                                value={formData.ezoic.apiKey}
                                onChange={(e) => handleInputChange('ezoic', {
                                    ...formData.ezoic,
                                    apiKey: e.target.value
                                })}
                                className="h-11 px-4 bg-muted/30 border-none ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all font-medium"
                                placeholder="Your Ezoic API key"
                            />
                        </div>

                        <div className="space-y-6 pt-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Placeholder Matrix</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(formData.ezoic.adPlacements).map(([position, config]) => (
                                    <div key={position} className="p-5 bg-muted/20 border border-border/40 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-sm font-bold capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                                            <Switch
                                                checked={config.enabled}
                                                onCheckedChange={(checked) => handleInputChange('ezoic', {
                                                    ...formData.ezoic,
                                                    adPlacements: {
                                                        ...formData.ezoic.adPlacements,
                                                        [position]: { ...config, enabled: checked }
                                                    }
                                                })}
                                                className="data-[state=checked]:bg-blue-500"
                                            />
                                        </div>

                                        {config.enabled && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`${position}PlacementId`} className="text-[11px] font-bold opacity-60">ID</Label>
                                                    <Input
                                                        id={`${position}PlacementId`}
                                                        value={config.placementId}
                                                        onChange={(e) => handleInputChange('ezoic', {
                                                            ...formData.ezoic,
                                                            adPlacements: {
                                                                ...formData.ezoic.adPlacements,
                                                                [position]: { ...config, placementId: e.target.value }
                                                            }
                                                        })}
                                                        className="h-8 px-3 bg-background border-none ring-1 ring-border/50 rounded-lg text-xs"
                                                        placeholder="123456"
                                                    />
                                                </div>
                                                {position === 'inline' && (
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`${position}Frequency`} className="text-[11px] font-bold opacity-60">Density (Paragraphs)</Label>
                                                        <Input
                                                            id={`${position}Frequency`}
                                                            type="number"
                                                            value={config.frequency}
                                                            onChange={(e) => handleInputChange('ezoic', {
                                                                ...formData.ezoic,
                                                                adPlacements: {
                                                                    ...formData.ezoic.adPlacements,
                                                                    [position]: { ...config, frequency: parseInt(e.target.value) }
                                                                }
                                                            })}
                                                            min="1"
                                                            max="10"
                                                            className="h-8 px-3 bg-background border-none ring-1 ring-border/50 rounded-lg text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* HB Agency Settings */}
            {formData.adNetwork === 'hb-agency' && (
                <Card>
                    <CardHeader>
                        <CardTitle>HB Agency Configuration</CardTitle>
                        <CardDescription>Configure your HB Agency account and ad units</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hbPublisherId">Publisher ID</Label>
                                <Input
                                    id="hbPublisherId"
                                    value={formData.hbAgency.publisherId}
                                    onChange={(e) => handleInputChange('hbAgency', {
                                        ...formData.hbAgency,
                                        publisherId: e.target.value
                                    })}
                                    placeholder="PUB12345"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hbAccountId">Account ID</Label>
                                <Input
                                    id="hbAccountId"
                                    value={formData.hbAgency.accountId}
                                    onChange={(e) => handleInputChange('hbAgency', {
                                        ...formData.hbAgency,
                                        accountId: e.target.value
                                    })}
                                    placeholder="ACC12345"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hbApiKey">API Key</Label>
                            <Input
                                id="hbApiKey"
                                type="password"
                                value={formData.hbAgency.apiKey}
                                onChange={(e) => handleInputChange('hbAgency', {
                                    ...formData.hbAgency,
                                    apiKey: e.target.value
                                })}
                                placeholder="Your HB Agency API key"
                            />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium">Ad Units</h4>

                            {Object.entries(formData.hbAgency.adUnits).map(([position, config]) => (
                                <div key={position} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-medium capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                                        <Switch
                                            checked={config.enabled}
                                            onCheckedChange={(checked) => handleInputChange('hbAgency', {
                                                ...formData.hbAgency,
                                                adUnits: {
                                                    ...formData.hbAgency.adUnits,
                                                    [position]: { ...config, enabled: checked }
                                                }
                                            })}
                                        />
                                    </div>

                                    {config.enabled && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`${position}UnitId`}>Unit ID</Label>
                                            <Input
                                                id={`${position}UnitId`}
                                                value={config.unitId}
                                                onChange={(e) => handleInputChange('hbAgency', {
                                                    ...formData.hbAgency,
                                                    adUnits: {
                                                        ...formData.hbAgency.adUnits,
                                                        [position]: { ...config, unitId: e.target.value }
                                                    }
                                                })}
                                                placeholder="UNIT12345"
                                            />
                                            {position === 'inline' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor={`${position}Frequency`}>Frequency (paragraphs)</Label>
                                                    <Input
                                                        id={`${position}Frequency`}
                                                        type="number"
                                                        value={config.frequency}
                                                        onChange={(e) => handleInputChange('hbAgency', {
                                                            ...formData.hbAgency,
                                                            adUnits: {
                                                                ...formData.hbAgency.adUnits,
                                                                [position]: { ...config, frequency: parseInt(e.target.value) }
                                                            }
                                                        })}
                                                        min="1"
                                                        max="10"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Google AdSense Settings */}
            {formData.adNetwork === 'google-adsense' && (
                <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/50 bg-muted/20 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <DollarSign className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Google AdSense</CardTitle>
                                <CardDescription>Connect the world's largest advertising ecosystem.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-3">
                            <Label htmlFor="publisherId" className="text-sm font-bold">Publisher ID</Label>
                            <Input
                                id="publisherId"
                                value={formData.googleAdSense.publisherId}
                                onChange={(e) => handleInputChange('googleAdSense', {
                                    ...formData.googleAdSense,
                                    publisherId: e.target.value
                                })}
                                className="h-11 px-4 bg-muted/30 border-none ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all font-medium"
                                placeholder="pub-XXXXXXXXXXXXXXXX"
                            />
                        </div>

                        <div className="flex items-start justify-between p-5 bg-muted/20 border border-border/40 rounded-2xl">
                            <div className="space-y-1.5 pr-4">
                                <Label htmlFor="autoAdsEnabled" className="text-sm font-bold cursor-pointer">Auto Ads Engine</Label>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">Let Google automatically place ads where they are likely to perform best.</p>
                            </div>
                            <Switch
                                id="autoAdsEnabled"
                                checked={formData.googleAdSense.autoAdsEnabled}
                                onCheckedChange={(checked) => handleInputChange('googleAdSense', {
                                    ...formData.googleAdSense,
                                    autoAdsEnabled: checked
                                })}
                                className="data-[state=checked]:bg-amber-500"
                            />
                        </div>

                        {!formData.googleAdSense.autoAdsEnabled && (
                            <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Manual Ad Slots</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {Object.entries(formData.googleAdSense.adSlots).map(([position, config]) => (
                                        <div key={position} className="p-5 bg-muted/20 border border-border/40 rounded-2xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-sm font-bold capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                                                <Switch
                                                    checked={config.enabled}
                                                    onCheckedChange={(checked) => handleInputChange('googleAdSense', {
                                                        ...formData.googleAdSense,
                                                        adSlots: {
                                                            ...formData.googleAdSense.adSlots,
                                                            [position]: { ...config, enabled: checked }
                                                        }
                                                    })}
                                                    className="data-[state=checked]:bg-amber-500"
                                                />
                                            </div>

                                            {config.enabled && (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`${position}AdSlotId`} className="text-[11px] font-bold opacity-60">Slot ID</Label>
                                                        <Input
                                                            id={`${position}AdSlotId`}
                                                            value={config.adSlotId}
                                                            onChange={(e) => handleInputChange('googleAdSense', {
                                                                ...formData.googleAdSense,
                                                                adSlots: {
                                                                    ...formData.googleAdSense.adSlots,
                                                                    [position]: { ...config, adSlotId: e.target.value }
                                                                }
                                                            })}
                                                            className="h-8 px-3 bg-background border-none ring-1 ring-border/50 rounded-lg text-xs"
                                                            placeholder="1234567890"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Custom Ads Settings */}
            {formData.adNetwork === 'custom' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Custom Ad Code</CardTitle>
                        <CardDescription>Add your own ad code for different placements</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(formData.customAds).map(([position, code]) => (
                            <div key={position} className="space-y-2">
                                <Label htmlFor={`${position}Code`} className="capitalize">
                                    {position.replace(/([A-Z])/g, ' $1')} Ad Code
                                </Label>
                                <Textarea
                                    id={`${position}Code`}
                                    value={code}
                                    onChange={(e) => handleInputChange('customAds', {
                                        ...formData.customAds,
                                        [position]: e.target.value
                                    })}
                                    placeholder={`<!-- ${position} ad code -->`}
                                    rows={4}
                                    className="font-mono text-sm"
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Ad Settings */}
            {/* Ad Display Settings */}
            {formData.adsEnabled && (
                <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/50 bg-muted/20 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Settings2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Network Compliance & Logic</CardTitle>
                                <CardDescription>Behavioral settings for ad rendering and data privacy.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <Label htmlFor="refreshInterval" className="text-sm font-bold flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 opacity-60" />
                                    Refresh Interval
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="refreshInterval"
                                        type="number"
                                        value={formData.adSettings.refreshInterval}
                                        onChange={(e) => handleInputChange('adSettings', {
                                            ...formData.adSettings,
                                            refreshInterval: parseInt(e.target.value)
                                        })}
                                        min="0"
                                        max="300"
                                        className="h-11 px-4 bg-muted/30 border-none ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all font-medium pr-10"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60">SEC</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="maxAdsPerPage" className="text-sm font-bold flex items-center gap-2">
                                    <Layout className="w-3.5 h-3.5 opacity-60" />
                                    Max Ads Per Page
                                </Label>
                                <Input
                                    id="maxAdsPerPage"
                                    type="number"
                                    value={formData.adSettings.maxAdsPerPage}
                                    onChange={(e) => handleInputChange('adSettings', {
                                        ...formData.adSettings,
                                        maxAdsPerPage: parseInt(e.target.value)
                                    })}
                                    min="1"
                                    max="10"
                                    className="h-11 px-4 bg-muted/30 border-none ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="adDensity" className="text-sm font-bold">Rendering Density</Label>
                                <Select
                                    value={formData.adSettings.adDensity}
                                    onValueChange={(value) => handleInputChange('adSettings', {
                                        ...formData.adSettings,
                                        adDensity: value
                                    })}
                                >
                                    <SelectTrigger className="h-11 px-4 bg-muted/30 border-none ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all font-medium">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                                        <SelectItem value="low">Conservative (Low)</SelectItem>
                                        <SelectItem value="balanced">Standard (Balanced)</SelectItem>
                                        <SelectItem value="high">Aggressive (High)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Compliance & Protection</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {[
                                    { id: 'gdprConsent', label: 'GDPR Consent Management', desc: 'Display a cookie/data consent banner for EU visitors.' },
                                    { id: 'adBlockerDetection', label: 'Ad-Blocker Identification', desc: 'Monitor and respond to users with active ad-blocking software.' },
                                    { id: 'targetByCategory', label: 'Semantic Categorization', desc: 'Inject network-specific category hints into the ad requests.' },
                                    { id: 'targetByTags', label: 'Keyword Targeting', desc: 'Pass article-level keywords to improve ad relevance.' },
                                ].map((option) => (
                                    <div key={option.id} className="flex items-start justify-between p-5 bg-muted/20 border border-border/40 rounded-2xl group transition-all hover:bg-muted/30">
                                        <div className="space-y-1.5 pr-4">
                                            <Label htmlFor={option.id} className="text-sm font-bold cursor-pointer">{option.label}</Label>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">{option.desc}</p>
                                        </div>
                                        <Switch
                                            id={option.id}
                                            checked={formData.adSettings[option.id]}
                                            onCheckedChange={(checked) => handleInputChange('adSettings', {
                                                ...formData.adSettings,
                                                [option.id]: checked
                                            })}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">High ad density may impact PageSpeed scores and user retention. Monitor core web vitals consistently.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AdsSettings;
