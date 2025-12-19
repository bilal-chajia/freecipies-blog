import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Switch } from '@/ui/switch.jsx';

const EmailSettings = ({ formData, handleInputChange }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>SMTP settings for sending emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                            id="smtpHost"
                            value={formData.smtpHost}
                            onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                            placeholder="smtp.gmail.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                            id="smtpPort"
                            value={formData.smtpPort}
                            onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="smtpUser">SMTP Username</Label>
                        <Input
                            id="smtpUser"
                            value={formData.smtpUser}
                            onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtpPassword">SMTP Password</Label>
                        <Input
                            id="smtpPassword"
                            type="password"
                            value={formData.smtpPassword}
                            onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="emailFrom">From Email Address</Label>
                    <Input
                        id="emailFrom"
                        type="email"
                        value={formData.emailFrom}
                        onChange={(e) => handleInputChange('emailFrom', e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id="emailNotifications"
                        checked={formData.emailNotifications}
                        onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                    />
                    <Label htmlFor="emailNotifications">Enable email notifications</Label>
                </div>
            </CardContent>
        </Card>
    );
};

export default EmailSettings;
