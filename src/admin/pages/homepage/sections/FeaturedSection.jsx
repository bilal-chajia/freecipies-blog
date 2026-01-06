/**
 * FeaturedSection - Homepage Featured Posts configuration
 */

import React from 'react';
import { FormField } from '@/components/settings';
import { SectionCard } from '@/components/homepage';
import { Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Label } from '@/ui/label.jsx';

const FeaturedSection = ({ formData, handleNestedInputChange }) => {
    return (
        <SectionCard
            title="Featured Posts"
            description="Highlight your best performing or handpicked articles"
            icon={Star}
            enabled={formData.featuredPosts.enabled}
            onEnabledChange={(checked) => handleNestedInputChange('featuredPosts', 'enabled', checked)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="featuredTitle"
                    label="Section Title"
                    value={formData.featuredPosts.title}
                    onChange={(e) => handleNestedInputChange('featuredPosts', 'title', e.target.value)}
                    placeholder="Featured Articles"
                />
                <FormField
                    id="featuredSubtitle"
                    label="Subtitle"
                    value={formData.featuredPosts.subtitle}
                    onChange={(e) => handleNestedInputChange('featuredPosts', 'subtitle', e.target.value)}
                    placeholder="Handpicked content for you"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Display Type</Label>
                    <Select
                        value={formData.featuredPosts.displayType}
                        onValueChange={(value) => handleNestedInputChange('featuredPosts', 'displayType', value)}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="grid">Grid</SelectItem>
                            <SelectItem value="list">List</SelectItem>
                            <SelectItem value="carousel">Carousel</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <FormField
                    id="featuredMaxPosts"
                    label="Max Posts"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.featuredPosts.maxPosts}
                    onChange={(e) => handleNestedInputChange('featuredPosts', 'maxPosts', parseInt(e.target.value))}
                />

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Sort By</Label>
                    <Select
                        value={formData.featuredPosts.sortBy}
                        onValueChange={(value) => handleNestedInputChange('featuredPosts', 'sortBy', value)}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="published_at">Date</SelectItem>
                            <SelectItem value="views">Views</SelectItem>
                            <SelectItem value="favorites">Favorites</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </SectionCard>
    );
};

export default FeaturedSection;
