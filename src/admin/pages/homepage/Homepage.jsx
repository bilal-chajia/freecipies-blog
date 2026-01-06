/**
 * Homepage Configuration
 * 
 * 2-panel Gutenberg-style layout using HomepageLayout wrapper
 * Each section is a separate component with unified SectionCard styling
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useHomepageStore } from '../../store/useStore';
import { HomepageLayout } from '@/components/homepage';
import {
  HeroSection,
  FeaturedSection,
  CategoriesSection,
  LatestSection,
  PopularSection,
  NewsletterSection,
  BannersSection,
  SeoSection
} from './sections';
import { toast } from 'sonner';

const Homepage = () => {
  const { section = 'hero' } = useParams();
  const { homepage, loading, error, setHomepage } = useHomepageStore();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    // Hero Section
    hero: {
      enabled: true,
      title: 'Welcome to Our Blog',
      subtitle: 'Discover amazing recipes and cooking tips',
      backgroundImage: '',
      backgroundColor: '#f8fafc',
      ctaText: 'Explore Recipes',
      ctaLink: '/articles?type=recipe',
      showSearch: true,
    },
    // Featured Posts
    featuredPosts: {
      enabled: true,
      title: 'Featured Articles',
      subtitle: 'Handpicked content for you',
      displayType: 'grid',
      maxPosts: 6,
      categoryFilter: 'all',
      tagFilter: 'all',
      sortBy: 'published_at',
      sortOrder: 'desc',
    },
    // Categories
    categories: {
      enabled: true,
      title: 'Browse by Category',
      subtitle: 'Find what interests you most',
      displayType: 'grid',
      maxCategories: 8,
      showPostCount: true,
      showDescription: false,
    },
    // Latest Posts
    latestPosts: {
      enabled: true,
      title: 'Latest Posts',
      subtitle: 'Stay updated with our newest content',
      maxPosts: 12,
      showExcerpt: true,
      showAuthor: true,
      showDate: true,
      showViews: false,
    },
    // Popular Posts
    popularPosts: {
      enabled: true,
      title: 'Most Popular',
      subtitle: 'What everyone is reading',
      maxPosts: 6,
      timeRange: '30d',
      showViews: true,
      showExcerpt: false,
    },
    // Newsletter
    newsletter: {
      enabled: true,
      title: 'Stay Updated',
      subtitle: 'Get the latest recipes delivered to your inbox',
      description: 'Subscribe for weekly recipes and tips.',
      buttonText: 'Subscribe Now',
      placeholderText: 'Enter your email address',
      successMessage: 'Thank you for subscribing!',
      privacyText: 'We respect your privacy.',
    },
    // Banners
    banners: {
      enabled: false,
      banner1: {
        enabled: false,
        title: '',
        description: '',
        image: '',
        link: '',
        buttonText: 'Learn More',
        position: 'top',
        size: 'large',
      },
      banner2: {
        enabled: false,
        title: '',
        description: '',
        image: '',
        link: '',
        buttonText: 'Learn More',
        position: 'middle',
        size: 'medium',
      },
    },
    // SEO
    seo: {
      metaTitle: 'Homepage - Delicious Recipes & Cooking Tips',
      metaDescription: 'Discover amazing recipes and cooking tips.',
      canonicalUrl: '',
      ogImage: '',
    },
  });

  // Load homepage settings
  useEffect(() => {
    if (homepage && Object.keys(homepage).length > 0) {
      setFormData(prev => ({ ...prev, ...homepage }));
    }
  }, [homepage]);

  const handleNestedInputChange = (sectionKey, field, value) => {
    setFormData(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setHomepage(formData);
      toast.success('Homepage configuration saved');
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (homepage && Object.keys(homepage).length > 0) {
      setFormData(prev => ({ ...prev, ...homepage }));
      toast.success('Changes reverted');
    }
  };

  const sectionStatus = [
    { key: 'hero', label: 'Hero', enabled: formData.hero.enabled },
    { key: 'featured', label: 'Featured', enabled: formData.featuredPosts.enabled },
    { key: 'categories', label: 'Categories', enabled: formData.categories.enabled },
    { key: 'latest', label: 'Latest', enabled: formData.latestPosts.enabled },
    { key: 'popular', label: 'Popular', enabled: formData.popularPosts.enabled },
    { key: 'newsletter', label: 'Newsletter', enabled: formData.newsletter.enabled },
    { key: 'banners', label: 'Banners', enabled: formData.banners.enabled },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>Error loading homepage settings: {error}</p>
      </div>
    );
  }

  // Render active section
  const renderSection = () => {
    const props = { formData, handleNestedInputChange };

    switch (section) {
      case 'hero':
        return <HeroSection {...props} />;
      case 'featured':
        return <FeaturedSection {...props} />;
      case 'categories':
        return <CategoriesSection {...props} />;
      case 'latest':
        return <LatestSection {...props} />;
      case 'popular':
        return <PopularSection {...props} />;
      case 'newsletter':
        return <NewsletterSection {...props} />;
      case 'banners':
        return <BannersSection {...props} />;
      case 'seo':
        return <SeoSection {...props} />;
      default:
        return <HeroSection {...props} />;
    }
  };

  return (
    <HomepageLayout
      activeSection={section}
      sectionStatus={sectionStatus}
      onSave={handleSave}
      onReset={handleReset}
      onPreview={() => window.open('/', '_blank')}
      saving={saving}
      saveLabel="Publish"
    >
      {renderSection()}
    </HomepageLayout>
  );
};

export default Homepage;
