import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Mail, Globe, Shield, Database, Palette, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { useSettingsStore } from '../../store/useStore';

const Settings = () => {
  const { settings, loading, error, setSettings } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  const [formData, setFormData] = useState({
    // General Settings
    siteName: 'Freecipies',
    siteDescription: 'Delicious recipes and cooking tips',
    siteUrl: 'https://freecipies.com',
    adminEmail: 'admin@freecipies.com',
    timezone: 'America/Toronto',
    language: 'en',

    // SEO Settings
    defaultMetaTitle: 'Freecipies - Delicious Recipes & Cooking Tips',
    defaultMetaDescription: 'Discover amazing recipes, cooking techniques, and kitchen tips from professional chefs and home cooks.',
    googleAnalyticsId: '',
    robotsTxt: 'User-agent: *\nAllow: /\n\nSitemap: https://freecipies.com/sitemap.xml',

    // Email Settings
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    emailFrom: 'noreply@freecipies.com',
    emailNotifications: true,

    // Social Media
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    pinterestUrl: '',
    youtubeUrl: '',

    // Content Settings
    postsPerPage: 12,
    commentsEnabled: true,
    autoPublish: false,
    featuredImageRequired: true,

    // Security Settings
    maintenanceMode: false,
    registrationEnabled: false,
    twoFactorAuth: false,
    sessionTimeout: 30,

    // Performance Settings
    cacheEnabled: true,
    imageOptimization: true,
    cdnEnabled: false,
    lazyLoading: true,

    // Ads Settings
    adsEnabled: false,
    adNetwork: 'none', // 'none', 'google-adsense', 'ezoic', 'hb-agency', 'custom'
    googleAdSense: {
      publisherId: '',
      autoAdsEnabled: false,
      adSlots: {
        header: { enabled: false, adSlotId: '' },
        sidebar: { enabled: false, adSlotId: '' },
        footer: { enabled: false, adSlotId: '' },
        inline: { enabled: false, adSlotId: '', frequency: 3 },
        articleTop: { enabled: false, adSlotId: '' },
        articleBottom: { enabled: false, adSlotId: '' },
      }
    },
    ezoic: {
      publisherId: '',
      domainId: '',
      apiKey: '',
      adPlacements: {
        header: { enabled: false, placementId: '' },
        sidebar: { enabled: false, placementId: '' },
        footer: { enabled: false, placementId: '' },
        inline: { enabled: false, placementId: '', frequency: 3 },
        articleTop: { enabled: false, placementId: '' },
        articleBottom: { enabled: false, placementId: '' },
      }
    },
    hbAgency: {
      publisherId: '',
      apiKey: '',
      accountId: '',
      adUnits: {
        header: { enabled: false, unitId: '' },
        sidebar: { enabled: false, unitId: '' },
        footer: { enabled: false, unitId: '' },
        inline: { enabled: false, unitId: '', frequency: 3 },
        articleTop: { enabled: false, unitId: '' },
        articleBottom: { enabled: false, unitId: '' },
      }
    },
    customAds: {
      headerCode: '',
      sidebarCode: '',
      footerCode: '',
      inlineCode: '',
      articleTopCode: '',
      articleBottomCode: '',
    },
    adSettings: {
      refreshInterval: 30, // seconds
      gdprConsent: true,
      adBlockerDetection: false,
      targetByCategory: false,
      targetByTags: false,
      maxAdsPerPage: 3,
      adDensity: 'balanced', // 'low', 'balanced', 'high'
    },
  });

  // Load settings on mount
  useEffect(() => {
    // Mock loading settings - in real app this would come from API
    const mockSettings = {
      siteName: 'Freecipies',
      siteDescription: 'Delicious recipes and cooking tips',
      siteUrl: 'https://freecipies.com',
      adminEmail: 'admin@freecipies.com',
      timezone: 'America/Toronto',
      language: 'en',
      postsPerPage: 12,
      commentsEnabled: true,
      autoPublish: false,
      featuredImageRequired: true,
      maintenanceMode: false,
      registrationEnabled: false,
      twoFactorAuth: false,
      sessionTimeout: 30,
      cacheEnabled: true,
      imageOptimization: true,
      cdnEnabled: false,
      lazyLoading: true,
      adsEnabled: false,
      adNetwork: 'none',
      googleAdSense: {
        publisherId: '',
        autoAdsEnabled: false,
        adSlots: {
          header: { enabled: false, adSlotId: '' },
          sidebar: { enabled: false, adSlotId: '' },
          footer: { enabled: false, adSlotId: '' },
          inline: { enabled: false, adSlotId: '', frequency: 3 },
          articleTop: { enabled: false, adSlotId: '' },
          articleBottom: { enabled: false, adSlotId: '' },
        }
      },
      ezoic: {
        publisherId: '',
        domainId: '',
        apiKey: '',
        adPlacements: {
          header: { enabled: false, placementId: '' },
          sidebar: { enabled: false, placementId: '' },
          footer: { enabled: false, placementId: '' },
          inline: { enabled: false, placementId: '', frequency: 3 },
          articleTop: { enabled: false, placementId: '' },
          articleBottom: { enabled: false, placementId: '' },
        }
      },
      hbAgency: {
        publisherId: '',
        apiKey: '',
        accountId: '',
        adUnits: {
          header: { enabled: false, unitId: '' },
          sidebar: { enabled: false, unitId: '' },
          footer: { enabled: false, unitId: '' },
          inline: { enabled: false, unitId: '', frequency: 3 },
          articleTop: { enabled: false, unitId: '' },
          articleBottom: { enabled: false, unitId: '' },
        }
      },
      customAds: {
        headerCode: '',
        sidebarCode: '',
        footerCode: '',
        inlineCode: '',
        articleTopCode: '',
        articleBottomCode: '',
      },
      adSettings: {
        refreshInterval: 30,
        gdprConsent: true,
        adBlockerDetection: false,
        targetByCategory: false,
        targetByTags: false,
        maxAdsPerPage: 3,
        adDensity: 'balanced',
      },
    };
    setSettings(mockSettings);
    setFormData(prev => ({ ...prev, ...mockSettings }));
  }, [setSettings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus(null);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In real app, this would save to API
      setSettings(formData);
      setSaveStatus('success');

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>Error loading settings: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure your blog settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to save settings. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
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
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo" className="space-y-6">
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
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
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
        </TabsContent>

        {/* Social Media Settings */}
        <TabsContent value="social" className="space-y-6">
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
        </TabsContent>

        {/* Content Settings */}
        <TabsContent value="content" className="space-y-6">
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
        </TabsContent>

        {/* Ads Settings */}
        <TabsContent value="ads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Network Configuration</CardTitle>
              <CardDescription>Configure advertising networks and ad placements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="adsEnabled"
                  checked={formData.adsEnabled}
                  onCheckedChange={(checked) => handleInputChange('adsEnabled', checked)}
                />
                <Label htmlFor="adsEnabled">Enable ads on the website</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adNetwork">Ad Network</Label>
                <Select
                  value={formData.adNetwork}
                  onValueChange={(value) => handleInputChange('adNetwork', value)}
                  disabled={!formData.adsEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Ads</SelectItem>
                    <SelectItem value="google-adsense">Google AdSense</SelectItem>
                    <SelectItem value="ezoic">Ezoic</SelectItem>
                    <SelectItem value="hb-agency">HB Agency</SelectItem>
                    <SelectItem value="custom">Custom Ad Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ezoic Settings */}
          {formData.adNetwork === 'ezoic' && (
            <Card>
              <CardHeader>
                <CardTitle>Ezoic Configuration</CardTitle>
                <CardDescription>Configure your Ezoic account and ad placements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ezoicPublisherId">Publisher ID</Label>
                    <Input
                      id="ezoicPublisherId"
                      value={formData.ezoic.publisherId}
                      onChange={(e) => handleInputChange('ezoic', {
                        ...formData.ezoic,
                        publisherId: e.target.value
                      })}
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ezoicDomainId">Domain ID</Label>
                    <Input
                      id="ezoicDomainId"
                      value={formData.ezoic.domainId}
                      onChange={(e) => handleInputChange('ezoic', {
                        ...formData.ezoic,
                        domainId: e.target.value
                      })}
                      placeholder="example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ezoicApiKey">API Key</Label>
                  <Input
                    id="ezoicApiKey"
                    type="password"
                    value={formData.ezoic.apiKey}
                    onChange={(e) => handleInputChange('ezoic', {
                      ...formData.ezoic,
                      apiKey: e.target.value
                    })}
                    placeholder="Your Ezoic API key"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Ad Placements</h4>

                  {Object.entries(formData.ezoic.adPlacements).map(([position, config]) => (
                    <div key={position} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) => handleInputChange('ezoic', {
                            ...formData.ezoic,
                            adPlacements: {
                              ...formData.ezoic.adPlacements,
                              [position]: { ...config, enabled: checked }
                            }
                          })}
                        />
                      </div>

                      {config.enabled && (
                        <div className="space-y-2">
                          <Label htmlFor={`${position}PlacementId`}>Placement ID</Label>
                          <Input
                            id={`${position}PlacementId`}
                            value={config.placementId}
                            onChange={(e) => handleInputChange('ezoic', {
                              ...formData.ezoic,
                              adPlacements: {
                                ...formData.ezoic.adPlacements,
                                [position]: { ...config, placementId: e.target.value }
                              }
                            })}
                            placeholder="123456"
                          />
                          {position === 'inline' && (
                            <div className="space-y-2">
                              <Label htmlFor={`${position}Frequency`}>Frequency (paragraphs)</Label>
                              <Input
                                id={`${position}Frequency`}
                                type="number"
                                value={config.frequency}
                                onChange={(e) => handleInputChange('ezoic', {
                                  ...formData.ezoic,
                                  adPlacements: {
                                    ...formData.ezoic.adPlacements,
                                    [position]: { ...config, frequency: parseInt(e.target.value) }
                                  }
                                })}
                                min="1"
                                max="10"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* HB Agency Settings */}
          {formData.adNetwork === 'hb-agency' && (
            <Card>
              <CardHeader>
                <CardTitle>HB Agency Configuration</CardTitle>
                <CardDescription>Configure your HB Agency account and ad units</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hbPublisherId">Publisher ID</Label>
                    <Input
                      id="hbPublisherId"
                      value={formData.hbAgency.publisherId}
                      onChange={(e) => handleInputChange('hbAgency', {
                        ...formData.hbAgency,
                        publisherId: e.target.value
                      })}
                      placeholder="PUB12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hbAccountId">Account ID</Label>
                    <Input
                      id="hbAccountId"
                      value={formData.hbAgency.accountId}
                      onChange={(e) => handleInputChange('hbAgency', {
                        ...formData.hbAgency,
                        accountId: e.target.value
                      })}
                      placeholder="ACC12345"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hbApiKey">API Key</Label>
                  <Input
                    id="hbApiKey"
                    type="password"
                    value={formData.hbAgency.apiKey}
                    onChange={(e) => handleInputChange('hbAgency', {
                      ...formData.hbAgency,
                      apiKey: e.target.value
                    })}
                    placeholder="Your HB Agency API key"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Ad Units</h4>

                  {Object.entries(formData.hbAgency.adUnits).map(([position, config]) => (
                    <div key={position} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) => handleInputChange('hbAgency', {
                            ...formData.hbAgency,
                            adUnits: {
                              ...formData.hbAgency.adUnits,
                              [position]: { ...config, enabled: checked }
                            }
                          })}
                        />
                      </div>

                      {config.enabled && (
                        <div className="space-y-2">
                          <Label htmlFor={`${position}UnitId`}>Unit ID</Label>
                          <Input
                            id={`${position}UnitId`}
                            value={config.unitId}
                            onChange={(e) => handleInputChange('hbAgency', {
                              ...formData.hbAgency,
                              adUnits: {
                                ...formData.hbAgency.adUnits,
                                [position]: { ...config, unitId: e.target.value }
                              }
                            })}
                            placeholder="UNIT12345"
                          />
                          {position === 'inline' && (
                            <div className="space-y-2">
                              <Label htmlFor={`${position}Frequency`}>Frequency (paragraphs)</Label>
                              <Input
                                id={`${position}Frequency`}
                                type="number"
                                value={config.frequency}
                                onChange={(e) => handleInputChange('hbAgency', {
                                  ...formData.hbAgency,
                                  adUnits: {
                                    ...formData.hbAgency.adUnits,
                                    [position]: { ...config, frequency: parseInt(e.target.value) }
                                  }
                                })}
                                min="1"
                                max="10"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Google AdSense Settings */}
          {formData.adNetwork === 'google-adsense' && (
            <Card>
              <CardHeader>
                <CardTitle>Google AdSense Configuration</CardTitle>
                <CardDescription>Configure your Google AdSense account and ad units</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="publisherId">Publisher ID</Label>
                  <Input
                    id="publisherId"
                    value={formData.googleAdSense.publisherId}
                    onChange={(e) => handleInputChange('googleAdSense', {
                      ...formData.googleAdSense,
                      publisherId: e.target.value
                    })}
                    placeholder="pub-XXXXXXXXXXXXXXXX"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoAdsEnabled"
                    checked={formData.googleAdSense.autoAdsEnabled}
                    onCheckedChange={(checked) => handleInputChange('googleAdSense', {
                      ...formData.googleAdSense,
                      autoAdsEnabled: checked
                    })}
                  />
                  <Label htmlFor="autoAdsEnabled">Enable Auto Ads</Label>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Ad Unit Placements</h4>

                  {Object.entries(formData.googleAdSense.adSlots).map(([position, config]) => (
                    <div key={position} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium capitalize">{position.replace(/([A-Z])/g, ' $1')}</h5>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) => handleInputChange('googleAdSense', {
                            ...formData.googleAdSense,
                            adSlots: {
                              ...formData.googleAdSense.adSlots,
                              [position]: { ...config, enabled: checked }
                            }
                          })}
                        />
                      </div>

                      {config.enabled && (
                        <div className="space-y-2">
                          <Label htmlFor={`${position}AdSlotId`}>Ad Slot ID</Label>
                          <Input
                            id={`${position}AdSlotId`}
                            value={config.adSlotId}
                            onChange={(e) => handleInputChange('googleAdSense', {
                              ...formData.googleAdSense,
                              adSlots: {
                                ...formData.googleAdSense.adSlots,
                                [position]: { ...config, adSlotId: e.target.value }
                              }
                            })}
                            placeholder="1234567890"
                          />
                          {position === 'inline' && (
                            <div className="space-y-2">
                              <Label htmlFor={`${position}Frequency`}>Frequency (paragraphs)</Label>
                              <Input
                                id={`${position}Frequency`}
                                type="number"
                                value={config.frequency}
                                onChange={(e) => handleInputChange('googleAdSense', {
                                  ...formData.googleAdSense,
                                  adSlots: {
                                    ...formData.googleAdSense.adSlots,
                                    [position]: { ...config, frequency: parseInt(e.target.value) }
                                  }
                                })}
                                min="1"
                                max="10"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Ads Settings */}
          {formData.adNetwork === 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Ad Code</CardTitle>
                <CardDescription>Add your own ad code for different placements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(formData.customAds).map(([position, code]) => (
                  <div key={position} className="space-y-2">
                    <Label htmlFor={`${position}Code`} className="capitalize">
                      {position.replace(/([A-Z])/g, ' $1')} Ad Code
                    </Label>
                    <Textarea
                      id={`${position}Code`}
                      value={code}
                      onChange={(e) => handleInputChange('customAds', {
                        ...formData.customAds,
                        [position]: e.target.value
                      })}
                      placeholder={`<!-- ${position} ad code -->`}
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Ad Settings */}
          {formData.adsEnabled && (
            <Card>
              <CardHeader>
                <CardTitle>Ad Display Settings</CardTitle>
                <CardDescription>Configure how ads are displayed and targeted</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refreshInterval">Ad Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      value={formData.adSettings.refreshInterval}
                      onChange={(e) => handleInputChange('adSettings', {
                        ...formData.adSettings,
                        refreshInterval: parseInt(e.target.value)
                      })}
                      min="0"
                      max="300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxAdsPerPage">Max Ads Per Page</Label>
                    <Input
                      id="maxAdsPerPage"
                      type="number"
                      value={formData.adSettings.maxAdsPerPage}
                      onChange={(e) => handleInputChange('adSettings', {
                        ...formData.adSettings,
                        maxAdsPerPage: parseInt(e.target.value)
                      })}
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adDensity">Ad Density</Label>
                  <Select
                    value={formData.adSettings.adDensity}
                    onValueChange={(value) => handleInputChange('adSettings', {
                      ...formData.adSettings,
                      adDensity: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Advanced Options</h4>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="gdprConsent"
                      checked={formData.adSettings.gdprConsent}
                      onCheckedChange={(checked) => handleInputChange('adSettings', {
                        ...formData.adSettings,
                        gdprConsent: checked
                      })}
                    />
                    <Label htmlFor="gdprConsent">Enable GDPR consent management</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="adBlockerDetection"
                      checked={formData.adSettings.adBlockerDetection}
                      onCheckedChange={(checked) => handleInputChange('adSettings', {
                        ...formData.adSettings,
                        adBlockerDetection: checked
                      })}
                    />
                    <Label htmlFor="adBlockerDetection">Enable ad blocker detection</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="targetByCategory"
                      checked={formData.adSettings.targetByCategory}
                      onCheckedChange={(checked) => handleInputChange('adSettings', {
                        ...formData.adSettings,
                        targetByCategory: checked
                      })}
                    />
                    <Label htmlFor="targetByCategory">Target ads by category</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="targetByTags"
                      checked={formData.adSettings.targetByTags}
                      onCheckedChange={(checked) => handleInputChange('adSettings', {
                        ...formData.adSettings,
                        targetByTags: checked
                      })}
                    />
                    <Label htmlFor="targetByTags">Target ads by tags</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;