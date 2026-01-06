/**
 * BannersSection - Homepage Banners configuration
 */

import React from 'react';
import { FormField } from '@/components/settings';
import { SectionCard } from '@/components/homepage';
import { AppWindow } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Label } from '@/ui/label.jsx';

const BannerConfig = ({ banner, bannerKey, formData, handleBannerChange }) => (
    <div className="space-y-3 p-3 rounded-md border border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Banner {bannerKey === 'banner1' ? '1' : '2'}</Label>
            <Switch
                checked={banner.enabled}
                onCheckedChange={(checked) => handleBannerChange(bannerKey, 'enabled', checked)}
            />
        </div>

        {banner.enabled && (
            <>
                <div className="grid grid-cols-2 gap-3">
                    <FormField
                        id={`${bannerKey}Title`}
                        label="Title"
                        value={banner.title}
                        onChange={(e) => handleBannerChange(bannerKey, 'title', e.target.value)}
                        placeholder="Banner title"
                    />
                    <FormField
                        id={`${bannerKey}Button`}
                        label="Button Text"
                        value={banner.buttonText}
                        onChange={(e) => handleBannerChange(bannerKey, 'buttonText', e.target.value)}
                        placeholder="Learn More"
                    />
                </div>
                <FormField
                    id={`${bannerKey}Desc`}
                    label="Description"
                    value={banner.description}
                    onChange={(e) => handleBannerChange(bannerKey, 'description', e.target.value)}
                    placeholder="Banner description"
                />
                <div className="grid grid-cols-2 gap-3">
                    <FormField
                        id={`${bannerKey}Image`}
                        label="Image URL"
                        value={banner.image}
                        onChange={(e) => handleBannerChange(bannerKey, 'image', e.target.value)}
                        placeholder="https://..."
                    />
                    <FormField
                        id={`${bannerKey}Link`}
                        label="Link URL"
                        value={banner.link}
                        onChange={(e) => handleBannerChange(bannerKey, 'link', e.target.value)}
                        placeholder="/page"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Position</Label>
                        <Select
                            value={banner.position}
                            onValueChange={(value) => handleBannerChange(bannerKey, 'position', value)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="middle">Middle</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Size</Label>
                        <Select
                            value={banner.size}
                            onValueChange={(value) => handleBannerChange(bannerKey, 'size', value)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </>
        )}
    </div>
);

const BannersSection = ({ formData, handleNestedInputChange }) => {
    const handleBannerChange = (bannerKey, field, value) => {
        handleNestedInputChange('banners', bannerKey, {
            ...formData.banners[bannerKey],
            [field]: value
        });
    };

    return (
        <SectionCard
            title="Banners"
            description="Promotional banners displayed on homepage"
            icon={AppWindow}
            enabled={formData.banners.enabled}
            onEnabledChange={(checked) => handleNestedInputChange('banners', 'enabled', checked)}
        >
            <div className="space-y-4">
                <BannerConfig
                    banner={formData.banners.banner1}
                    bannerKey="banner1"
                    formData={formData}
                    handleBannerChange={handleBannerChange}
                />
                <BannerConfig
                    banner={formData.banners.banner2}
                    bannerKey="banner2"
                    formData={formData}
                    handleBannerChange={handleBannerChange}
                />
            </div>
        </SectionCard>
    );
};

export default BannersSection;
