import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Save, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { motion, AnimatePresence } from 'framer-motion';
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
import ImageUploadSettings from './tabs/ImageUploadSettings';

const Settings = () => {
  const { settings, loading, error, setSettings } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', or null
  const [mediaActions, setMediaActions] = useState(null);
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

  const { tab = 'general' } = useParams();

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
      toast.success('Settings updated successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-64 bg-muted rounded-md" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-xl" />
        </div>
        <div className="h-12 w-full bg-muted rounded-xl" />
        <div className="h-96 w-full bg-muted rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 flex items-center gap-3">
        <AlertCircle className="w-5 h-5" />
        <p className="font-medium">Error loading settings: {error}</p>
      </div>
    );
  }

  // Map tab param to component
  const renderTabContent = () => {
    const props = { formData, handleInputChange };
    
    switch (tab) {
      case 'general':
        return <GeneralSettings {...props} />;
      case 'seo':
        return <SeoSettings {...props} />;
      case 'email':
        return <EmailSettings {...props} />;
      case 'social':
        return <SocialSettings {...props} />;
      case 'content':
        return <ContentSettings {...props} />;
      case 'ads':
        return <AdsSettings {...props} />;
      case 'appearance':
        return <AppearanceSettings {...props} />;
      case 'advanced':
        return <AdvancedSettings {...props} />;
      case 'media':
        return <ImageUploadSettings onRegisterActions={setMediaActions} />;
      default:
        return <GeneralSettings {...props} />;
    }
  };

  // Get tab title for header
  const getTabTitle = () => {
    const titles = {
      general: 'General',
      seo: 'SEO',
      email: 'Email',
      social: 'Social',
      content: 'Content',
      ads: 'Ads',
      appearance: 'Appearance',
      advanced: 'Advanced',
      media: 'Media & Uploads',
    };
    return titles[tab] || 'General';
  };

  return (
    <div>
      {/* Header Area */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-border/40">
        <div>
          <h1 className="text-lg font-semibold">{getTabTitle()} Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your application preferences
          </p>
        </div>
        {tab === 'media' ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={mediaActions?.onReset}
              disabled={!mediaActions || mediaActions.isSaving}
              className="h-8 px-4 gap-1.5 text-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={mediaActions?.onSave}
              disabled={!mediaActions || mediaActions.isSaving || !mediaActions.hasChanges}
              className="h-8 px-4 gap-1.5 text-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {mediaActions?.isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="h-8 px-4 gap-1.5 text-sm"
          >
            {saving ? (
              <Zap className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Settings;
