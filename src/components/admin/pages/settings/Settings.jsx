import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { Alert, AlertDescription } from '@/ui/alert.jsx';
import { useSettingsStore } from '../../store/useStore';

// Import Tab Components
import GeneralSettings from './tabs/GeneralSettings';
import SeoSettings from './tabs/SeoSettings';
import EmailSettings from './tabs/EmailSettings';
import SocialSettings from './tabs/SocialSettings';
import ContentSettings from './tabs/ContentSettings';
import AdsSettings from './tabs/AdsSettings';
import AppearanceSettings from './tabs/AppearanceSettings';
import AdvancedSettings from './tabs/AdvancedSettings';

const Settings = () => {
  const { settings, loading, error, setSettings } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  const [formData, setFormData] = useState({
    // General Settings
    siteName: 'Freecipies',
    siteDescription: 'Delicious recipes and cooking tips',
    siteUrl: 'https://recipes-saas.com',
    adminEmail: 'admin@recipes-saas.com',
    timezone: 'America/Toronto',
    language: 'en',

    // Appearance Settings
    badgeColor: '#3b82f6',

    // SEO Settings
    defaultMetaTitle: 'Freecipies - Delicious Recipes & Cooking Tips',
    defaultMetaDescription: 'Discover amazing recipes, cooking techniques, and kitchen tips from professional chefs and home cooks.',
    googleAnalyticsId: '',
    robotsTxt: 'User-agent: *\nAllow: /\n\nSitemap: https://recipes-saas.com/sitemap.xml',

    // Email Settings
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    emailFrom: 'noreply@recipes-saas.com',
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
    // (This logic is preserved from original)
    const mockSettings = {
      siteName: 'Freecipies',
      siteDescription: 'Delicious recipes and cooking tips',
      siteUrl: 'https://recipes-saas.com',
      adminEmail: 'admin@recipes-saas.com',
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
    // If real settings exist, use them? But store says:
    // const { settings, loading, error, setSettings } = useSettingsStore();
    // The original code was essentially initializing local state with mock data.

    const updatedMockSettings = {
      ...mockSettings,
      badgeColor: '#3b82f6',
    };

    setSettings(updatedMockSettings);
    setFormData(prev => ({ ...prev, ...updatedMockSettings }));
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <SeoSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SocialSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <ContentSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

        <TabsContent value="ads" className="mt-6">
          <AdsSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedSettings formData={formData} handleInputChange={handleInputChange} />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Settings;