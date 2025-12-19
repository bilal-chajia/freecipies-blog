import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Switch } from '@/ui/switch.jsx';

const AdvancedSettings = ({ formData, handleInputChange }) => {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Security and access control options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="maintenanceMode"
                            checked={formData.maintenanceMode}
                            onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                        />
                        <Label htmlFor="maintenanceMode">Enable maintenance mode</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="registrationEnabled"
                            checked={formData.registrationEnabled}
                            onCheckedChange={(checked) => handleInputChange('registrationEnabled', checked)}
                        />
                        <Label htmlFor="registrationEnabled">Allow user registration</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="twoFactorAuth"
                            checked={formData.twoFactorAuth}
                            onCheckedChange={(checked) => handleInputChange('twoFactorAuth', checked)}
                        />
                        <Label htmlFor="twoFactorAuth">Enable two-factor authentication</Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input
                            id="sessionTimeout"
                            type="number"
                            value={formData.sessionTimeout}
                            onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                            min="5"
                            max="480"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Performance Settings</CardTitle>
                    <CardDescription>Optimize your site's performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="cacheEnabled"
                            checked={formData.cacheEnabled}
                            onCheckedChange={(checked) => handleInputChange('cacheEnabled', checked)}
                        />
                        <Label htmlFor="cacheEnabled">Enable caching</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="imageOptimization"
                            checked={formData.imageOptimization}
                            onCheckedChange={(checked) => handleInputChange('imageOptimization', checked)}
                        />
                        <Label htmlFor="imageOptimization">Enable image optimization</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="cdnEnabled"
                            checked={formData.cdnEnabled}
                            onCheckedChange={(checked) => handleInputChange('cdnEnabled', checked)}
                        />
                        <Label htmlFor="cdnEnabled">Enable CDN</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="lazyLoading"
                            checked={formData.lazyLoading}
                            onCheckedChange={(checked) => handleInputChange('lazyLoading', checked)}
                        />
                        <Label htmlFor="lazyLoading">Enable lazy loading</Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdvancedSettings;
