import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Upload, Image as ImageIcon, Layout, Settings, Globe, FileJson, FolderOpen } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Label } from '@/ui/label.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import { articlesAPI, categoriesAPI } from '../../services/api';
import { buildImageSlotFromMedia, generateSlug } from '../../utils/helpers';
import MediaDialog from '@/components/MediaDialog';
import ColorPicker from '@/components/ColorPicker';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';
import ImageUploader from '@/components/ImageUploader';


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
  const [uploaderSlot, setUploaderSlot] = useState('thumbnail'); // 'thumbnail' | 'cover'
  const [mediaTarget, setMediaTarget] = useState('thumbnail');
  const [parentOptions, setParentOptions] = useState([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [featuredSlug, setFeaturedSlug] = useState('');
  const [featuredSearchQuery, setFeaturedSearchQuery] = useState('');
  const [featuredSearchResults, setFeaturedSearchResults] = useState([]);
  const [featuredSearchLoading, setFeaturedSearchLoading] = useState(false);
  const [featuredSearchError, setFeaturedSearchError] = useState('');
  const [featuredLookup, setFeaturedLookup] = useState({
    loading: false,
    error: '',
    article: null,
  });
  const skipFeaturedSearchRef = useRef(false);

  const [formData, setFormData] = useState({
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
    imageCover: null,
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
    color: '#ff6600ff',
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
        const data = response.data?.data || response.data || [];
        const items = Array.isArray(data) ? data : [];
        if (isActive) {
          setFeaturedSearchResults(items);
        }
      } catch (err) {
        console.error('Failed to search recipes:', err);
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
      const data = response.data?.data || response.data || [];
      const options = Array.isArray(data) ? data : [];
      setParentOptions(options);
    } catch (err) {
      console.error('Failed to load categories list for parent selection:', err);
    } finally {
      setParentLoading(false);
    }
  };

  const loadFeaturedArticleById = async (id) => {
    if (!id) return;
    setFeaturedLookup({ loading: true, error: '', article: null });
    try {
      const response = await articlesAPI.getById(id);
      const article = response.data?.data || response.data;
      if (!article?.id) {
        throw new Error('Not found');
      }
      setFeaturedLookup({ loading: false, error: '', article });
      setFeaturedSlug(article.slug || '');
      skipFeaturedSearchRef.current = true;
      setFeaturedSearchQuery(article.label || article.slug || '');
    } catch (err) {
      console.error('Failed to load featured article:', err);
      setFeaturedLookup({ loading: false, error: 'Featured recipe not found', article: null });
    }
  };

  const loadCategory = async () => {
    if (isLoadingRef.current) return; // Prevent duplicate calls
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const response = await categoriesAPI.getBySlug(slug);
      const category = response.data?.data || response.data;

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
        const imageFromJsonCover = parsedImages?.cover || null;
        const legacyImage = category.imageUrl ? {
          url: category.imageUrl,
          alt: category.imageAlt || '',
          width: category.imageWidth || null,
          height: category.imageHeight || null,
        } : null;

        setFormData({
          slug: category.slug,
          label: category.label,
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
          imageCover: imageFromJsonCover || null,
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
          sortOrder: category.sortOrder || 'desc',
          headerStyle: category.headerStyle || 'hero',
          featuredArticleId: category.featuredArticleId ?? null,
          showFeaturedRecipe: category.showFeaturedRecipe ?? true,
          showHeroCta: category.showHeroCta ?? true,
          heroCtaText: category.heroCtaText || '',
          heroCtaLink: category.heroCtaLink || '',
          isOnline: category.isOnline || false,
          isFeatured: category.isFeatured || category.isFavorite || false,
          displayOrder: typeof category.sortOrder === 'number' ? category.sortOrder : 0,
          color: category.color || '#ff6600ff',
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
      console.error('Failed to load category:', err);
      setError('Failed to load category');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleUploadComplete = (mediaRecord) => {
    setFormData(prev => {
      const slot = buildImageSlotFromMedia(mediaRecord, {
        alt: prev[uploaderSlot === 'cover' ? 'imageCover' : 'imageThumbnail']?.alt || prev.label || '',
      });
      return {
        ...prev,
        [uploaderSlot === 'cover' ? 'imageCover' : 'imageThumbnail']: slot,
      };
    });
  };

  const handleRemoveImage = (slot) => {
    setFormData(prev => ({ ...prev, [slot === 'cover' ? 'imageCover' : 'imageThumbnail']: null }));
  };

  // Handle selection from media library
  const handleMediaSelect = (item) => {
    setFormData(prev => {
      const slot = buildImageSlotFromMedia(item, {
        alt: item.altText || prev.label || '',
      });

      return {
        ...prev,
        [mediaTarget === 'cover' ? 'imageCover' : 'imageThumbnail']: slot,
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
      const article = response.data?.data || response.data;
      if (!article?.id) {
        throw new Error('Not found');
      }
      setFormData(prev => ({ ...prev, featuredArticleId: article.id }));
      setFeaturedLookup({ loading: false, error: '', article });
      skipFeaturedSearchRef.current = true;
      setFeaturedSearchQuery(article.label || article.slug || '');
      setFeaturedSearchResults([]);
    } catch (err) {
      console.error('Failed to lookup featured recipe:', err);
      setFeaturedLookup({ loading: false, error: 'Recipe not found', article: null });
    }
  };

  const handleClearFeatured = () => {
    setFormData(prev => ({ ...prev, featuredArticleId: null }));
    setFeaturedLookup({ loading: false, error: '', article: null });
    setFeaturedSlug('');
    setFeaturedSearchQuery('');
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

      const { imageThumbnail, imageCover, displayOrder, ...restData } = formData;
      const categoryData = {
        ...restData,
        layout: formData.layoutMode,
        sortOrder: displayOrder, // Map frontend displayOrder to backend sortOrder (numeric)
        imagesJson: JSON.stringify({
          ...(imageThumbnail ? { thumbnail: imageThumbnail } : {}),
          ...(imageCover ? { cover: imageCover } : {}),
        }),
        headline: formData.headline || formData.label,
        metaTitle: formData.metaTitle || formData.label,
        metaDescription: formData.metaDescription || formData.shortDescription,
        collectionTitle: formData.collectionTitle || formData.label,
      };

      // DEBUG: Check if iconSvg is included
      console.log('Category data being sent:', { iconSvg: categoryData.iconSvg?.substring(0, 50) || 'EMPTY' });

      if (isEditMode) {
        await categoriesAPI.update(slug, categoryData);
      } else {
        await categoriesAPI.create(categoryData);
      }

      navigate('/categories', { state: { refresh: Date.now() } });
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'label' && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const thumbnailSlot = formData.imageThumbnail ? { thumbnail: formData.imageThumbnail } : null;
  const coverSlot = formData.imageCover ? { cover: formData.imageCover } : null;

  const previewThumb = extractImage(thumbnailSlot, 'thumbnail', 1200);
  const previewThumbSrcSet = toAdminSrcSet(getImageSrcSet(thumbnailSlot, 'thumbnail'));
  const previewThumbUrl = toAdminImageUrl(previewThumb.imageUrl || formData.imageThumbnail?.url);
  const previewThumbAlt = formData.imageThumbnail?.alt || formData.label || '';
  const previewThumbSizes = previewThumbSrcSet ? '400px' : undefined;
  const previewThumbStyle = buildImageStyle(previewThumb);

  const previewCover = extractImage(coverSlot, 'cover', 1200);
  const previewCoverSrcSet = toAdminSrcSet(getImageSrcSet(coverSlot, 'cover'));
  const previewCoverUrl = toAdminImageUrl(previewCover.imageUrl || formData.imageCover?.url);
  const previewCoverAlt = formData.imageCover?.alt || formData.label || '';
  const previewCoverSizes = previewCoverSrcSet ? '400px' : undefined;
  const previewCoverStyle = buildImageStyle(previewCover);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/categories')} className="rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{isEditMode ? 'Edit Category' : 'New Category'}</h2>
              <p className="text-sm text-muted-foreground">{isEditMode ? `Updating ${formData.label}` : 'Create a new category'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openJsonDialog}>
              <FileJson className="w-4 h-4 mr-2" />
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
                  <Save className="w-4 h-4 mr-2" />
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
                    <Layout className="w-4 h-4 text-primary" />
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
                      onChange={(e) => handleChange('label', e.target.value)}
                      placeholder="e.g., Breakfast Recipes"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Slug *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-muted-foreground text-sm">/</span>
                      <Input
                        value={formData.slug}
                        onChange={(e) => handleChange('slug', e.target.value)}
                        disabled={isEditMode}
                        className="pl-6 h-9 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Headline</Label>
                  <Input
                    value={formData.headline}
                    onChange={(e) => handleChange('headline', e.target.value)}
                    placeholder="Catchy headline for the category page"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Short Description *</Label>
                  <Textarea
                    value={formData.shortDescription}
                    onChange={(e) => handleChange('shortDescription', e.target.value)}
                    rows={3}
                    placeholder="Brief summary displayed on cards"
                    className="resize-none min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">TL;DR</Label>
                  <Textarea
                    value={formData.tldr}
                    onChange={(e) => handleChange('tldr', e.target.value)}
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
                  <div className="p-1.5 bg-blue-500/10 rounded-md">
                    <Globe className="w-4 h-4 text-blue-500" />
                  </div>
                  <CardTitle className="text-base">SEO Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Meta Title</Label>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => handleChange('metaTitle', e.target.value)}
                    placeholder="SEO optimized title"
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {formData.metaTitle.length}/60 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Meta Description</Label>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e) => handleChange('metaDescription', e.target.value)}
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
                    onChange={(e) => handleChange('canonicalUrl', e.target.value)}
                    placeholder="https://example.com/categories/breakfast"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">OG Image URL</Label>
                    <Input
                      value={formData.ogImage}
                      onChange={(e) => handleChange('ogImage', e.target.value)}
                      placeholder="https://cdn.example.com/og-image.jpg"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">OG Title</Label>
                    <Input
                      value={formData.ogTitle}
                      onChange={(e) => handleChange('ogTitle', e.target.value)}
                      placeholder="Social share title"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">OG Description</Label>
                  <Textarea
                    value={formData.ogDescription}
                    onChange={(e) => handleChange('ogDescription', e.target.value)}
                    rows={2}
                    placeholder="Social share description"
                    className="resize-none min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Twitter Card</Label>
                    <select
                      value={formData.twitterCard}
                      onChange={(e) => handleChange('twitterCard', e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="summary">summary</option>
                      <option value="summary_large_image">summary_large_image</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Robots</Label>
                    <Input
                      value={formData.robots}
                      onChange={(e) => handleChange('robots', e.target.value)}
                      placeholder="e.g., noindex,nofollow"
                      className="h-9"
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
                    onCheckedChange={(checked) => handleChange('noIndex', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Layout & Navigation */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500/10 rounded-md">
                    <Layout className="w-4 h-4 text-green-500" />
                  </div>
                  <CardTitle className="text-base">Layout & Navigation</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Layout Mode</Label>
                    <select
                      value={formData.layoutMode}
                      onChange={(e) => handleChange('layoutMode', e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="grid">Grid</option>
                      <option value="list">List</option>
                      <option value="masonry">Masonry</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Card Style</Label>
                    <select
                      value={formData.cardStyle}
                      onChange={(e) => handleChange('cardStyle', e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="full">Full</option>
                      <option value="compact">Compact</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Sort By</Label>
                    <select
                      value={formData.sortBy}
                      onChange={(e) => handleChange('sortBy', e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="publishedAt">Published At</option>
                      <option value="title">Title</option>
                      <option value="viewCount">View Count</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Sort Order</Label>
                    <select
                      value={formData.sortOrder}
                      onChange={(e) => handleChange('sortOrder', e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Header Style</Label>
                    <select
                      value={formData.headerStyle}
                      onChange={(e) => handleChange('headerStyle', e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="hero">Hero</option>
                      <option value="minimal">Minimal</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Featured Recipe (Hero)</Label>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show Featured Recipe</p>
                      <p className="text-xs text-muted-foreground">Hero style only</p>
                    </div>
                    <Switch
                      checked={formData.showFeaturedRecipe}
                      onCheckedChange={(checked) => handleChange('showFeaturedRecipe', checked)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Search Recipes</Label>
                      <Input
                        value={featuredSearchQuery}
                        onChange={(e) => setFeaturedSearchQuery(e.target.value)}
                        placeholder="Search recipe title..."
                        className="h-9"
                        disabled={!formData.showFeaturedRecipe}
                      />
                      <div className="rounded-md border bg-background max-h-56 overflow-auto">
                        {featuredSearchLoading && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
                        )}
                        {!featuredSearchLoading && featuredSearchError && (
                          <p className="px-3 py-2 text-xs text-destructive">{featuredSearchError}</p>
                        )}
                        {!featuredSearchLoading && !featuredSearchError && featuredSearchResults.length === 0 && featuredSearchQuery.trim().length >= 2 && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
                        )}
                        {!featuredSearchLoading && !featuredSearchError && featuredSearchResults.length === 0 && featuredSearchQuery.trim().length > 0 && featuredSearchQuery.trim().length < 2 && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Type at least 2 characters.</p>
                        )}
                        {!featuredSearchLoading && !featuredSearchError && featuredSearchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                            onClick={() => {
                              handleChange('featuredArticleId', item.id);
                              setFeaturedLookup({ loading: false, error: '', article: item });
                              setFeaturedSlug(item.slug || '');
                              skipFeaturedSearchRef.current = true;
                              setFeaturedSearchQuery(item.label || item.slug || '');
                              setFeaturedSearchResults([]);
                            }}
                            disabled={!formData.showFeaturedRecipe}
                          >
                            <span className="block font-medium">{item.label || item.headline || item.slug}</span>
                            <span className="block text-[11px] text-muted-foreground">/{item.slug}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Searches online recipes only.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Lookup by Slug</Label>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <Input
                          value={featuredSlug}
                          onChange={(e) => setFeaturedSlug(e.target.value)}
                          placeholder="recipe-slug"
                          className="h-9"
                          disabled={!formData.showFeaturedRecipe}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleFeaturedLookup}
                            disabled={featuredLookup.loading || !formData.showFeaturedRecipe}
                            className="h-9"
                          >
                            {featuredLookup.loading ? 'Loading...' : 'Lookup'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClearFeatured}
                            disabled={!formData.featuredArticleId}
                            className="h-9"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {featuredLookup.error && (
                    <p className="text-xs text-destructive">{featuredLookup.error}</p>
                  )}
                  {formData.featuredArticleId && (
                    <div className="rounded-md border px-3 py-2">
                      <p className="text-sm font-medium">
                        Selected ID: {formData.featuredArticleId}
                      </p>
                      {featuredLookup.article?.label && (
                        <p className="text-xs text-muted-foreground">{featuredLookup.article.label}</p>
                      )}
                      {featuredLookup.article?.slug && (
                        <p className="text-xs text-muted-foreground">/{featuredLookup.article.slug}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Hero CTA</Label>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show CTA Button</p>
                      <p className="text-xs text-muted-foreground">Hero style only</p>
                    </div>
                    <Switch
                      checked={formData.showHeroCta}
                      onCheckedChange={(checked) => handleChange('showHeroCta', checked)}
                    />
                  </div>
                  <Input
                    value={formData.heroCtaText}
                    onChange={(e) => handleChange('heroCtaText', e.target.value)}
                    placeholder="Join My Mailing List"
                    className="h-9"
                    disabled={!formData.showHeroCta}
                  />
                  <Input
                    value={formData.heroCtaLink}
                    onChange={(e) => handleChange('heroCtaLink', e.target.value)}
                    placeholder="#newsletter"
                    className="h-9"
                    disabled={!formData.showHeroCta}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show in Navigation</p>
                      <p className="text-xs text-muted-foreground">Display in main nav</p>
                    </div>
                    <Switch
                      checked={formData.showInNav}
                      onCheckedChange={(checked) => handleChange('showInNav', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show in Footer</p>
                      <p className="text-xs text-muted-foreground">Display in footer nav</p>
                    </div>
                    <Switch
                      checked={formData.showInFooter}
                      onCheckedChange={(checked) => handleChange('showInFooter', checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show Sidebar</p>
                    </div>
                    <Switch
                      checked={formData.showSidebar}
                      onCheckedChange={(checked) => handleChange('showSidebar', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show Filters</p>
                    </div>
                    <Switch
                      checked={formData.showFilters}
                      onCheckedChange={(checked) => handleChange('showFilters', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show Breadcrumb</p>
                    </div>
                    <Switch
                      checked={formData.showBreadcrumb}
                      onCheckedChange={(checked) => handleChange('showBreadcrumb', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Show Pagination</p>
                    </div>
                    <Switch
                      checked={formData.showPagination}
                      onCheckedChange={(checked) => handleChange('showPagination', checked)}
                    />
                  </div>
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
                      onChange={(e) => setFormData(prev => ({
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

            {/* Cover Image Card */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50 overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/10 rounded-md">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <CardTitle className="text-base">Cover Image (Optional)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {previewCoverUrl ? (
                  <div className="relative group">
                    <img
                      src={previewCoverUrl}
                      alt={previewCoverAlt}
                      width={previewCover.imageWidth || 1200}
                      height={previewCover.imageHeight || 675}
                      srcSet={previewCoverSrcSet || undefined}
                      sizes={previewCoverSizes}
                      className="w-full aspect-video object-cover transition-opacity"
                      style={previewCoverStyle}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8"
                        onClick={() => { setUploaderSlot('cover'); setIsUploaderOpen(true); }}
                      >
                        Change
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        onClick={() => handleRemoveImage('cover')}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div
                      className="flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors rounded-lg py-6"
                      onClick={() => { setUploaderSlot('cover'); setIsUploaderOpen(true); }}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium mb-1 text-sm">Upload Cover</h3>
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
                      onClick={() => { setMediaTarget('cover'); setMediaDialogOpen(true); }}
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
                      value={formData.imageCover?.alt || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        imageCover: prev.imageCover ? { ...prev.imageCover, alt: e.target.value } : prev.imageCover
                      }))}
                      placeholder="Describe the image"
                      className="h-8 text-xs"
                      disabled={!formData.imageCover}
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
                    <select
                      value={formData.parentId ?? ''}
                      onChange={(e) => handleChange('parentId', e.target.value === '' ? null : parseInt(e.target.value))}
                      disabled={parentLoading}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">None</option>
                      {parentOptions
                        .filter((cat) => !isEditMode || cat.slug !== slug)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Collection Title</Label>
                  <Input
                    value={formData.collectionTitle}
                    onChange={(e) => handleChange('collectionTitle', e.target.value)}
                    placeholder="e.g. Latest Recipes"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Entries Per Page</Label>
                  <Input
                    type="number"
                    value={formData.numEntriesPerPage}
                    onChange={(e) => handleChange('numEntriesPerPage', parseInt(e.target.value) || 12)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Badge Color</Label>
                  <div className="flex items-center gap-3 relative">
                    <div
                      className="w-10 h-9 rounded border cursor-pointer hover:ring-2 hover:ring-primary/50"
                      style={{ backgroundColor: formData.color || '#ff6600ff' }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      title="Click to change color"
                    />
                    <Input
                      value={formData.color || '#ff6600ff'}
                      onChange={(e) => handleChange('color', e.target.value)}
                      placeholder="#ff6600ff"
                      className="h-9 font-mono text-sm flex-1"
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: formData.color || '#ff6600ff' }}
                    />
                    {showColorPicker && (
                      <ColorPicker
                        color={formData.color || '#ff6600ff'}
                        onChange={(color) => handleChange('color', color)}
                        onClose={() => setShowColorPicker(false)}
                        className="top-12 left-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Color used for category badges</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Icon SVG</Label>
                  <Textarea
                    value={formData.iconSvg}
                    onChange={(e) => handleChange('iconSvg', e.target.value)}
                    rows={3}
                    placeholder="<svg viewBox='0 0 24 24'>...</svg>"
                    className="resize-none h-40 min-h-[160px] max-h-[160px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Online</p>
                      <p className="text-xs text-muted-foreground">Visible on site</p>
                    </div>
                    <Switch
                      checked={formData.isOnline}
                      onCheckedChange={(checked) => handleChange('isOnline', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Featured</p>
                      <p className="text-xs text-muted-foreground">Show in featured blocks</p>
                    </div>
                    <Switch
                      checked={formData.isFavorite}
                      onCheckedChange={(checked) => handleChange('isFavorite', checked)}
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
              onChange={(e) => setJsonInput(e.target.value)}
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
      />

      <ImageUploader
        open={isUploaderOpen}
        onOpenChange={setIsUploaderOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export default CategoryEditor;
