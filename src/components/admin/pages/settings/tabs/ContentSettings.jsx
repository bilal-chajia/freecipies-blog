import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Switch } from '@/ui/switch.jsx';

const ContentSettings = ({ formData, handleInputChange }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Content Settings</CardTitle>
                <CardDescription>Configure how content is displayed and managed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="postsPerPage">Posts Per Page</Label>
                    <Input
                        id="postsPerPage"
                        type="number"
                        value={formData.postsPerPage}
                        onChange={(e) => handleInputChange('postsPerPage', parseInt(e.target.value))}
                        min="1"
                        max="50"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="commentsEnabled"
                            checked={formData.commentsEnabled}
                            onCheckedChange={(checked) => handleInputChange('commentsEnabled', checked)}
                        />
                        <Label htmlFor="commentsEnabled">Enable comments on posts</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="autoPublish"
                            checked={formData.autoPublish}
                            onCheckedChange={(checked) => handleInputChange('autoPublish', checked)}
                        />
                        <Label htmlFor="autoPublish">Auto-publish new posts</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="featuredImageRequired"
                            checked={formData.featuredImageRequired}
                            onCheckedChange={(checked) => handleInputChange('featuredImageRequired', checked)}
                        />
                        <Label htmlFor="featuredImageRequired">Require featured image for posts</Label>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ContentSettings;
