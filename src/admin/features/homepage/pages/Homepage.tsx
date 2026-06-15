/**
 * Homepage Configuration
 *
 * Persists the canonical homepage_settings payload through
 * GET/PUT /api/settings/homepage.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@admin/services/api-client';
import type { AxiosRequestConfig } from 'axios';
import { HomepageLayout } from '@admin/features/homepage/components';
import {
  HeroSection,
  FeaturedSection,
  CategoriesSection,
  CollectionsSection,
  LatestSection,
  AboutSection,
  NewsletterSection,
  FaqSection,
  SeoSection,
} from './sections';
import { toast } from 'sonner';
import {
  DEFAULT_HOME_SECTIONS,
  HOMEPAGE_SETTINGS_DEFAULTS,
  type HomepageSection,
  type HomepageSettings,
  type PageSeoSettings,
} from '@modules/settings/types/settings.types';

interface HomepageSettingsResponse {
  success: boolean;
  data: {
    homepage: HomepageSettings;
  };
}

type AdminAxiosRequestConfig = AxiosRequestConfig & {
  skipAdminCache?: boolean;
};

const cloneSettings = (settings: HomepageSettings): HomepageSettings => ({
  seo: { ...settings.seo },
  sections: settings.sections.map((section) => ({ ...section })),
});

const createDefaultSettings = (): HomepageSettings => cloneSettings({
  ...HOMEPAGE_SETTINGS_DEFAULTS,
  sections: DEFAULT_HOME_SECTIONS,
});

const Homepage = () => {
  const { section = 'hero' } = useParams();
  const [formData, setFormData] = useState<HomepageSettings>(() => createDefaultSettings());
  const [lastSaved, setLastSaved] = useState<HomepageSettings>(() => createDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHomepage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<HomepageSettingsResponse>('/settings/homepage', {
        skipAdminCache: true,
      } as AdminAxiosRequestConfig);
      const loaded = response.data.data.homepage;
      const cloned = cloneSettings(loaded);
      setFormData(cloned);
      setLastSaved(cloneSettings(cloned));
    } catch (err) {
      console.error('Failed to load homepage settings:', err);
      setError('Failed to load homepage settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomepage();
  }, [loadHomepage]);

  const updateSection = useCallback((id: string, updater: (section: HomepageSection) => HomepageSection) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((item) => (item.id === id ? updater(item) : item)),
    }));
  }, []);

  const updateSeo = useCallback((patch: Partial<PageSeoSettings>) => {
    setFormData((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        ...patch,
      },
    }));
  }, []);

  const sectionStatus = useMemo(() => {
    const byId = new Map(formData.sections.map((item) => [item.id, item.enabled]));
    return [
      { key: 'hero', label: 'Hero', enabled: byId.get('hero') ?? false },
      { key: 'featured', label: 'Featured', enabled: byId.get('featured') ?? false },
      { key: 'categories', label: 'Categories', enabled: byId.get('categories') ?? false },
      { key: 'collections', label: 'Collections', enabled: byId.get('collections') ?? false },
      { key: 'latest', label: 'Latest', enabled: byId.get('latest') ?? false },
      { key: 'about', label: 'Author', enabled: byId.get('about') ?? false },
      { key: 'newsletter', label: 'Newsletter', enabled: byId.get('newsletter') ?? false },
      { key: 'faq', label: 'FAQ', enabled: byId.get('faq') ?? false },
    ];
  }, [formData.sections]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put<HomepageSettingsResponse>('/settings/homepage', formData);
      const updated = response.data.data.homepage;
      setFormData(cloneSettings(updated));
      setLastSaved(cloneSettings(updated));
      toast.success('Homepage configuration saved');
    } catch (err) {
      console.error('Failed to save homepage settings:', err);
      toast.error('Failed to save homepage configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(cloneSettings(lastSaved));
    toast.success('Changes reverted');
  };

  const props = { formData, updateSection, updateSeo };

  const renderSection = () => {
    switch (section) {
      case 'hero':
        return <HeroSection {...props} />;
      case 'featured':
        return <FeaturedSection {...props} />;
      case 'categories':
        return <CategoriesSection {...props} />;
      case 'collections':
        return <CollectionsSection {...props} />;
      case 'latest':
        return <LatestSection {...props} />;
      case 'about':
        return <AboutSection {...props} />;
      case 'newsletter':
        return <NewsletterSection {...props} />;
      case 'faq':
        return <FaqSection {...props} />;
      case 'seo':
        return <SeoSection {...props} />;
      default:
        return <HeroSection {...props} />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        <p>{error}</p>
        <button type="button" className="mt-3 text-sm underline" onClick={() => void loadHomepage()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <HomepageLayout
      activeSection={section}
      sectionStatus={sectionStatus}
      onSave={handleSave}
      onReset={handleReset}
      onPreview={() => window.open('/', '_blank', 'noopener,noreferrer')}
      saving={saving}
      saveLabel="Publish"
    >
      {renderSection()}
    </HomepageLayout>
  );
};

export default Homepage;
