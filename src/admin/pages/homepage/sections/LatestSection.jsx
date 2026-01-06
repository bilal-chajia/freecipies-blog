/**
 * LatestSection - Homepage Latest Posts configuration
 */

import React from 'react';
import { FormField } from '@/components/settings';
import { SectionCard } from '@/components/homepage';
import { Newspaper } from 'lucide-react';
import { Switch } from '@/ui/switch.jsx';
import { Label } from '@/ui/label.jsx';

const LatestSection = ({ formData, handleNestedInputChange }) => {
    return (
        <SectionCard
            title="Latest Posts"
            description="Display your most recent content"
            icon={Newspaper}
            enabled={formData.latestPosts.enabled}
            onEnabledChange={(checked) => handleNestedInputChange('latestPosts', 'enabled', checked)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="latestTitle"
                    label="Section Title"
                    value={formData.latestPosts.title}
                    onChange={(e) => handleNestedInputChange('latestPosts', 'title', e.target.value)}
                    placeholder="Latest Posts"
                />
                <FormField
                    id="latestSubtitle"
                    label="Subtitle"
                    value={formData.latestPosts.subtitle}
                    onChange={(e) => handleNestedInputChange('latestPosts', 'subtitle', e.target.value)}
                    placeholder="Stay updated with our newest content"
                />
            </div>

            <FormField
                id="latestMax"
                label="Max Posts"
                type="number"
                min={1}
                max={24}
                value={formData.latestPosts.maxPosts}
                onChange={(e) => handleNestedInputChange('latestPosts', 'maxPosts', parseInt(e.target.value))}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-2 rounded border border-border/40">
                    <Label className="text-xs">Excerpt</Label>
                    <Switch
                        checked={formData.latestPosts.showExcerpt}
                        onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showExcerpt', checked)}
                    />
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-border/40">
                    <Label className="text-xs">Author</Label>
                    <Switch
                        checked={formData.latestPosts.showAuthor}
                        onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showAuthor', checked)}
                    />
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-border/40">
                    <Label className="text-xs">Date</Label>
                    <Switch
                        checked={formData.latestPosts.showDate}
                        onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showDate', checked)}
                    />
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-border/40">
                    <Label className="text-xs">Views</Label>
                    <Switch
                        checked={formData.latestPosts.showViews}
                        onCheckedChange={(checked) => handleNestedInputChange('latestPosts', 'showViews', checked)}
                    />
                </div>
            </div>
        </SectionCard>
    );
};

export default LatestSection;
