import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../../store/useStore';
import { SettingsLayout } from '@/components/settings';
import {
  GutenbergTabsList,
  GutenbergTabsTrigger
} from '@/components/settings/GutenbergTabs';

// Import Tab Components and their tab configs
import GeneralSettings, { generalSettingsTabs } from './tabs/GeneralSettings';
import SeoSettings, { seoSettingsTabs } from './tabs/SeoSettings';
import EmailSettings from './tabs/EmailSettings';
import SocialSettings from './tabs/SocialSettings';
import ContentSettings from './tabs/ContentSettings';
import MenuSettings, { menuSettingsTabs } from './tabs/MenuSettings';
import AdsSettings from './tabs/AdsSettings';
import AppearanceSettings from './tabs/AppearanceSettings';
import AdvancedSettings, { advancedSettingsTabs } from './tabs/AdvancedSettings';
import ImageUploadSettings from './tabs/ImageUploadSettings';

// Map main tabs to their sub-tabs config
const subTabsConfig = {
  general: generalSettingsTabs,
  seo: seoSettingsTabs,
  menus: menuSettingsTabs,
  advanced: advancedSettingsTabs,
  // Other tabs don't have sub-tabs
};

const Settings = () => {
  const { tab = 'general' } = useParams();
  const { settings, loading, error, setSettings } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [mediaActions, setMediaActions] = useState(null);
  const [headerActions, setHeaderActions] = useState(null); // Custom header buttons from child tabs

  // Sub-tab state - get default from config or use first tab
  const currentSubTabs = subTabsConfig[tab] || [];
  const [subTab, setSubTab] = useState(currentSubTabs[0]?.value || '');

  // Reset subTab when main tab changes
  useEffect(() => {
    const newSubTabs = subTabsConfig[tab] || [];
    setSubTab(newSubTabs[0]?.value || '');
  }, [tab]);

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

    // Menu Settings - Mega Menu Structure
    headerMenu: [
      {
        id: 'menu-1',
        label: 'Recipes',
        type: 'mega',
        columns: [
          {
            id: 'col-1',
            title: 'By Course',
            links: [
              { id: 'link-1', label: 'Breakfast', url: '/recipes/breakfast' },
              { id: 'link-2', label: 'Lunch', url: '/recipes/lunch' },
              { id: 'link-3', label: 'Dinner', url: '/recipes/dinner' },
              { id: 'link-4', label: 'Desserts', url: '/recipes/desserts' },
            ]
          },
          {
            id: 'col-2',
            title: 'By Diet',
            links: [
              { id: 'link-5', label: 'Vegetarian', url: '/recipes/vegetarian' },
              { id: 'link-6', label: 'Vegan', url: '/recipes/vegan' },
              { id: 'link-7', label: 'Keto', url: '/recipes/keto' },
              { id: 'link-8', label: 'Gluten-Free', url: '/recipes/gluten-free' },
            ]
          },
          {
            id: 'col-3',
            title: 'Quick & Easy',
            links: [
              { id: 'link-9', label: '15-Minute Meals', url: '/recipes/quick' },
              { id: 'link-10', label: 'One-Pot Recipes', url: '/recipes/one-pot' },
              { id: 'link-11', label: 'Budget Friendly', url: '/recipes/budget' },
            ]
          },
        ],
        featured: {
          enabled: true,
          title: 'Recipe of the Week',
          image: '/images/featured-recipe.jpg',
          url: '/recipes/featured',
          description: 'Try our delicious Lemon Garlic Chicken!',
        }
      },
      {
        id: 'menu-2',
        label: 'Categories',
        type: 'mega',
        columns: [
          {
            id: 'col-4',
            title: 'Cuisine',
            links: [
              { id: 'link-12', label: 'Italian', url: '/categories/italian' },
              { id: 'link-13', label: 'Mexican', url: '/categories/mexican' },
              { id: 'link-14', label: 'Asian', url: '/categories/asian' },
              { id: 'link-15', label: 'French', url: '/categories/french' },
            ]
          },
          {
            id: 'col-5',
            title: 'Ingredients',
            links: [
              { id: 'link-16', label: 'Chicken', url: '/ingredients/chicken' },
              { id: 'link-17', label: 'Beef', url: '/ingredients/beef' },
              { id: 'link-18', label: 'Seafood', url: '/ingredients/seafood' },
              { id: 'link-19', label: 'Vegetables', url: '/ingredients/vegetables' },
            ]
          },
        ],
      },
      {
        id: 'menu-3',
        label: 'About',
        type: 'link',
        url: '/about',
      },
      {
        id: 'menu-4',
        label: 'Contact',
        type: 'link',
        url: '/contact',
        highlight: true,
      },
    ],
    footerMenu: [
      { id: 'footer-1', label: 'Privacy Policy', type: 'link', url: '/privacy' },
      { id: 'footer-2', label: 'Terms of Service', type: 'link', url: '/terms' },
      { id: 'footer-3', label: 'Contact Us', type: 'link', url: '/contact' },
      { id: 'footer-4', label: 'Sitemap', type: 'link', url: '/sitemap' },
    ],
  });

  // Load settings on mount
  useEffect(() => {
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
      googleAdSense: formData.googleAdSense,
      ezoic: formData.ezoic,
      hbAgency: formData.hbAgency,
      customAds: formData.customAds,
      adSettings: formData.adSettings,
    };

    const updatedMockSettings = {
      ...mockSettings,
      badgeColor: '#3b82f6',
    };

    setSettings(updatedMockSettings);
    setFormData(prev => ({ ...prev, ...updatedMockSettings }));

    // Load menu settings from API
    fetch('/api/settings/menus')
      .then(res => res.json())
      .then(data => {
        if (data.headerMenu || data.footerMenu) {
          setFormData(prev => ({
            ...prev,
            ...(data.headerMenu && { headerMenu: data.headerMenu }),
            ...(data.footerMenu && { footerMenu: data.footerMenu }),
          }));
        }
      })
      .catch(err => console.error('Failed to load menus:', err));
  }, [setSettings]);



  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus(null);

      // Save menu settings to API if on menus tab
      if (tab === 'menus') {
        const response = await fetch('/api/settings/menus', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headerMenu: formData.headerMenu,
            footerMenu: formData.footerMenu,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save menu settings');
        }
      }

      // For other settings, use the store (TODO: add more API endpoints)
      setSettings(formData);
      setSaveStatus('success');

      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-6">
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
      <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 flex items-center gap-3 m-6">
        <AlertCircle className="w-5 h-5" />
        <p className="font-medium">Error loading settings: {error}</p>
      </div>
    );
  }

  // Map tab param to component
  const renderTabContent = () => {
    // Add setHeaderActions to props
    const props = {
      formData,
      handleInputChange,
      activeSection: subTab,
      setHeaderActions // Enable tabs to set custom header buttons
    };

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
      case 'menus':
        return <MenuSettings {...props} />;
      case 'ads':
        return <AdsSettings {...props} />;
      case 'appearance':
        return <AppearanceSettings {...props} />;
      case 'advanced':
        return <AdvancedSettings {...props} />;
      case 'media':
        // Media tab handles actions differently
        return <ImageUploadSettings onRegisterActions={setMediaActions} />;
      default:
        return <GeneralSettings {...props} />;
    }
  };

  // Determine if this is the media tab (special buttons)
  const isMediaTab = tab === 'media';

  // Create header tabs JSX if current tab has sub-tabs
  const headerTabsJsx = currentSubTabs.length > 0 ? (
    <div className="structure-tabs" role="tablist">
      {currentSubTabs.map((t) => (
        <GutenbergTabsTrigger
          key={t.value}
          value={t.value}
          icon={t.icon}
          currentValue={subTab}
          onValueChange={setSubTab}
        >
          {t.label}
        </GutenbergTabsTrigger>
      ))}
    </div>
  ) : null;

  return (
    <SettingsLayout
      activeTab={tab}
      headerTabs={headerTabsJsx}
      headerActions={headerActions} // Pass custom header buttons
      onSave={isMediaTab ? mediaActions?.onSave : handleSave}
      saving={isMediaTab ? mediaActions?.isSaving : saving}
      saveDisabled={isMediaTab && !mediaActions?.hasChanges}
      saveLabel={isMediaTab && mediaActions?.isSaving ? 'Saving...' : 'Save'}
      showResetButton={isMediaTab}
      onReset={mediaActions?.onReset}
      hasChanges={isMediaTab ? mediaActions?.hasChanges : true}
    >
      {renderTabContent()}
    </SettingsLayout>
  );
};

export default Settings;
