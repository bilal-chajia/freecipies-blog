import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';

const SeoSettings = ({ formData, handleInputChange }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>SEO Configuration</CardTitle>
                <CardDescription>Search engine optimization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="defaultMetaTitle">Default Meta Title</Label>
                    <Input
                        id="defaultMetaTitle"
                        value={formData.defaultMetaTitle}
                        onChange={(e) => handleInputChange('defaultMetaTitle', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="defaultMetaDescription">Default Meta Description</Label>
                    <Textarea
                        id="defaultMetaDescription"
                        value={formData.defaultMetaDescription}
                        onChange={(e) => handleInputChange('defaultMetaDescription', e.target.value)}
                        rows={3}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                    <Input
                        id="googleAnalyticsId"
                        value={formData.googleAnalyticsId}
                        onChange={(e) => handleInputChange('googleAnalyticsId', e.target.value)}
                        placeholder="GA-XXXXXXXXXX"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="robotsTxt">Robots.txt Content</Label>
                    <Textarea
                        id="robotsTxt"
                        value={formData.robotsTxt}
                        onChange={(e) => handleInputChange('robotsTxt', e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default SeoSettings;
