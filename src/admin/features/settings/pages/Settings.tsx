import React, { useState, useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../../../store/useStore';
import { SettingsLayout } from '@admin/features/settings/components';
import {
  GutenbergTabsList,
  GutenbergTabsTrigger as GutenbergTabsTriggerBase
} from '@admin/features/settings/components/GutenbergTabs';

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
import AISettings, { aiSettingsTabs } from './tabs/AISettings';
import { toast } from 'sonner';
import type { MenuDocument, MenuLocation } from '@modules/menus/types/menus.types';

type MainSettingsTab =
  | 'general'
  | 'seo'
  | 'email'
  | 'social'
  | 'content'
  | 'menus'
  | 'ads'
  | 'appearance'
  | 'advanced'
  | 'media'
  | 'ai';

interface SettingsSubTab {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SettingsFormData {
  [key: string]: unknown;
  menu_header: MenuDocument;
  menu_footer: MenuDocument;
  menu_mobile: MenuDocument;
  menu_sidebar: MenuDocument;
  tocEnabled: boolean;
  tocNumbering: boolean;
  tocCollapsible: boolean;
  tocDefaultOpen: boolean;
  tocShowJumpButton: boolean;
  tocAccentColor: string;
  tocMaxDepth: number;
}

interface RegisteredActions {
  isSaving?: boolean;
  hasChanges?: boolean;
  onSave?: () => void | Promise<void>;
  onReset?: () => void;
}

interface SettingsApiResponse {
  menu_header?: MenuDocument;
  menu_footer?: MenuDocument;
  menu_mobile?: MenuDocument;
  menu_sidebar?: MenuDocument;
  toc?: {
    enabled?: boolean;
    numbering?: boolean;
    collapsible?: boolean;
    default_open?: boolean;
    defaultOpen?: boolean;
    show_jump_button?: boolean;
    showJumpButton?: boolean;
    accent_color?: string;
    accentColor?: string;
    max_depth?: number;
    maxDepth?: number;
  };
}

const GutenbergTabsTrigger = GutenbergTabsTriggerBase as React.ComponentType<{
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  currentValue: string;
  onValueChange: React.Dispatch<React.SetStateAction<string>>;
  children: ReactNode;
}>;

// Map main tabs to their sub-tabs config
const subTabsConfig: Partial<Record<MainSettingsTab, SettingsSubTab[]>> = {
  general: generalSettingsTabs,
  seo: seoSettingsTabs,
  menus: menuSettingsTabs,
  advanced: advancedSettingsTabs,
  ai: aiSettingsTabs,
  // Other tabs don't have sub-tabs
};

const emptyMenuDocument = (location: MenuLocation): MenuDocument => ({
  location,
  is_enabled: true,
  fallback_to: location === 'mobile' ? 'header' : null,
  items: [],
});

const Settings = () => {
  const { tab = 'general' } = useParams<{ tab?: MainSettingsTab }>();
  const { settings, loading, error, setSettings } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [mediaActions, setMediaActions] = useState<RegisteredActions | null>(null);
  const [aiActions, setAiActions] = useState<RegisteredActions | null>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null); // Custom header buttons from child tabs

  // Sub-tab state - get default from config or use first tab
  const currentSubTabs = subTabsConfig[tab] || [];
  const [subTab, setSubTab] = useState(currentSubTabs[0]?.value || '');

  // Reset subTab when main tab changes
  useEffect(() => {
    const newSubTabs = subTabsConfig[tab] || [];
    setSubTab(newSubTabs[0]?.value || '');
  }, [tab]);

  const [formData, setFormData] = useState<SettingsFormData>({
    // General Settings
    siteName: 'SaaS Blog',
    siteDescription: 'Delicious recipes and cooking tips',
    siteUrl: 'https://recipes-saas.com',
    adminEmail: 'admin@recipes-saas.com',
    timezone: 'America/Toronto',
    language: 'en',

    // Appearance Settings
    badgeColor: 'hsl(var(--primary))',

    // TOC Settings
    tocEnabled: true,
    tocNumbering: true,
    tocCollapsible: true,
    tocDefaultOpen: true,
    tocShowJumpButton: true,
    tocAccentColor: 'hsl(var(--primary))',
    tocMaxDepth: 4,

    // SEO Settings
    defaultMetaTitle: 'SaaS Blog - Delicious Recipes & Cooking Tips',
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

    // Menu Settings - canonical menu documents
    menu_header: emptyMenuDocument('header'),
    menu_footer: emptyMenuDocument('footer'),
    menu_mobile: emptyMenuDocument('mobile'),
    menu_sidebar: emptyMenuDocument('sidebar'),
  });

  // Load settings on mount
  useEffect(() => {
    const mockSettings = {
      siteName: 'SaaS Blog',
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
      badgeColor: 'hsl(var(--primary))',
    };

    setSettings(updatedMockSettings);
    setFormData(prev => ({ ...prev, ...updatedMockSettings }));

    // Load menu settings from API
    fetch('/api/settings/menus')
      .then(res => res.json())
      .then((data: SettingsApiResponse) => {
        if (data.menu_header || data.menu_footer || data.menu_mobile || data.menu_sidebar) {
          setFormData(prev => ({
            ...prev,
            ...(data.menu_header && { menu_header: data.menu_header }),
            ...(data.menu_footer && { menu_footer: data.menu_footer }),
            ...(data.menu_mobile && { menu_mobile: data.menu_mobile }),
            ...(data.menu_sidebar && { menu_sidebar: data.menu_sidebar }),
          }));
        }
      })
      .catch(() => toast.error('Failed to load menus'));

    // Load appearance settings from API (TOC settings)
    fetch('/api/settings/appearance')
      .then(res => res.json())
      .then((data: SettingsApiResponse) => {
        if (data.toc) {
          const toc = data.toc;
          setFormData(prev => ({
            ...prev,
            tocEnabled: toc.enabled ?? true,
            tocNumbering: toc.numbering ?? true,
            tocCollapsible: toc.collapsible ?? true,
            tocDefaultOpen: toc.default_open ?? toc.defaultOpen ?? true,
            tocShowJumpButton: toc.show_jump_button ?? toc.showJumpButton ?? true,
            tocAccentColor: toc.accent_color ?? toc.accentColor ?? 'hsl(var(--primary))',
            tocMaxDepth: toc.max_depth ?? toc.maxDepth ?? 4,
          }));
        }
      })
      .catch(() => toast.error('Failed to load appearance settings'));
  }, [setSettings]);



  const handleInputChange = (field: string, value: unknown) => {
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
            menu_header: formData.menu_header,
            menu_footer: formData.menu_footer,
            menu_mobile: formData.menu_mobile,
            menu_sidebar: formData.menu_sidebar,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save menu settings');
        }
      }

      // Save appearance settings to API if on appearance tab
      if (tab === 'appearance') {
        const response = await fetch('/api/settings/appearance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toc: {
              enabled: formData.tocEnabled,
              numbering: formData.tocNumbering,
              collapsible: formData.tocCollapsible,
              default_open: formData.tocDefaultOpen,
              show_jump_button: formData.tocShowJumpButton,
              accent_color: formData.tocAccentColor,
              max_depth: formData.tocMaxDepth,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save appearance settings');
        }
      }

      // For other settings, use the store (TODO: add more API endpoints)
      setSettings(formData);
      setSaveStatus('success');

      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      toast.error('Failed to save settings');
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
      case 'ai':
        return <AISettings {...props} onRegisterActions={setAiActions} />;
      default:
        return <GeneralSettings {...props} />;
    }
  };

  // Determine if this is the media or AI tab (special buttons)
  const isMediaTab = tab === 'media';
  const isAiTab = tab === 'ai';

  const aiSaving = aiActions?.isSaving ?? false;
  const aiHasChanges = aiActions?.hasChanges ?? false;
  const aiOnSave = aiActions?.onSave;

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
      onSave={
        isMediaTab
          ? mediaActions?.onSave
          : isAiTab
            ? aiOnSave || handleSave
            : handleSave
      }
      saving={isMediaTab ? mediaActions?.isSaving : isAiTab ? aiSaving : saving}
      saveDisabled={
        (isMediaTab && !mediaActions?.hasChanges) ||
        (isAiTab && !aiHasChanges)
      }
      saveLabel={
        isMediaTab
          ? (mediaActions?.isSaving ? 'Saving...' : 'Save')
          : isAiTab
            ? (aiSaving ? 'Saving...' : 'Save')
            : 'Save'
      }
      showResetButton={isMediaTab}
      onReset={mediaActions?.onReset}
      hasChanges={
        isMediaTab ? mediaActions?.hasChanges : isAiTab ? aiHasChanges : true
      }
    >
      {renderTabContent()}
    </SettingsLayout>
  );
};

export default Settings;
