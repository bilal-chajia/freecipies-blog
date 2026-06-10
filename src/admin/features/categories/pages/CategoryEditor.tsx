import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, FileJson } from 'lucide-react';
import { Button } from '@/ui/button';
import { articlesAPI, categoriesAPI } from '../../../services/api';
import { buildImageSlotFromMedia, generateSlug } from '../../../utils/helpers';
import { MediaDialog, ImageUploader } from '@admin/features/media/components';
import { toast } from 'sonner';
import { useCategoriesStore } from '@/store/useStore';
import BasicInfoCard from '../editor/BasicInfoCard';
import FeaturedHeroCard from '../editor/FeaturedHeroCard';
import SeoCard from '../editor/SeoCard';
import ImageSlotCard from '../editor/ImageSlotCard';
import ConfigurationCard from '../editor/ConfigurationCard';
import JsonImportDialog from '../editor/JsonImportDialog';
import {
  INITIAL_FORM_DATA,
  getErrorMessage,
  unwrapApiData,
  type ArticleRecord,
  type CategoryFormData,
  type CategoryImageTarget,
  type CategoryRecord,
} from '../editor/types';

const EXAMPLE_JSON = {
  label: 'Category Name',
  slug: 'category-slug',
  headline: 'Category Headline',
  short_description: 'Short description for the card.',
  tldr: 'Longer summary or TL;DR.',
  metaTitle: 'SEO Meta Title',
  metaDescription: 'SEO Meta Description',
  collection_title: 'Collection Title',
};

const CategoryEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [uploaderSlot, setUploaderSlot] = useState<CategoryImageTarget>('thumbnail');
  const [mediaTarget, setMediaTarget] = useState<CategoryImageTarget>('thumbnail');
  const [parentOptions, setParentOptions] = useState<CategoryRecord[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [featuredLookup, setFeaturedLookup] = useState({
    loading: false,
    error: '',
    article: null as ArticleRecord | null,
  });

  const [formData, setFormData] = useState<CategoryFormData>(INITIAL_FORM_DATA);

  // Ref to prevent duplicate API calls in React Strict Mode
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (isEditMode && !isLoadingRef.current) {
      loadCategory();
    }
    if (!parentLoading && parentOptions.length === 0) {
      loadParentOptions();
    }
  }, [slug]);

  const loadParentOptions = async () => {
    try {
      setParentLoading(true);
      const response = await categoriesAPI.getAll();
      const data = unwrapApiData<unknown>(response, []);
      setParentOptions(Array.isArray(data) ? (data as CategoryRecord[]) : []);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setParentLoading(false);
    }
  };

  const loadFeaturedArticleById = async (id: number) => {
    if (!id) return;
    setFeaturedLookup({ loading: true, error: '', article: null });
    try {
      const response = await articlesAPI.getById(id);
      const article = unwrapApiData<ArticleRecord | null>(response, null);
      if (!article?.id) {
        throw new Error('Not found');
      }
      setFeaturedLookup({ loading: false, error: '', article });
    } catch {
      toast.error('Failed to load featured article');
      setFeaturedLookup({ loading: false, error: 'Featured recipe not found', article: null });
    }
  };

  const loadCategory = async () => {
    if (!slug) return;
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const response = await categoriesAPI.getBySlug(slug);
      const category = unwrapApiData<CategoryRecord | null>(response, null);

      if (category) {
        const parsedImages = (() => {
          if (!category.images_json) return {} as Record<string, unknown>;
          try {
            return typeof category.images_json === 'string'
              ? JSON.parse(category.images_json)
              : category.images_json;
          } catch {
            return {} as Record<string, unknown>;
          }
        })();

        const presentation = (() => {
          if (!category.presentation_json) return {} as Record<string, unknown>;
          try {
            return typeof category.presentation_json === 'string'
              ? JSON.parse(category.presentation_json)
              : (category.presentation_json as Record<string, unknown>);
          } catch {
            return {} as Record<string, unknown>;
          }
        })();
        const featured = (presentation.featured_article ?? null) as { id?: number } | null;
        const heroCta = (presentation.hero_cta ?? {}) as { show?: boolean; text?: string; link?: string };

        setFormData({
          slug: category.slug || '',
          label: category.label || '',
          headline: category.headline || '',
          metaTitle: category.meta_title || '',
          metaDescription: category.meta_description || '',
          canonicalUrl: category.canonical || '',
          ogImage: category.og_image || '',
          ogTitle: category.og_title || '',
          ogDescription: category.og_description || '',
          twitterCard: category.twitter_card || 'summary_large_image',
          robots: category.robots || '',
          noIndex: category.no_index || false,
          short_description: category.short_description || '',
          tldr: (presentation.tldr as string) || '',
          imageThumbnail: (parsedImages as { thumbnail?: CategoryFormData['imageThumbnail'] })?.thumbnail || null,
          imageHero: (parsedImages as { hero?: CategoryFormData['imageHero'] })?.hero || null,
          collection_title: category.collection_title || '',
          featuredArticleId: featured?.id ?? null,
          showHeroCta: heroCta.show ?? false,
          heroCtaText: heroCta.text || '',
          heroCtaLink: heroCta.link || '',
          workflow_status: category.workflow_status || 'draft',
          is_featured: category.is_featured || category.is_favorite || false,
          displayOrder: Number.isFinite(Number(category.sort_order)) ? Number(category.sort_order) : 0,
          color: category.color || '#ff6b35ff',
          parent_id: category.parent_id ?? null,
        });

        if (typeof featured?.id === 'number') {
          loadFeaturedArticleById(featured.id);
        } else {
          setFeaturedLookup({ loading: false, error: '', article: null });
        }
      }
    } catch {
      toast.error('Failed to load category');
      setError('Failed to load category');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleChange = <K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'label' && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: generateSlug(String(value)) }));
    }
  };

  const setImageSlot = (slot: CategoryImageTarget, value: CategoryFormData['imageThumbnail']) => {
    setFormData(prev => ({ ...prev, [slot === 'hero' ? 'imageHero' : 'imageThumbnail']: value }));
  };

  const handleUploadComplete = (mediaRecord: Parameters<typeof buildImageSlotFromMedia>[0]) => {
    setFormData(prev => {
      const current = prev[uploaderSlot === 'hero' ? 'imageHero' : 'imageThumbnail'];
      const slot = buildImageSlotFromMedia(mediaRecord, {
        alt: current?.alt || prev.label || '',
        variant_keys: uploaderSlot === 'hero' ? ['sm', 'md', 'lg'] : ['xs', 'sm'],
      });
      return { ...prev, [uploaderSlot === 'hero' ? 'imageHero' : 'imageThumbnail']: slot };
    });
  };

  const handleMediaSelect = (item: Record<string, unknown>) => {
    setFormData(prev => {
      const slot = buildImageSlotFromMedia(item, {
        alt: (typeof item.alt_text === 'string' ? item.alt_text : '') || prev.label || '',
        variant_keys: mediaTarget === 'hero' ? ['sm', 'md', 'lg'] : ['xs', 'sm'],
      });
      return { ...prev, [mediaTarget === 'hero' ? 'imageHero' : 'imageThumbnail']: slot };
    });
    setMediaDialogOpen(false);
  };

  const handleAltChange = (slot: CategoryImageTarget, alt: string) => {
    setFormData(prev => {
      const key = slot === 'hero' ? 'imageHero' : 'imageThumbnail';
      const current = prev[key];
      return current ? { ...prev, [key]: { ...current, alt } } : prev;
    });
  };

  const handleSelectFeatured = (article: ArticleRecord) => {
    setFormData(prev => ({ ...prev, featuredArticleId: article.id ?? null }));
    setFeaturedLookup({ loading: false, error: '', article });
  };

  const handleClearFeatured = () => {
    setFormData(prev => ({ ...prev, featuredArticleId: null }));
    setFeaturedLookup({ loading: false, error: '', article: null });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.label || !formData.slug || !formData.short_description) {
        setError('Label, slug, and short description are required');
        setSaving(false);
        return;
      }

      const categoryData = {
        slug: formData.slug,
        label: formData.label,
        headline: formData.headline || formData.label,
        short_description: formData.short_description,
        collection_title: formData.collection_title || formData.label,
        workflow_status: formData.workflow_status,
        is_featured: formData.is_featured,
        parent_id: formData.parent_id,
        sort_order: formData.displayOrder,
        color: formData.color,
        images_json: JSON.stringify({
          ...(formData.imageThumbnail ? { thumbnail: formData.imageThumbnail } : {}),
          ...(formData.imageHero ? { hero: formData.imageHero } : {}),
        }),
        seo_json: JSON.stringify({
          meta_title: formData.metaTitle || formData.label,
          meta_description: formData.metaDescription || formData.short_description,
          canonical: formData.canonicalUrl || null,
          og_image: formData.ogImage || null,
          og_title: formData.ogTitle || null,
          og_description: formData.ogDescription || null,
          twitter_card: formData.twitterCard || 'summary_large_image',
          no_index: formData.noIndex,
        }),
        // Per-category editorial content. The client sends only the featured
        // article id (+ display hints); the SERVER builds the stored snapshot
        // from the article's card cache. Page settings (layout/paging/sorting)
        // are GLOBAL (Settings > Category Pages).
        presentation_json: JSON.stringify({
          ...(formData.featuredArticleId
            ? {
                featured_article: {
                  id: formData.featuredArticleId,
                  slug: featuredLookup.article?.slug || '',
                  title: featuredLookup.article?.title || featuredLookup.article?.label || '',
                },
              }
            : {}),
          tldr: formData.tldr || '',
          hero_cta: {
            show: !!formData.showHeroCta,
            text: formData.heroCtaText || '',
            link: formData.heroCtaLink || '',
          },
        }),
      };

      if (isEditMode) {
        await categoriesAPI.update(slug, categoryData);
      } else {
        await categoriesAPI.create(categoryData);
      }

      useCategoriesStore.getState().setCategories([]);

      navigate('/categories', { state: { refresh: Date.now() } });
    } catch (err) {
      toast.error('Failed to save category');
      setError(getErrorMessage(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleJsonImport = (rawJson: string): string | null => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return 'Expected a JSON object.';
      }

      // Only accept known form fields; ignore everything else.
      setFormData(prev => {
        const next = { ...prev };
        for (const key of Object.keys(prev) as (keyof CategoryFormData)[]) {
          if (key in parsed) {
            next[key] = parsed[key] as never;
          }
        }
        if (parsed.label && !parsed.slug && !isEditMode) {
          next.slug = generateSlug(String(parsed.label));
        }
        return next;
      });
      return null;
    } catch {
      return 'Invalid JSON format. Please check your input.';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-86">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/categories')} className="rounded-full hover:bg-muted">
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{isEditMode ? 'Edit Category' : 'New Category'}</h2>
              <p className="text-sm text-muted-foreground">{isEditMode ? `Updating ${formData.label}` : 'Create a new category'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setJsonImportOpen(true)}>
              <FileJson className="size-4 mr-2" />
              Import JSON
            </Button>
            <Button variant="outline" onClick={() => navigate('/categories')}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-8 max-w-7xl mx-auto mt-6">
        {error && (
          <div className="mb-6 bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <BasicInfoCard formData={formData} isEditMode={isEditMode} onChange={handleChange} />
            <FeaturedHeroCard
              formData={formData}
              selectedArticle={featuredLookup.article}
              selectedLoading={featuredLookup.loading}
              selectedError={featuredLookup.error}
              onSelect={handleSelectFeatured}
              onClear={handleClearFeatured}
              onChange={handleChange}
            />
            <SeoCard formData={formData} onChange={handleChange} />
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <ImageSlotCard
              slot="thumbnail"
              title="Thumbnail Image"
              accentBg="bg-purple-500/10"
              accentText="text-purple-500"
              image={formData.imageThumbnail}
              fallbackAlt={formData.label}
              onUploadClick={() => { setUploaderSlot('thumbnail'); setIsUploaderOpen(true); }}
              onLibraryClick={() => { setMediaTarget('thumbnail'); setMediaDialogOpen(true); }}
              onRemove={() => setImageSlot('thumbnail', null)}
              onAltChange={(alt) => handleAltChange('thumbnail', alt)}
            />
            <ImageSlotCard
              slot="hero"
              title="Hero Image"
              accentBg="bg-indigo-500/10"
              accentText="text-indigo-500"
              image={formData.imageHero}
              fallbackAlt={formData.label}
              onUploadClick={() => { setUploaderSlot('hero'); setIsUploaderOpen(true); }}
              onLibraryClick={() => { setMediaTarget('hero'); setMediaDialogOpen(true); }}
              onRemove={() => setImageSlot('hero', null)}
              onAltChange={(alt) => handleAltChange('hero', alt)}
            />
            <ConfigurationCard
              formData={formData}
              parentOptions={parentOptions}
              parentLoading={parentLoading}
              isEditMode={isEditMode}
              currentSlug={slug}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <JsonImportDialog
        open={jsonImportOpen}
        onOpenChange={setJsonImportOpen}
        initialJson={JSON.stringify(EXAMPLE_JSON, null, 2)}
        onImport={handleJsonImport}
      />

      <MediaDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        onSelect={handleMediaSelect}
        variantSizes={mediaTarget === 'hero' ? { sm: 640, md: 1024, lg: 1600 } : { xs: 160, sm: 320 }}
      />

      <ImageUploader
        open={isUploaderOpen}
        onOpenChange={setIsUploaderOpen}
        onUploadComplete={handleUploadComplete}
        variantSizes={uploaderSlot === 'hero' ? { sm: 640, md: 1024, lg: 1600 } : { xs: 160, sm: 320 }}
      />
    </div>
  );
};

export default CategoryEditor;
