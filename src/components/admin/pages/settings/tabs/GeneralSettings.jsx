import React, { useState } from 'react';
import { FormField } from '../../../components/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Label } from '@/ui/label.jsx';
import { Globe, Mail, Link2, Clock, Languages, Info } from 'lucide-react';

const GeneralSettings = ({ formData, handleInputChange }) => {
    const [activeSection, setActiveSection] = useState('site');

    return (
        <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
            <TabsList className="h-9 p-1 bg-muted/50 rounded-lg">
                <TabsTrigger value="site" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Info className="w-3.5 h-3.5 mr-1.5" />
                    Site Information
                </TabsTrigger>
                <TabsTrigger value="localization" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Languages className="w-3.5 h-3.5 mr-1.5" />
                    Localization
                </TabsTrigger>
            </TabsList>

            <TabsContent value="site" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        id="siteName"
                        label="Site Name"
                        icon={Globe}
                        required
                        value={formData.siteName}
                        onChange={(e) => handleInputChange('siteName', e.target.value)}
                        placeholder="e.g. Freecipies"
                        description="The primary title of your web application."
                    />
                    <FormField
                        id="adminEmail"
                        label="Admin Email"
                        icon={Mail}
                        type="email"
                        required
                        value={formData.adminEmail}
                        onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                        placeholder="admin@example.com"
                        description="Used for critical system notifications."
                    />
                </div>

                <FormField
                    id="siteDescription"
                    label="Site Description"
                    multiline
                    rows={3}
                    value={formData.siteDescription}
                    onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                    placeholder="Write a compelling description for your blog..."
                    description="Appears in search results. Recommended: 150-160 characters."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        id="siteUrl"
                        label="Site URL"
                        icon={Link2}
                        required
                        value={formData.siteUrl}
                        onChange={(e) => handleInputChange('siteUrl', e.target.value)}
                        placeholder="https://example.com"
                    />
                    <div className="space-y-1.5">
                        <Label htmlFor="timezone" className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                            System Timezone
                        </Label>
                        <Select
                            value={formData.timezone}
                            onValueChange={(value) => handleInputChange('timezone', value)}
                        >
                            <SelectTrigger className="h-9 px-3 text-sm bg-background border border-border/60 rounded-md">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-md border-border/60">
                                <SelectItem value="America/Toronto">Eastern Time (Toronto)</SelectItem>
                                <SelectItem value="America/New_York">Eastern Time (New York)</SelectItem>
                                <SelectItem value="America/Chicago">Central Time</SelectItem>
                                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                                <SelectItem value="UTC">UTC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="localization" className="mt-0">
                <div className="max-w-xs space-y-1.5">
                    <Label htmlFor="language" className="text-xs font-medium text-foreground/80">Default Language</Label>
                    <Select
                        value={formData.language}
                        onValueChange={(value) => handleInputChange('language', value)}
                    >
                        <SelectTrigger className="h-9 px-3 text-sm bg-background border border-border/60 rounded-md">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-md border-border/60">
                            <SelectItem value="en">English (US)</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground/70">Sets the primary language for the dashboard.</p>
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default GeneralSettings;

