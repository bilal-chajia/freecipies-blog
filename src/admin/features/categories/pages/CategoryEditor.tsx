import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Settings, Globe, FileJson, Layout, ImageIcon, Upload, FolderOpen } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import { articlesAPI, categoriesAPI } from '../../../services/api';
import { buildImageSlotFromMedia, generateSlug } from '../../../utils/helpers';
import { MediaDialog, ImageUploader } from '@admin/features/media/components';
import ColorPicker from '@/components/ColorPicker';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '../../../utils/helpers';
import { toast } from 'sonner';

type CategoryImageSlot = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  [key: string]: unknown;
};

type CategoryImageTarget = 'thumbnail' | 'hero';

interface CategoryFormData {
  slug: string;
  label: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  twitterCard: string;
  robots: string;
  noIndex: boolean;
  shortDescription: string;
  tldr: string;
  imageThumbnail: CategoryImageSlot | null;
  imageHero: CategoryImageSlot | null;
  image?: CategoryImageSlot | null;
  collectionTitle: string;
  numEntriesPerPage: number;
  showInNav: boolean;
  showInFooter: boolean;
  layoutMode: string;
  cardStyle: string;
  showSidebar: boolean;
  showFilters: boolean;
  showBreadcrumb: boolean;
  showPagination: boolean;
  sortBy: string;
  sortOrder: string;
  headerStyle: string;
  featuredArticleId: number | null;
  showFeaturedRecipe: boolean;
  showHeroCta: boolean;
  heroCtaText: string;
  heroCtaLink: string;
  isOnline: boolean;
  isFeatured: boolean;
  displayOrder: number;
  color: string;
  parentId: number | null;
  iconSvg: string;
}

type CategoryRecord = Partial<Omit<CategoryFormData, 'sortOrder'>> & {
  id?: number;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imagesJson?: string | Record<string, unknown> | null;
  shortDescription?: string;
  configSortOrder?: string;
  sortOrder?: string | number;
  isFavorite?: boolean;
};

interface ArticleRecord {
  id?: number;
  slug?: string;
  label?: string;
  title?: string;
}

interface ApiResponse<T> {
  data?: {
    data?: T;
  } | T;
}

function unwrapApiData<T>(response: ApiResponse<T>, fallback: T): T {
  const first = response.data;
  if (first && typeof first === 'object' && 'data' in first) {
    return (first as { data?: T }).data ?? fallback;
  }
  return (first as T | undefined) ?? fallback;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } | string } } }).response;
    const apiError = response?.data?.error;
    if (typeof apiError === 'string') return apiError;
    if (apiError?.message) return apiError.message;
  }
  return 'Failed to save category';
}

const CategoryEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [uploaderSlot, setUploaderSlot] = useState<CategoryImageTarget>('thumbnail');
  const [mediaTarget, setMediaTarget] = useState<CategoryImageTarget>('thumbnail');
  const [parentOptions, setParentOptions] = useState<CategoryRecord[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [featuredSlug, setFeaturedSlug] = useState('');
  const [featuredSearchQuery, setFeaturedSearchQuery] = useState('');
  const [featuredSearchResults, setFeaturedSearchResults] = useState<ArticleRecord[]>([]);
  const [featuredSearchLoading, setFeaturedSearchLoading] = useState(false);
  const [featuredSearchError, setFeaturedSearchError] = useState('');
  const [featuredLookup, setFeaturedLookup] = useState({
    loading: false,
    error: '',
    article: null as ArticleRecord | null,
  });
  const skipFeaturedSearchRef = useRef(false);

  const [formData, setFormData] = useState<CategoryFormData>({
    slug: '',
    label: '',
    headline: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    ogImage: '',
    ogTitle: '',
    ogDescription: '',
    twitterCard: 'summary_large_image',
    robots: '',
    noIndex: false,
    shortDescription: '',
    tldr: '',
    imageThumbnail: null,
    imageHero: null,
    collectionTitle: '',
    numEntriesPerPage: 12,
    showInNav: false,
    showInFooter: false,
    layoutMode: 'grid',
    cardStyle: 'full',
    showSidebar: true,
    showFilters: true,
    showBreadcrumb: true,
    showPagination: true,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
    headerStyle: 'hero',
    featuredArticleId: null,
    showFeaturedRecipe: true,
    showHeroCta: true,
    heroCtaText: '',
    heroCtaLink: '',
    isOnline: false,
    isFeatured: false,
    displayOrder: 0,
    color: '#ff6b35ff',
    parentId: null,
    iconSvg: '',
  });

  const exampleJson = {
    "label": "Category Name",
    "slug": "category-slug",
    "headline": "Category Headline",
    "shortDescription": "Short description for the card.",
    "tldr": "Longer summary or TL;DR.",
    "metaTitle": "SEO Meta Title",
    "metaDescription": "SEO Meta Description",
    "collectionTitle": "Collection Title",
    "numEntriesPerPage": 12,
    "image": {
      "url": "https://example.com/image.jpg",
      "alt": "Image Alt Text"
    }
  };

  // Ref to prevent duplicate API calls in React Strict Mode
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Always load the category when in edit mode
    if (isEditMode && !isLoadingRef.current) {
      loadCategory();
    }
    if (!parentLoading && parentOptions.length === 0) {
      loadParentOptions();
    }
  }, [slug]);

  useEffect(() => {
    if (!formData.showFeaturedRecipe) {
      setFeaturedSearchResults([]);
      setFeaturedSearchError('');
      return;
    }
    if (skipFeaturedSearchRef.current) {
      skipFeaturedSearchRef.current = false;
      return;
    }

    const query = featuredSearchQuery.trim();
    if (query.length < 2) {
      setFeaturedSearchResults([]);
      setFeaturedSearchError('');
      return;
    }

    let isActive = true;
    const timeout = setTimeout(async () => {
      setFeaturedSearchLoading(true);
      setFeaturedSearchError('');
      try {
        const response = await articlesAPI.getAll({
          search: query,
          type: 'recipe',
          status: 'online',
          limit: 8,
        });
        const data = unwrapApiData<unknown>(response, []);
        const items = Array.isArray(data) ? data as ArticleRecord[] : [];
        if (isActive) {
          setFeaturedSearchResults(items);
        }
      } catch (err) {
        toast.error('Failed to search recipes');
        if (isActive) {
          setFeaturedSearchResults([]);
          setFeaturedSearchError('Search failed');
        }
      } finally {
        if (isActive) {
          setFeaturedSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [featuredSearchQuery, formData.showFeaturedRecipe]);

  const loadParentOptions = async () => {
    try {
      setParentLoading(true);
      const response = await categoriesAPI.getAll();
      const data = unwrapApiData<unknown>(response, []);
      const options = Array.isArray(data) ? data as CategoryRecord[] : [];
      setParentOptions(options);
    } catch (err) {
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
      setFeaturedSlug(article.slug || '');
      skipFeaturedSearchRef.current = true;
      setFeaturedSearchQuery(article.label || article.title || article.slug || '');
    } catch (err) {
      toast.error('Failed to load featured article');
      setFeaturedLookup({ loading: false, error: 'Featured recipe not found', article: null });
    }
  };

  const loadCategory = async () => {
    if (isLoadingRef.current) return; // Prevent duplicate calls
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const response = await categoriesAPI.getBySlug(slug);
      const category = unwrapApiData<CategoryRecord | null>(response, null);

      if (category) {
        const parsedImages = (() => {
          if (!category.imagesJson) return {};
          try {
            return typeof category.imagesJson === 'string'
              ? JSON.parse(category.imagesJson)
              : category.imagesJson;
          } catch {
            return {};
          }
        })();

        const imageFromJsonThumbnail = parsedImages?.thumbnail || null;
        const imageFromJsonHero = parsedImages?.hero || null;
        const legacyImage = category.imageUrl ? {
          url: category.imageUrl,
          alt: category.imageAlt || '',
          width: category.imageWidth || null,
          height: category.imageHeight || null,
        } : null;

        setFormData({
          slug: category.slug || '',
          label: category.label || '',
          headline: category.headline || '',
          metaTitle: category.metaTitle || '',
          metaDescription: category.metaDescription || '',
          canonicalUrl: category.canonicalUrl || '',
          ogImage: category.ogImage || '',
          ogTitle: category.ogTitle || '',
          ogDescription: category.ogDescription || '',
          twitterCard: category.twitterCard || 'summary_large_image',
          robots: category.robots || '',
          noIndex: category.noIndex || false,
          shortDescription: category.shortDescription || '',
          tldr: category.tldr || '',
          // Map flat image properties back to nested object for UI
          imageThumbnail: imageFromJsonThumbnail || legacyImage,
          imageHero: imageFromJsonHero || null,
          collectionTitle: category.collectionTitle || '',
          numEntriesPerPage: category.numEntriesPerPage || 12,
          showInNav: category.showInNav || false,
          showInFooter: category.showInFooter || false,
          layoutMode: category.layoutMode || 'grid',
          cardStyle: category.cardStyle || 'full',
          showSidebar: category.showSidebar ?? true,
          showFilters: category.showFilters ?? true,
          showBreadcrumb: category.showBreadcrumb ?? true,
          showPagination: category.showPagination ?? true,
          sortBy: category.sortBy || 'publishedAt',
          sortOrder: String(category.configSortOrder || category.sortOrder || 'desc'),
          headerStyle: category.headerStyle || 'hero',
          featuredArticleId: category.featuredArticleId ?? null,
          showFeaturedRecipe: category.showFeaturedRecipe ?? true,
          showHeroCta: category.showHeroCta ?? true,
          heroCtaText: category.heroCtaText || '',
          heroCtaLink: category.heroCtaLink || '',
          isOnline: category.isOnline || false,
          isFeatured: category.isFeatured || category.isFavorite || false,
          displayOrder: Number.isFinite(Number(category.sortOrder)) ? Number(category.sortOrder) : 0,
          color: category.color || '#ff6b35ff',
          parentId: category.parentId ?? null,
          iconSvg: category.iconSvg || '',
        });

        if (typeof category.featuredArticleId === 'number') {
          loadFeaturedArticleById(category.featuredArticleId);
        } else {
          setFeaturedLookup({ loading: false, error: '', article: null });
          setFeaturedSlug('');
        }
      }
    } catch (err) {
      toast.error('Failed to load category');
      setError('Failed to load category');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleUploadComplete = (mediaRecord: unknown) => {
    setFormData(prev => {
      const slot = buildImageSlotFromMedia(mediaRecord, {
        alt: prev[uploaderSlot === 'hero' ? 'imageHero' : 'imageThumbnail']?.alt || prev.label || '',
        variant_keys: uploaderSlot === 'hero' ? ['sm', 'md', 'lg'] : ['xs', 'sm'],
      });
      return {
        ...prev,
        [uploaderSlot === 'hero' ? 'imageHero' : 'imageThumbnail']: slot,
      };
    });
  };

  const handleRemoveImage = (slot: CategoryImageTarget) => {
    setFormData(prev => ({ ...prev, [slot === 'hero' ? 'imageHero' : 'imageThumbnail']: null }));
  };

  // Handle selection from media library
  const handleMediaSelect = (item: { altText?: string } & Record<string, unknown>) => {
    setFormData(prev => {
      const slot = buildImageSlotFromMedia(item, {
        alt: item.altText || prev.label || '',
        variant_keys: mediaTarget === 'hero' ? ['sm', 'md', 'lg'] : ['xs', 'sm'],
      });

      return {
        ...prev,
        [mediaTarget === 'hero' ? 'imageHero' : 'imageThumbnail']: slot,
      };
    });
    setMediaDialogOpen(false);
  };

  const handleFeaturedLookup = async () => {
    const slugValue = featuredSlug.trim();
    if (!slugValue) {
      setFeaturedLookup({ loading: false, error: 'Enter a recipe slug', article: null });
      return;
    }

    setFeaturedLookup({ loading: true, error: '', article: null });
    try {
      const response = await articlesAPI.getBySlug(slugValue);
      const article = unwrapApiData<ArticleRecord | null>(response, null);
      if (!article?.id) {
        throw new Error('Not found');
      }
      setFormData(prev => ({ ...prev, featuredArticleId: article.id ?? null }));
      setFeaturedLookup({ loading: false, error: '', article });
      skipFeaturedSearchRef.current = true;
      setFeaturedSearchQuery(article.label || article.title || article.slug || '');
      setFeaturedSearchResults([]);
    } catch (err) {
      toast.error('Failed to lookup featured recipe');
      setFeaturedLookup({ loading: false, error: 'Recipe not found', article: null });
    }
  };

  const handleClearFeatured = () => {
    setFormData(prev => ({ ...prev, featuredArticleId: null }));
    setFeaturedLookup({ loading: false, error: '', article: null });
    setFeaturedSlug('');
    setFeaturedSearchResults([]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.label || !formData.slug || !formData.shortDescription) {
        setError('Label, slug, and short description are required');
        setSaving(false);
        return;
      }

      const {
        imageThumbnail,
        imageHero,
        displayOrder,
        numEntriesPerPage,
        showInNav,
        showInFooter,
        layoutMode,
        cardStyle,
        showSidebar,
        showFilters,
        showBreadcrumb,
        showPagination,
        sortBy,
        sortOrder,
        headerStyle,
        featuredArticleId,
        showFeaturedRecipe,
        showHeroCta,
        heroCtaText,
        heroCtaLink,
        iconSvg,
        ...restData
      } = formData;
      const categoryData = {
        ...restData,
        sortOrder: displayOrder, // Map frontend displayOrder to backend sortOrder (numeric)
        imagesJson: JSON.stringify({
          ...(imageThumbnail ? { thumbnail: imageThumbnail } : {}),
          ...(imageHero ? { hero: imageHero } : {}),
        }),
        headline: formData.headline || formData.label,
        metaTitle: formData.metaTitle || formData.label,
        metaDescription: formData.metaDescription || formData.shortDescription,
        collectionTitle: formData.collectionTitle || formData.label,
      };

      if (isEditMode) {
        await categoriesAPI.update(slug, categoryData);
      } else {
        await categoriesAPI.create(categoryData);
      }


      navigate('/categories', { state: { refresh: Date.now() } });
    } catch (err) {
      toast.error('Failed to save category');
      // Error details shown in banner above
      setError(getErrorMessage(err));
      // Force-scroll to top so the error banner is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = <K extends keyof CategoryFormData>(field: K, value: CategoryFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'label' && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: generateSlug(String(value)) }));
    }
  };

  const handleJsonImport = () => {
    try {
      setJsonError('');
      const parsed = JSON.parse(jsonInput);

      let finalData = { ...formData, ...parsed };

      // Auto-generate slug if missing in JSON but label is present, and we are creating a new category
      if (parsed.label && !parsed.slug && !isEditMode) {
        finalData.slug = generateSlug(parsed.label);
      }

      // Ensure image object structure is correct if provided
      if (parsed.image) {
        finalData.image = {
          url: parsed.image.url || null,
          alt: parsed.image.alt || '',
          width: parsed.image.width || null,
          height: parsed.image.height || null
        };
      } else {
        // Preserve existing image if not in JSON
        finalData.image = formData.image;
      }

      setFormData(finalData);

      setJsonImportOpen(false);
      setJsonInput('');
    } catch (e) {
      setJsonError('Invalid JSON format. Please check your input.');
    }
  };

  const openJsonDialog = () => {
    setJsonInput(JSON.stringify(exampleJson, null, 2));
    setJsonImportOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-86">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const thumbnailSlot = formData.imageThumbnail ? JSON.stringify({ thumbnail: formData.imageThumbnail }) : null;
  const heroSlotData = formData.imageHero ? JSON.stringify({ hero: formData.imageHero }) : null;

  const previewThumb = extractImage(thumbnailSlot, 'thumbnail', 1200);
  const previewThumbSrcSet = toAdminSrcSet(getImageSrcSet(thumbnailSlot, 'thumbnail'));
  const previewThumbUrl = toAdminImageUrl(previewThumb.imageUrl || formData.imageThumbnail?.url);
  const previewThumbAlt = formData.imageThumbnail?.alt || formData.label || '';
  const previewThumbSizes = previewThumbSrcSet ? '400px' : undefined;
  const previewThumbStyle = buildImageStyle(previewThumb);

  const previewHero = extractImage(heroSlotData, 'hero', 1200);
  const previewHeroSrcSet = toAdminSrcSet(getImageSrcSet(heroSlotData, 'hero'));
  const previewHeroUrl = toAdminImageUrl(previewHero.imageUrl || formData.imageHero?.url);
  const previewHeroAlt = formData.imageHero?.alt || formData.label || '';
  const previewHeroSizes = previewHeroSrcSet ? '400px' : undefined;
  const previewHeroStyle = buildImageStyle(previewHero);

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
            <Button variant="outline" onClick={openJsonDialog}>
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

            {/* Basic Info Card */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <Layout className="size-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Label *</Label>
                    <Input
                      value={formData.label}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('label', e.target.value)}
                      placeholder="e.g., Breakfast Recipes"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Slug *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-muted-foreground text-sm">/</span>
                      <Input
                        value={formData.slug}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('slug', e.target.value)}
                        disabled={isEditMode}
                        className="pl-6 h-8 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Headline</Label>
                  <Input
                    value={formData.headline}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('headline', e.target.value)}
                    placeholder="Catchy headline for the category page"
                    className="h-8"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Short Description *</Label>
                  <Textarea
                    value={formData.shortDescription}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('shortDescription', e.target.value)}
                    rows={3}
                    placeholder="Brief summary displayed on cards"
                    className="resize-none min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">TL;DR</Label>
                  <Textarea
                    value={formData.tldr}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('tldr', e.target.value)}
                    rows={2}
                    placeholder="Quick summary for the top of the page"
                    className="resize-none min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO Card */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <Globe className="size-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">SEO Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Meta Title</Label>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('metaTitle', e.target.value)}
                    placeholder="SEO optimized title"
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {formData.metaTitle.length}/60 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Meta Description</Label>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('metaDescription', e.target.value)}
                    rows={3}
                    placeholder="SEO optimized description"
                    className="resize-none min-h-[80px]"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {formData.metaDescription.length}/160 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Canonical URL</Label>
                  <Input
                    value={formData.canonicalUrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('canonicalUrl', e.target.value)}
                    placeholder="https://example.com/categories/breakfast"
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">OG Image URL</Label>
                    <Input
                      value={formData.ogImage}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('ogImage', e.target.value)}
                      placeholder="https://cdn.example.com/og-image.jpg"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">OG Title</Label>
                    <Input
                      value={formData.ogTitle}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('ogTitle', e.target.value)}
                      placeholder="Social share title"
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">OG Description</Label>
                  <Textarea
                    value={formData.ogDescription}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('ogDescription', e.target.value)}
                    rows={2}
                    placeholder="Social share description"
                    className="resize-none min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Twitter Card</Label>
                    <Select
                      value={formData.twitterCard}
                      onValueChange={(value: string) => handleChange('twitterCard', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">summary</SelectItem>
                        <SelectItem value="summary_large_image">summary_large_image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Robots</Label>
                    <Input
                      value={formData.robots}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('robots', e.target.value)}
                      placeholder="e.g., noindex,nofollow"
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">No Index</p>
                    <p className="text-xs text-muted-foreground">Hide from search engines</p>
                  </div>
                  <Switch
                    checked={formData.noIndex}
                    onCheckedChange={(checked: boolean) => handleChange('noIndex', checked)}
                  />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">

            {/* Thumbnail Image Card */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50 overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/10 rounded-md">
                    <ImageIcon className="w-4 h-4 text-purple-500" />
                  </div>
                  <CardTitle className="text-base">Thumbnail Image</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {previewThumbUrl ? (
                  <div className="relative group">
                    <img
                      src={previewThumbUrl}
                      alt={previewThumbAlt}
                      width={previewThumb.imageWidth || 1200}
                      height={previewThumb.imageHeight || 675}
                      srcSet={previewThumbSrcSet || undefined}
                      sizes={previewThumbSizes}
                      className="w-full aspect-video object-cover transition-opacity"
                      style={previewThumbStyle}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8"
                        onClick={() => { setUploaderSlot('thumbnail'); setIsUploaderOpen(true); }}
                      >
                        Change
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        onClick={() => handleRemoveImage('thumbnail')}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div
                      className="flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors rounded-lg py-6"
                      onClick={() => { setUploaderSlot('thumbnail'); setIsUploaderOpen(true); }}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-1 text-sm">Upload Thumbnail</h3>
                      <p className="text-[11px] text-muted-foreground mb-1 max-w-[180px]">
                        Click to open the image uploader
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or select from library</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => { setMediaTarget('thumbnail'); setMediaDialogOpen(true); }}
                      className="w-full h-8 text-xs"
                    >
                      <FolderOpen className="w-3 h-3 mr-2" />
                      Select from Library
                    </Button>
                  </div>
                )}
                <div className="p-3 space-y-2 bg-muted/10">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Alt Text</Label>
                    <Input
                      value={formData.imageThumbnail?.alt || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                        ...prev,
                        imageThumbnail: prev.imageThumbnail ? { ...prev.imageThumbnail, alt: e.target.value } : prev.imageThumbnail
                      }))}
                      placeholder="Describe the image"
                      className="h-8 text-xs"
                      disabled={!formData.imageThumbnail}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hero Image Card */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50 overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/10 rounded-md">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <CardTitle className="text-base">Hero Image (Optional)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {previewHeroUrl ? (
                  <div className="relative group">
                    <img
                      src={previewHeroUrl}
                      alt={previewHeroAlt}
                      width={previewHero.imageWidth || 1200}
                      height={previewHero.imageHeight || 675}
                      srcSet={previewHeroSrcSet || undefined}
                      sizes={previewHeroSizes}
                      className="w-full aspect-video object-cover transition-opacity"
                      style={previewHeroStyle}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8"
                        onClick={() => { setUploaderSlot('hero'); setIsUploaderOpen(true); }}
                      >
                        Change
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        onClick={() => handleRemoveImage('hero')}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div
                      className="flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors rounded-lg py-6"
                      onClick={() => { setUploaderSlot('hero'); setIsUploaderOpen(true); }}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-1 text-sm">Upload Hero</h3>
                      <p className="text-[11px] text-muted-foreground mb-1 max-w-[180px]">
                        Click to open the image uploader
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or select from library</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => { setMediaTarget('hero'); setMediaDialogOpen(true); }}
                      className="w-full h-8 text-xs"
                    >
                      <FolderOpen className="w-3 h-3 mr-2" />
                      Select from Library
                    </Button>
                  </div>
                )}
                <div className="p-3 space-y-2 bg-muted/10">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Alt Text</Label>
                    <Input
                      value={formData.imageHero?.alt || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({
                        ...prev,
                        imageHero: prev.imageHero ? { ...prev.imageHero, alt: e.target.value } : prev.imageHero
                      }))}
                      placeholder="Describe the image"
                      className="h-8 text-xs"
                      disabled={!formData.imageHero}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-500/10 rounded-md">
                    <Settings className="w-4 h-4 text-orange-500" />
                  </div>
                  <CardTitle className="text-base">Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Parent Category</Label>
                    <Select
                      value={formData.parentId === null ? '__none__' : String(formData.parentId)}
                      onValueChange={(value: string) => handleChange('parentId', value === '__none__' ? null : parseInt(value))}
                      disabled={parentLoading}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {parentOptions
                          .filter((cat) => !isEditMode || cat.slug !== slug)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('displayOrder', parseInt(e.target.value, 10) || 0)}
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Collection Title</Label>
                  <Input
                    value={formData.collectionTitle}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('collectionTitle', e.target.value)}
                    placeholder="e.g. Latest Recipes"
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Badge Color</Label>
                  <div className="flex items-center gap-3 relative">
                    <div
                      className="w-10 h-8 rounded border cursor-pointer hover:ring-2 hover:ring-primary/50"
                      style={{ backgroundColor: formData.color || '#ff6b35ff' }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      title="Click to change color"
                    />
                    <Input
                      value={formData.color || '#ff6b35ff'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('color', e.target.value)}
                      placeholder="#ff6b35ff"
                      className="h-8 font-mono text-sm flex-1"
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: formData.color || '#ff6b35ff' }}
                    />
                    {showColorPicker && (
                      <ColorPicker
                        color={formData.color || '#ff6b35ff'}
                        onChange={(color: string) => handleChange('color', color)}
                        onClose={() => setShowColorPicker(false)}
                        className="top-12 left-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Color used for category badges</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Online</p>
                      <p className="text-xs text-muted-foreground">Visible on site</p>
                    </div>
                    <Switch
                      checked={formData.isOnline}
                      onCheckedChange={(checked: boolean) => handleChange('isOnline', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Featured</p>
                      <p className="text-xs text-muted-foreground">Show in featured blocks</p>
                    </div>
                    <Switch
                      checked={formData.isFeatured}
                      onCheckedChange={(checked: boolean) => handleChange('isFeatured', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* JSON Import Dialog */}
      <Dialog open={jsonImportOpen} onOpenChange={setJsonImportOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import from JSON</DialogTitle>
            <DialogDescription>
              Paste a JSON object to automatically fill the form fields.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={jsonInput}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setJsonInput(e.target.value)}
              placeholder="Paste your JSON here..."
              className="h-[300px] font-mono text-xs"
            />
            {jsonError && (
              <p className="text-sm text-destructive">{jsonError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJsonImportOpen(false)}>Cancel</Button>
            <Button onClick={handleJsonImport}>Import Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Library Dialog */}
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
