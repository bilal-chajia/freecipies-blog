/**
 * CategoriesSection - Homepage Categories configuration
 */

import React from 'react';
import { FormField } from '@/components/settings';
import { SectionCard } from '@/components/homepage';
import { Grid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Label } from '@/ui/label.jsx';

const CategoriesSection = ({ formData, handleNestedInputChange }) => {
    return (
        <SectionCard
            title="Categories"
            description="Quick navigation blocks for browsing by category"
            icon={Grid}
            enabled={formData.categories.enabled}
            onEnabledChange={(checked) => handleNestedInputChange('categories', 'enabled', checked)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="catTitle"
                    label="Section Title"
                    value={formData.categories.title}
                    onChange={(e) => handleNestedInputChange('categories', 'title', e.target.value)}
                    placeholder="Browse by Category"
                />
                <FormField
                    id="catSubtitle"
                    label="Subtitle"
                    value={formData.categories.subtitle}
                    onChange={(e) => handleNestedInputChange('categories', 'subtitle', e.target.value)}
                    placeholder="Find what interests you most"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Display Type</Label>
                    <Select
                        value={formData.categories.displayType}
                        onValueChange={(value) => handleNestedInputChange('categories', 'displayType', value)}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="grid">Grid</SelectItem>
                            <SelectItem value="list">List</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <FormField
                    id="catMax"
                    label="Max Categories"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.categories.maxCategories}
                    onChange={(e) => handleNestedInputChange('categories', 'maxCategories', parseInt(e.target.value))}
                />

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show Post Count</Label>
                        <Switch
                            checked={formData.categories.showPostCount}
                            onCheckedChange={(checked) => handleNestedInputChange('categories', 'showPostCount', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Show Description</Label>
                        <Switch
                            checked={formData.categories.showDescription}
                            onCheckedChange={(checked) => handleNestedInputChange('categories', 'showDescription', checked)}
                        />
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

export default CategoriesSection;
