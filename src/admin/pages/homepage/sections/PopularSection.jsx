/**
 * PopularSection - Homepage Popular Posts configuration
 */

import React from 'react';
import { FormField } from '@/components/settings';
import { SectionCard } from '@/components/homepage';
import { Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Label } from '@/ui/label.jsx';

const PopularSection = ({ formData, handleNestedInputChange }) => {
    return (
        <SectionCard
            title="Popular Posts"
            description="Showcase your most viewed content"
            icon={Sparkles}
            enabled={formData.popularPosts.enabled}
            onEnabledChange={(checked) => handleNestedInputChange('popularPosts', 'enabled', checked)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="popTitle"
                    label="Section Title"
                    value={formData.popularPosts.title}
                    onChange={(e) => handleNestedInputChange('popularPosts', 'title', e.target.value)}
                    placeholder="Most Popular"
                />
                <FormField
                    id="popSubtitle"
                    label="Subtitle"
                    value={formData.popularPosts.subtitle}
                    onChange={(e) => handleNestedInputChange('popularPosts', 'subtitle', e.target.value)}
                    placeholder="What everyone is reading"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    id="popMax"
                    label="Max Posts"
                    type="number"
                    min={1}
                    max={12}
                    value={formData.popularPosts.maxPosts}
                    onChange={(e) => handleNestedInputChange('popularPosts', 'maxPosts', parseInt(e.target.value))}
                />

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Time Range</Label>
                    <Select
                        value={formData.popularPosts.timeRange}
                        onValueChange={(value) => handleNestedInputChange('popularPosts', 'timeRange', value)}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show Views</Label>
                        <Switch
                            checked={formData.popularPosts.showViews}
                            onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'showViews', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show Excerpt</Label>
                        <Switch
                            checked={formData.popularPosts.showExcerpt}
                            onCheckedChange={(checked) => handleNestedInputChange('popularPosts', 'showExcerpt', checked)}
                        />
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

export default PopularSection;
