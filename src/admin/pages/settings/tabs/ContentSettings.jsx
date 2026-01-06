import React, { useState } from 'react';
import { FormField, ToggleCard } from '@/components/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { FileText, MessageSquare, Rocket, Camera, LayoutGrid, Info } from 'lucide-react';

const ContentSettings = ({ formData, handleInputChange }) => {
    const [activeSection, setActiveSection] = useState('display');

    return (
        <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
            <TabsList className="h-9 p-1 bg-muted/50 rounded-lg">
                <TabsTrigger value="display" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                    Display
                </TabsTrigger>
                <TabsTrigger value="publishing" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Publishing
                </TabsTrigger>
            </TabsList>

            <TabsContent value="display" className="mt-0">
                <div className="max-w-xs">
                    <FormField
                        id="postsPerPage"
                        label="Posts Per Page"
                        type="number"
                        value={formData.postsPerPage}
                        onChange={(e) => handleInputChange('postsPerPage', parseInt(e.target.value))}
                        min={1}
                        max={50}
                        badge="1-50"
                        suffix="items"
                        description="Controls the number of articles displayed per page."
                    />
                </div>
            </TabsContent>

            <TabsContent value="publishing" className="mt-0 space-y-4">
                <div className="divide-y divide-border/40">
                    <ToggleCard
                        id="commentsEnabled"
                        label="Post Comments"
                        icon={MessageSquare}
                        iconColor="text-blue-500"
                        description="Allow readers to leave feedback on articles."
                        checked={formData.commentsEnabled}
                        onCheckedChange={(checked) => handleInputChange('commentsEnabled', checked)}
                    />
                    <ToggleCard
                        id="autoPublish"
                        label="Auto-Publish"
                        icon={Rocket}
                        iconColor="text-emerald-500"
                        description="Instantly publish drafts once saved."
                        checked={formData.autoPublish}
                        onCheckedChange={(checked) => handleInputChange('autoPublish', checked)}
                    />
                    <ToggleCard
                        id="featuredImageRequired"
                        label="Media Check"
                        icon={Camera}
                        iconColor="text-amber-500"
                        description="Require a featured image to publish."
                        checked={formData.featuredImageRequired}
                        onCheckedChange={(checked) => handleInputChange('featuredImageRequired', checked)}
                    />
                </div>

                <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-md text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                    Changing pagination may affect SEO indexes.
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default ContentSettings;

