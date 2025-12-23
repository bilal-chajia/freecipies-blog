import React, { useState } from 'react';
import { FormField, ToggleCard } from '../../../components/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { ShieldCheck, Zap, Lock, Shield, Clock, AlertTriangle, Activity, Cpu, Server, Sparkles } from 'lucide-react';

const AdvancedSettings = ({ formData, handleInputChange }) => {
    const [activeSection, setActiveSection] = useState('security');

    return (
        <div className="space-y-4">
            <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
                <TabsList className="h-9 p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger value="security" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Performance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="security" className="mt-0 space-y-4">
                    <div className="divide-y divide-border/40">
                        <ToggleCard
                            id="maintenanceMode"
                            label="Maintenance Mode"
                            icon={Lock}
                            iconColor="text-amber-500"
                            description="Take the storefront offline for updates."
                            checked={formData.maintenanceMode}
                            onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                        />
                        <ToggleCard
                            id="registrationEnabled"
                            label="User Registration"
                            icon={Shield}
                            iconColor="text-blue-500"
                            description="Toggle public account creation."
                            checked={formData.registrationEnabled}
                            onCheckedChange={(checked) => handleInputChange('registrationEnabled', checked)}
                        />
                        <ToggleCard
                            id="twoFactorAuth"
                            label="Two-Factor (2FA)"
                            icon={ShieldCheck}
                            iconColor="text-emerald-500"
                            description="Mandate extra security for admin logins."
                            checked={formData.twoFactorAuth}
                            onCheckedChange={(checked) => handleInputChange('twoFactorAuth', checked)}
                        />
                    </div>

                    <div className="max-w-xs">
                        <FormField
                            id="sessionTimeout"
                            label="Session Lifespan"
                            icon={Clock}
                            type="number"
                            value={formData.sessionTimeout}
                            onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                            min={5}
                            max={480}
                            suffix="min"
                            description="Duration before inactivity logout (5-480)."
                        />
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="mt-0 space-y-4">
                    <div className="divide-y divide-border/40">
                        <ToggleCard
                            id="cacheEnabled"
                            label="Smart Caching"
                            icon={Activity}
                            iconColor="text-primary"
                            description="Leverage server-side data retention."
                            checked={formData.cacheEnabled}
                            onCheckedChange={(checked) => handleInputChange('cacheEnabled', checked)}
                        />
                        <ToggleCard
                            id="imageOptimization"
                            label="Image Optimization"
                            icon={Cpu}
                            iconColor="text-emerald-500"
                            description="Auto-resize and compress media."
                            checked={formData.imageOptimization}
                            onCheckedChange={(checked) => handleInputChange('imageOptimization', checked)}
                        />
                        <ToggleCard
                            id="cdnEnabled"
                            label="Edge CDN"
                            icon={Server}
                            iconColor="text-blue-500"
                            description="Distribute content across global nodes."
                            checked={formData.cdnEnabled}
                            onCheckedChange={(checked) => handleInputChange('cdnEnabled', checked)}
                        />
                        <ToggleCard
                            id="lazyLoading"
                            label="Lazy Loading"
                            icon={Sparkles}
                            iconColor="text-purple-500"
                            description="Defer offscreen asset loading."
                            checked={formData.lazyLoading}
                            onCheckedChange={(checked) => handleInputChange('lazyLoading', checked)}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 rounded-md text-xs text-amber-700 dark:text-amber-400" role="alert">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                Changing these settings may impact system stability.
            </div>
        </div>
    );
};

export default AdvancedSettings;

