import React from 'react';
import { FormField } from '@/components/settings';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Search, Activity, FileCode } from 'lucide-react';

// Tabs configuration for this settings page
export const seoSettingsTabs = [
    { value: 'meta', label: 'Meta Tags', icon: Search },
    { value: 'analytics', label: 'Analytics', icon: Activity },
    { value: 'crawling', label: 'Crawling', icon: FileCode },
];

const SeoSettings = ({ formData, handleInputChange, activeSection = 'meta' }) => {
    const titleLength = formData.defaultMetaTitle?.length || 0;
    const descLength = formData.defaultMetaDescription?.length || 0;

    return (
        <>
            {activeSection === 'meta' && (
                <div className="space-y-4">
                    {/* Google Preview */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</Label>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/40 max-w-xl">
                            <div className="space-y-1">
                                <div className="text-xs text-muted-foreground truncate">
                                    {formData.siteUrl || 'https://recipes-saas.com'}
                                </div>
                                <h3 className="text-sm text-blue-600 dark:text-blue-400 truncate">
                                    {formData.defaultMetaTitle || 'Freecipies - Delicious Recipes'}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {formData.defaultMetaDescription || 'Discover amazing recipes...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="defaultMetaTitle" className="text-xs font-medium">Meta Title</Label>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${titleLength > 60 ? 'bg-amber-500/10 text-amber-600' : 'text-muted-foreground'}`}>
                                {titleLength}/60
                            </span>
                        </div>
                        <Input
                            id="defaultMetaTitle"
                            value={formData.defaultMetaTitle}
                            onChange={(e) => handleInputChange('defaultMetaTitle', e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Enter global meta title..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="defaultMetaDescription" className="text-xs font-medium">Meta Description</Label>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${descLength > 160 ? 'bg-amber-500/10 text-amber-600' : 'text-muted-foreground'}`}>
                                {descLength}/160
                            </span>
                        </div>
                        <Textarea
                            id="defaultMetaDescription"
                            value={formData.defaultMetaDescription}
                            onChange={(e) => handleInputChange('defaultMetaDescription', e.target.value)}
                            rows={3}
                            className="text-sm resize-none"
                            placeholder="Write a compelling description..."
                        />
                    </div>
                </div>
            )}

            {activeSection === 'analytics' && (
                <div className="space-y-4">
                    <FormField
                        id="googleAnalyticsId"
                        label="Google Analytics ID"
                        value={formData.googleAnalyticsId}
                        onChange={(e) => handleInputChange('googleAnalyticsId', e.target.value)}
                        placeholder="GA-XXXXXXXXXX"
                        description="Use GA4 properties for best compatibility."
                    />
                </div>
            )}

            {activeSection === 'crawling' && (
                <div className="space-y-2">
                    <Label htmlFor="robotsTxt" className="text-xs font-medium font-mono">Robots.txt</Label>
                    <Textarea
                        id="robotsTxt"
                        value={formData.robotsTxt}
                        onChange={(e) => handleInputChange('robotsTxt', e.target.value)}
                        rows={5}
                        className="p-3 bg-zinc-950 text-emerald-400 border border-border/60 rounded-md font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                        Invalid syntax can hide your site from search engines.
                    </p>
                </div>
            )}
        </>
    );
};

export default SeoSettings;
