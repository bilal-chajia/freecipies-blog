import React, { useState } from 'react';
import { FormField, ToggleCard } from '../../../components/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { Mail, Server, Shield, Send, BellRing, Info } from 'lucide-react';

const EmailSettings = ({ formData, handleInputChange }) => {
    const [activeSection, setActiveSection] = useState('smtp');

    return (
        <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
            <TabsList className="h-9 p-1 bg-muted/50 rounded-lg">
                <TabsTrigger value="smtp" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Server className="w-3.5 h-3.5 mr-1.5" />
                    SMTP
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <BellRing className="w-3.5 h-3.5 mr-1.5" />
                    Notifications
                </TabsTrigger>
            </TabsList>

            <TabsContent value="smtp" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <FormField
                            id="smtpHost"
                            label="SMTP Host"
                            icon={Send}
                            value={formData.smtpHost}
                            onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                            placeholder="e.g. smtp.mailgun.org"
                        />
                    </div>
                    <FormField
                        id="smtpPort"
                        label="Port"
                        value={formData.smtpPort}
                        onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                        placeholder="587"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        id="smtpUser"
                        label="SMTP Username"
                        value={formData.smtpUser}
                        onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                        placeholder="postmaster@yourdomain.com"
                    />
                    <FormField
                        id="smtpPassword"
                        label="SMTP Password"
                        icon={Shield}
                        type="password"
                        value={formData.smtpPassword}
                        onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                        placeholder="••••••••••••"
                    />
                </div>

                <FormField
                    id="emailFrom"
                    label="Sender Address"
                    type="email"
                    value={formData.emailFrom}
                    onChange={(e) => handleInputChange('emailFrom', e.target.value)}
                    placeholder="noreply@recipes-saas.com"
                    description={'The "From" address shown to recipients.'}
                />
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 space-y-4">
                <ToggleCard
                    id="emailNotifications"
                    label="Transactional Notifications"
                    description="Send automated emails for signups, password resets, and alerts."
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                />
                
                <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 rounded-md text-xs text-amber-700 dark:text-amber-400">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                    Verify SMTP credentials before enabling production notifications.
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default EmailSettings;

