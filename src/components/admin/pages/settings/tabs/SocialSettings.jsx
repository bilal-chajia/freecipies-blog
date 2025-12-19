import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';

const SocialSettings = ({ formData, handleInputChange }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
                <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="facebookUrl">Facebook URL</Label>
                        <Input
                            id="facebookUrl"
                            value={formData.facebookUrl}
                            onChange={(e) => handleInputChange('facebookUrl', e.target.value)}
                            placeholder="https://facebook.com/yourpage"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="twitterUrl">Twitter URL</Label>
                        <Input
                            id="twitterUrl"
                            value={formData.twitterUrl}
                            onChange={(e) => handleInputChange('twitterUrl', e.target.value)}
                            placeholder="https://twitter.com/yourhandle"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="instagramUrl">Instagram URL</Label>
                        <Input
                            id="instagramUrl"
                            value={formData.instagramUrl}
                            onChange={(e) => handleInputChange('instagramUrl', e.target.value)}
                            placeholder="https://instagram.com/yourhandle"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pinterestUrl">Pinterest URL</Label>
                        <Input
                            id="pinterestUrl"
                            value={formData.pinterestUrl}
                            onChange={(e) => handleInputChange('pinterestUrl', e.target.value)}
                            placeholder="https://pinterest.com/yourprofile"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube URL</Label>
                    <Input
                        id="youtubeUrl"
                        value={formData.youtubeUrl}
                        onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                        placeholder="https://youtube.com/yourchannel"
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default SocialSettings;
