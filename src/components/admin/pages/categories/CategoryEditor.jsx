import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Upload, X, Image as ImageIcon, Layout, Type, FileText, Settings, Globe, FileJson, Link2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { categoriesAPI, mediaAPI } from '../../services/api';
import { generateSlug } from '../../utils/helpers';
import { cn } from '@/lib/utils';
import MediaDialog from '../../components/MediaDialog';
import ImageEditor from '../../components/ImageEditor';
import ColorPicker from '../../components/ColorPicker';


const CategoryEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [pendingImageFromUrl, setPendingImageFromUrl] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [formData, setFormData] = useState({
    slug: '',
    label: '',
    headline: '',
    metaTitle: '',
    metaDescription: '',
    shortDescription: '',
    tldr: '',
    image: null,
    collectionTitle: '',
    numEntriesPerPage: 12,
    isOnline: false,
    isFavorite: false,
    sortOrder: 0,
    color: '#ff6600',
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
  }, [slug]);

  const loadCategory = async () => {
    if (isLoadingRef.current) return; // Prevent duplicate calls
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const response = await categoriesAPI.getBySlug(slug);
      const category = response.data?.data || response.data;

      if (category) {
        setFormData({
          slug: category.slug,
          label: category.label,
          headline: category.headline || '',
          metaTitle: category.metaTitle || '',
          metaDescription: category.metaDescription || '',
          shortDescription: category.shortDescription || '',
          tldr: category.tldr || '',
          // Map flat image properties back to nested object for UI
          image: category.imageUrl ? {
            url: category.imageUrl,
            alt: category.imageAlt || '',
            width: category.imageWidth || null,
            height: category.imageHeight || null,
          } : null,
          collectionTitle: category.collectionTitle || '',
          numEntriesPerPage: category.numEntriesPerPage || 12,
          isOnline: category.isOnline || false,
          isFavorite: category.isFavorite || false,
          sortOrder: category.sortOrder || 0,
          color: category.color || '#ff6600',
        });
      }
    } catch (err) {
      console.error('Failed to load category:', err);
      setError('Failed to load category');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Convert image file to WebP using Canvas API with optional resizing
  const MAX_DIMENSION = 2048; // Maximum width or height in pixels

  const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions if image exceeds max size
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const aspectRatio = width / height;
          if (width > height) {
            width = MAX_DIMENSION;
            height = Math.round(width / aspectRatio);
          } else {
            height = MAX_DIMENSION;
            width = Math.round(height * aspectRatio);
          }
          console.log(`Resizing image from ${img.width}x${img.height} to ${width}x${height}`);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Clean filename - replace spaces and %20 with dashes
              const cleanName = file.name
                .replace(/%20/g, '-')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/\.[^.]+$/, '.webp')
                .toLowerCase();

              const webpFile = new File(
                [blob],
                cleanName,
                { type: 'image/webp' }
              );
              resolve(webpFile);
            } else {
              reject(new Error('Failed to convert image'));
            }
          },
          'image/webp',
          0.85 // Slightly lower quality for better file size
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');

      // Create a preview immediately
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);

      // Clean filename - replace spaces and %20 with dashes
      const cleanFilename = (name) => {
        return name
          .replace(/%20/g, '-')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .toLowerCase();
      };

      // Convert to WebP before upload (skip if already WebP)
      let fileToUpload = file;
      const isAlreadyWebP = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

      if (!isAlreadyWebP) {
        try {
          console.log('Original file:', file.name, file.type, file.size);
          fileToUpload = await convertToWebP(file);
          console.log('Converted to WebP:', fileToUpload.name, fileToUpload.type, fileToUpload.size);
        } catch (conversionErr) {
          console.warn('WebP conversion failed, uploading original:', conversionErr);
        }
      } else {
        console.log('File is already WebP, skipping conversion:', file.name);
        // Just clean the filename
        fileToUpload = new File([file], cleanFilename(file.name), { type: file.type });
      }

      // Upload to R2
      const response = await mediaAPI.upload(fileToUpload, {
        folder: 'categories',
        contextSlug: formData.slug || formData.label
      });
      const imageData = response.data?.data || response.data;

      setFormData(prev => ({
        ...prev,
        image: {
          url: imageData.url,
          alt: prev.image?.alt || prev.label,
          width: imageData.width || null,
          height: imageData.height || null,
        }
      }));

      setImageFile(null);
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Failed to upload image. Please try again.');
      setImagePreviewUrl('');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image upload from URL - now opens ImageEditor first
  const handleImageFromUrl = async () => {
    if (!imageUrlInput.trim()) return;

    try {
      setIsUploading(true);
      setError('');

      // Upload to R2 first to avoid CORS issues with client-side fetch
      const response = await mediaAPI.uploadFromUrl(imageUrlInput.trim(), {
        alt: formData.label,
        convertToWebp: true,
        folder: 'categories',
        contextSlug: formData.slug || formData.label
      });

      const imageData = response.data?.data || response.data;

      // Set pending image and open editor with the now-local R2 URL
      setPendingImageFromUrl({
        blob: null,
        url: imageData.url,
        filename: imageData.filename || imageUrlInput.split('/').pop()?.split('?')[0] || 'image.webp'
      });
      setImageEditorOpen(true);
      setImageUrlInput('');
    } catch (err) {
      console.error('Image upload from URL failed:', err);
      // More specific error message for common issues
      const errorMessage = err.response?.data?.error || err.message;
      if (errorMessage && errorMessage.includes('fetch')) {
        setError('Failed to fetch image. The server blocked the request, or the image URL is invalid.');
      } else {
        setError(typeof errorMessage === 'string' ? errorMessage : 'Failed to upload image from URL.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Handle save from ImageEditor
  const handleImageEditorSave = async (editedFile) => {
    try {
      setIsUploading(true);
      setImageEditorOpen(false);
      setPendingImageFromUrl(null);

      // Upload the edited image to R2
      const response = await mediaAPI.upload(editedFile, {
        folder: 'categories',
        contextSlug: formData.slug || formData.label
      });
      const imageData = response.data?.data || response.data;

      setFormData(prev => ({
        ...prev,
        image: {
          url: imageData.url,
          alt: prev.image?.alt || prev.label,
          width: imageData.width || null,
          height: imageData.height || null,
        }
      }));
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Failed to upload edited image.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle cancel from ImageEditor
  const handleImageEditorCancel = () => {
    setImageEditorOpen(false);
    if (pendingImageFromUrl?.url) {
      URL.revokeObjectURL(pendingImageFromUrl.url);
    }
    setPendingImageFromUrl(null);
  };

  // Clean up the object URL on component unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    setFormData(prev => ({ ...prev, image: null }));
  };

  // Handle selection from media library
  const handleMediaSelect = (item) => {
    setFormData(prev => ({
      ...prev,
      image: {
        url: item.url,
        alt: item.altText || prev.label || '',
        width: item.width || null,
        height: item.height || null,
      }
    }));
    setImagePreviewUrl(''); // Clear any preview from file upload
    setMediaDialogOpen(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.label || !formData.slug) {
        setError('Label and slug are required');
        setSaving(false);
        return;
      }

      // Image is already uploaded via handleImageSelect
      // Transform nested image object to flat properties for API
      const { image, ...restData } = formData;
      const categoryData = {
        ...restData,
        imageUrl: image?.url || null,
        imageAlt: image?.alt || null,
        imageWidth: image?.width || null,
        imageHeight: image?.height || null,
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
            <Button onClick={handleSave} disabled={saving || isUploading}>
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
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">

            {/* Image Card */}
            <Card className="border-0 shadow-sm ring-1 ring-border/50 overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/10 rounded-md">
                    <ImageIcon className="w-4 h-4 text-purple-500" />
                  </div>
                  <CardTitle className="text-base">Featured Image</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(imagePreviewUrl || formData.image?.url) ? (
                  <div className="relative group">
                    <img
                      src={imagePreviewUrl || formData.image.url}
                      alt={formData.image?.alt || formData.label}
                      className={cn(
                        "w-full aspect-video object-cover transition-opacity",
                        isUploading ? "opacity-50" : "opacity-100"
                      )}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    )}
                    {!isUploading && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8"
                          onClick={() => document.getElementById('image-upload').click()}
                        >
                          Change
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8"
                          onClick={handleRemoveImage}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    {/* File Upload Area */}
                    <div
                      className="flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors rounded-lg py-6"
                      onClick={() => !isUploading && document.getElementById('image-upload').click()}
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <h3 className="font-medium mb-1 text-sm">{isUploading ? 'Uploading...' : 'Upload Image'}</h3>
                      <p className="text-[11px] text-muted-foreground mb-1 max-w-[180px]">
                        {isUploading ? 'Please wait...' : 'Click to upload (auto-converts to WebP)'}
                      </p>
                    </div>

                    {/* OR Divider */}
                    {!isUploading && (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or paste URL</span>
                          </div>
                        </div>

                        {/* URL Input */}
                        <div className="space-y-2">
                          <Input
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            disabled={isUploading}
                            className="h-8 text-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleImageFromUrl}
                            disabled={isUploading || !imageUrlInput.trim()}
                            className="w-full h-8 text-xs"
                          >
                            <Link2 className="w-3 h-3 mr-2" />
                            Upload from URL
                          </Button>
                        </div>

                        {/* OR Divider for Library */}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or select from library</span>
                          </div>
                        </div>

                        {/* Select from Library Button */}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setMediaDialogOpen(true)}
                          disabled={isUploading}
                          className="w-full h-8 text-xs"
                        >
                          <FolderOpen className="w-3 h-3 mr-2" />
                          Select from Library
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={saving || isUploading}
                />
                <div className="p-3 space-y-2 bg-muted/10">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Alt Text</Label>
                    <Input
                      value={formData.image?.alt || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        image: { ...prev.image, alt: e.target.value }
                      }))}
                      placeholder="Describe the image"
                      className="h-8 text-xs"
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
                      style={{ backgroundColor: formData.color || '#ff6600' }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      title="Click to change color"
                    />
                    <Input
                      value={formData.color || '#ff6600'}
                      onChange={(e) => handleChange('color', e.target.value)}
                      placeholder="#ff6600"
                      className="h-9 font-mono text-sm flex-1"
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: formData.color || '#ff6600' }}
                    />
                    {showColorPicker && (
                      <ColorPicker
                        color={formData.color || '#ff6600'}
                        onChange={(color) => handleChange('color', color)}
                        onClose={() => setShowColorPicker(false)}
                        className="top-12 left-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Color used for category badges</p>
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

      {/* Image Editor Dialog */}
      <ImageEditor
        isOpen={imageEditorOpen}
        image={pendingImageFromUrl?.url}
        originalFilename={pendingImageFromUrl?.filename}
        onSave={handleImageEditorSave}
        onCancel={handleImageEditorCancel}
      />
    </div>
  );
};

export default CategoryEditor;
