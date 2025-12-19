import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';

const GeneralSettings = ({ formData, handleInputChange }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>Basic information about your blog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="siteName">Site Name *</Label>
                        <Input
                            id="siteName"
                            value={formData.siteName}
                            onChange={(e) => handleInputChange('siteName', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adminEmail">Admin Email *</Label>
                        <Input
                            id="adminEmail"
                            type="email"
                            value={formData.adminEmail}
                            onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Textarea
                        id="siteDescription"
                        value={formData.siteDescription}
                        onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="siteUrl">Site URL *</Label>
                        <Input
                            id="siteUrl"
                            value={formData.siteUrl}
                            onChange={(e) => handleInputChange('siteUrl', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                            value={formData.timezone}
                            onValueChange={(value) => handleInputChange('timezone', value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="America/Toronto">Eastern Time</SelectItem>
                                <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                                <SelectItem value="America/Chicago">Central Time</SelectItem>
                                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                                <SelectItem value="UTC">UTC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default GeneralSettings;
