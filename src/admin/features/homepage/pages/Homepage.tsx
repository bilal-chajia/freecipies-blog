/**
 * Homepage Configuration
 *
 * Persists the canonical homepage_settings payload through
 * GET/PUT /api/settings/homepage.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
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
  QuickFiltersSection,
  SeasonalSpotlightSection,
  SocialProofSection,
  SocialFeedSection,
  LeadMagnetSection,
  SeoSection,
} from './sections';
import { toast } from 'sonner';
import { pinFaqLast } from '@admin/features/homepage/utils/faq-items';
import type { HomepageFormData } from '../types';
import {
  HOMEPAGE_ADMIN_SETTINGS_DEFAULTS,
  type HomepageAdminSection,
  type HomepageResolvedImageSnapshot,
  type PageSeoSettings,
} from '@modules/settings/types/settings.types';

interface HomepageSettingsResponse {
  success: boolean;
  data: {
    homepage: HomepageFormData;
  };
}

type AdminAxiosRequestConfig = AxiosRequestConfig & {
  skipAdminCache?: boolean;
};

const cloneHomepageImage = (
  image: HomepageResolvedImageSnapshot | null,
): HomepageResolvedImageSnapshot | null => (
  image
    ? {
      ...image,
      focal_point: image.focal_point ? { ...image.focal_point } : undefined,
      variants: {
        sm: { ...image.variants.sm },
        md: { ...image.variants.md },
        lg: { ...image.variants.lg },
      },
    }
    : null
);

const cloneSettings = (settings: HomepageFormData): HomepageFormData => ({
  seo: { ...settings.seo },
  sections: pinFaqLast(settings.sections).map((section) => (
    section.type === 'faq'
      ? { ...section, items: section.items.map((item) => ({ ...item })) }
      : section.type === 'quick_filters'
        ? { ...section, filters: section.filters.map((filter) => ({ ...filter })) }
        : section.type === 'seasonal_spotlight'
          ? {
            ...section,
            image: cloneHomepageImage(section.image),
            cta: { ...section.cta },
          }
            : section.type === 'social_proof'
            ? {
              ...section,
              stats: section.stats.map((stat) => ({ ...stat })),
              testimonials: section.testimonials.map((testimonial) => ({ ...testimonial })),
              logos: section.logos.map((logo) => ({
                ...logo,
                image: cloneHomepageImage(logo.image),
              })),
            }
            : section.type === 'social_feed'
              ? {
                ...section,
                items: section.items.map((item) => ({
                  ...item,
                  image: cloneHomepageImage(item.image),
                })),
              }
              : section.type === 'lead_magnet'
                ? {
                  ...section,
                  image: cloneHomepageImage(section.image),
                  cta: { ...section.cta },
                }
                : { ...section }
  )),
});

const createDefaultSettings = (): HomepageFormData => cloneSettings(HOMEPAGE_ADMIN_SETTINGS_DEFAULTS);

const Homepage = () => {
  const { section = 'hero' } = useParams();
  const [formData, setFormData] = useState<HomepageFormData>(() => createDefaultSettings());
  const [lastSaved, setLastSaved] = useState<HomepageFormData>(() => createDefaultSettings());
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

  const updateSection = useCallback((id: string, updater: (section: HomepageAdminSection) => HomepageAdminSection) => {
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
    const labels = new Map<string, string>([
      ['stories', 'Stories'],
      ['hero', 'Hero'],
      ['quick_filters', 'Quick Filters'],
      ['featured', 'Featured'],
      ['categories', 'Categories'],
      ['collections', 'Collections'],
      ['seasonal_spotlight', 'Seasonal Spotlight'],
      ['latest', 'Latest'],
      ['social_proof', 'Social Proof'],
      ['social_feed', 'Social Feed'],
      ['about', 'Author'],
      ['lead_magnet', 'Lead Magnet'],
      ['newsletter', 'Newsletter'],
      ['faq', 'FAQ'],
    ]);
    const editable = formData.sections
      .filter((item) => item.id !== 'stories')
      .map((item) => ({
        key: item.id,
        label: labels.get(item.id) ?? item.id,
        enabled: item.enabled,
      }));
    return [...editable, { key: 'seo', label: 'SEO', enabled: true }];
  }, [formData.sections]);

  const reorderSections = useCallback((activeId: string, overId: string) => {
    if (activeId === 'faq' || overId === 'faq') return;
    setFormData((prev) => {
      const ids = prev.sections.map((s) => s.id);
      const from = ids.indexOf(activeId);
      const to = ids.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return prev;
      return { ...prev, sections: arrayMove(prev.sections, from, to) };
    });
  }, []);

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
      case 'quick_filters':
        return <QuickFiltersSection {...props} />;
      case 'seasonal_spotlight':
        return <SeasonalSpotlightSection {...props} />;
      case 'social_proof':
        return <SocialProofSection {...props} />;
      case 'social_feed':
        return <SocialFeedSection {...props} />;
      case 'lead_magnet':
        return <LeadMagnetSection {...props} />;
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
      onReorderSections={reorderSections}
      saving={saving}
      saveLabel="Publish"
    >
      {renderSection()}
    </HomepageLayout>
  );
};

export default Homepage;
