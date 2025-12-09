import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';

const AdsSettings = ({ formData, handleInputChange }) => {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ad Network Configuration</CardTitle>
                    <CardDescription>Configure advertising networks and ad placements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="adsEnabled"
                            checked={formData.adsEnabled}
                            onCheckedChange={(checked) => handleInputChange('adsEnabled', checked)}
                        />
                        <Label htmlFor="adsEnabled">Enable ads on the website</Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adNetwork">Ad Network</Label>
                        <Select
                            value={formData.adNetwork}
                            onValueChange={(value) => handleInputChange('adNetwork', value)}
                            disabled={!formData.adsEnabled}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Ads</SelectItem>
                                <SelectItem value="google-adsense">Google AdSense</SelectItem>
                                <SelectItem value="ezoic">Ezoic</SelectItem>
                                <SelectItem value="hb-agency">HB Agency</SelectItem>
                                <SelectItem value="custom">Custom Ad Code</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Ezoic Settings */}
            {formData.adNetwork === 'ezoic' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Ezoic Configuration</CardTitle>
                        <CardDescription>Configure your Ezoic account and ad placements</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ezoicPublisherId">Publisher ID</Label>
                                <Input
                                    id="ezoicPublisherId"
                                    value={formData.ezoic.publisherId}
                                    onChange={(e) => handleInputChange('ezoic', {
                                        ...formData.ezoic,
                                        publisherId: e.target.value
                                    })}
                                    placeholder="12345"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ezoicDomainId">Domain ID</Label>
                                <Input
                                    id="ezoicDomainId"
                                    value={formData.ezoic.domainId}
                                    onChange={(e) => handleInputChange('ezoic', {
                                        ...formData.ezoic,
                                        domainId: e.target.value
                                    })}
                                    placeholder="example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ezoicApiKey">API Key</Label>
                            <Input
                                id="ezoicApiKey"
                                type="password"
                                value={formData.ezoic.apiKey}
                                onChange={(e) => handleInputChange('ezoic', {
                                    ...formData.ezoic,
                                    apiKey: e.target.value
                                })}
                                placeholder="Your Ezoic API key"
                            />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium">Ad Placements</h4>

                            {Object.entries(formData.ezoic.adPlacements).map(([position, config]) => (
                                <div key={position} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-medium capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                                        <Switch
                                            checked={config.enabled}
                                            onCheckedChange={(checked) => handleInputChange('ezoic', {
                                                ...formData.ezoic,
                                                adPlacements: {
                                                    ...formData.ezoic.adPlacements,
                                                    [position]: { ...config, enabled: checked }
                                                }
                                            })}
                                        />
                                    </div>

                                    {config.enabled && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`${position}PlacementId`}>Placement ID</Label>
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
                                                placeholder="123456"
                                            />
                                            {position === 'inline' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor={`${position}Frequency`}>Frequency (paragraphs)</Label>
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
                <Card>
                    <CardHeader>
                        <CardTitle>Google AdSense Configuration</CardTitle>
                        <CardDescription>Configure your Google AdSense account and ad units</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="publisherId">Publisher ID</Label>
                            <Input
                                id="publisherId"
                                value={formData.googleAdSense.publisherId}
                                onChange={(e) => handleInputChange('googleAdSense', {
                                    ...formData.googleAdSense,
                                    publisherId: e.target.value
                                })}
                                placeholder="pub-XXXXXXXXXXXXXXXX"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="autoAdsEnabled"
                                checked={formData.googleAdSense.autoAdsEnabled}
                                onCheckedChange={(checked) => handleInputChange('googleAdSense', {
                                    ...formData.googleAdSense,
                                    autoAdsEnabled: checked
                                })}
                            />
                            <Label htmlFor="autoAdsEnabled">Enable Auto Ads</Label>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium">Ad Unit Placements</h4>

                            {Object.entries(formData.googleAdSense.adSlots).map(([position, config]) => (
                                <div key={position} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-medium capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                                        <Switch
                                            checked={config.enabled}
                                            onCheckedChange={(checked) => handleInputChange('googleAdSense', {
                                                ...formData.googleAdSense,
                                                adSlots: {
                                                    ...formData.googleAdSense.adSlots,
                                                    [position]: { ...config, enabled: checked }
                                                }
                                            })}
                                        />
                                    </div>

                                    {config.enabled && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`${position}AdSlotId`}>Ad Slot ID</Label>
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
                                                placeholder="1234567890"
                                            />
                                            {position === 'inline' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor={`${position}Frequency`}>Frequency (paragraphs)</Label>
                                                    <Input
                                                        id={`${position}Frequency`}
                                                        type="number"
                                                        value={config.frequency}
                                                        onChange={(e) => handleInputChange('googleAdSense', {
                                                            ...formData.googleAdSense,
                                                            adSlots: {
                                                                ...formData.googleAdSense.adSlots,
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
            {formData.adsEnabled && (
                <Card>
                    <CardHeader>
                        <CardTitle>Ad Display Settings</CardTitle>
                        <CardDescription>Configure how ads are displayed and targeted</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="refreshInterval">Ad Refresh Interval (seconds)</Label>
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
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxAdsPerPage">Max Ads Per Page</Label>
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
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adDensity">Ad Density</Label>
                            <Select
                                value={formData.adSettings.adDensity}
                                onValueChange={(value) => handleInputChange('adSettings', {
                                    ...formData.adSettings,
                                    adDensity: value
                                })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="balanced">Balanced</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium">Advanced Options</h4>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="gdprConsent"
                                    checked={formData.adSettings.gdprConsent}
                                    onCheckedChange={(checked) => handleInputChange('adSettings', {
                                        ...formData.adSettings,
                                        gdprConsent: checked
                                    })}
                                />
                                <Label htmlFor="gdprConsent">Enable GDPR consent management</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="adBlockerDetection"
                                    checked={formData.adSettings.adBlockerDetection}
                                    onCheckedChange={(checked) => handleInputChange('adSettings', {
                                        ...formData.adSettings,
                                        adBlockerDetection: checked
                                    })}
                                />
                                <Label htmlFor="adBlockerDetection">Enable ad blocker detection</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="targetByCategory"
                                    checked={formData.adSettings.targetByCategory}
                                    onCheckedChange={(checked) => handleInputChange('adSettings', {
                                        ...formData.adSettings,
                                        targetByCategory: checked
                                    })}
                                />
                                <Label htmlFor="targetByCategory">Target ads by category</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="targetByTags"
                                    checked={formData.adSettings.targetByTags}
                                    onCheckedChange={(checked) => handleInputChange('adSettings', {
                                        ...formData.adSettings,
                                        targetByTags: checked
                                    })}
                                />
                                <Label htmlFor="targetByTags">Target ads by tags</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AdsSettings;
