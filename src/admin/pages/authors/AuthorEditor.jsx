import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Label } from '@/ui/label.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, User, FileText, Globe, Link2, FolderOpen } from 'lucide-react';
import { authorsAPI, mediaAPI } from '../../services/api';
import { cn } from '@/lib/utils';
import MediaDialog from '../../components/MediaDialog';
import ImageEditor from '../../components/ImageEditor';

const AuthorEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [pendingImageFromUrl, setPendingImageFromUrl] = useState(null);

  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    email: '',
    job: '',
    metaTitle: '',
    metaDescription: '',
    shortDescription: '',
    tldr: '',
    image: null,
    isOnline: false,
    isFavorite: false,
  });

  const [activeTab, setActiveTab] = useState('basic');

  // Ref to prevent duplicate API calls in React Strict Mode
  const isLoadingRef = useRef(false);

  // Load author from API
  useEffect(() => {
    // Always load the author when in edit mode
    if (isEditMode && !isLoadingRef.current) {
      loadAuthor();
    }
  }, [slug]);

  const loadAuthor = async () => {
    if (isLoadingRef.current) return; // Prevent duplicate calls
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const response = await authorsAPI.getBySlug(slug);
      const author = response.data?.data || response.data;

      if (author) {
        setFormData({
          slug: author.slug || '',
          name: author.name || '',
          email: author.email || '',
          job: author.job || '',
          metaTitle: author.metaTitle || '',
          metaDescription: author.metaDescription || '',
          shortDescription: author.shortDescription || '',
          tldr: author.tldr || '',
          // Map flat image properties back to nested object for UI
          image: author.imageUrl ? {
            url: author.imageUrl,
            alt: author.imageAlt || '',
            width: author.imageWidth || null,
            height: author.imageHeight || null,
          } : null,
          isOnline: author.isOnline || false,
          isFavorite: author.isFavorite || false,
        });
      } else {
        setError('Author not found');
      }
    } catch (err) {
      console.error('Failed to load author:', err);
      if (err.response?.status === 404) {
        setError('Author not found');
      } else {
        setError('Failed to load author');
      }
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

      // Clean filename helper
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
          fileToUpload = await convertToWebP(file);
        } catch (conversionErr) {
          console.warn('WebP conversion failed, uploading original:', conversionErr);
        }
      } else {
        // Just clean the filename for already-WebP files
        fileToUpload = new File([file], cleanFilename(file.name), { type: file.type });
      }

      // Upload to R2
      const response = await mediaAPI.upload(fileToUpload, {
        folder: 'authors',
        contextSlug: formData.slug || formData.name
      });
      const imageData = response.data?.data || response.data;

      setFormData(prev => ({
        ...prev,
        image: {
          url: imageData.url,
          alt: prev.image?.alt || prev.name,
          width: imageData.width || null,
          height: imageData.height || null,
        }
      }));
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
        alt: formData.name,
        convertToWebp: true,
        folder: 'authors',
        contextSlug: formData.slug || formData.name
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
        folder: 'authors',
        contextSlug: formData.slug || formData.name
      });
      const imageData = response.data?.data || response.data;

      setFormData(prev => ({
        ...prev,
        image: {
          url: imageData.url,
          alt: prev.image?.alt || prev.name,
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
        alt: item.altText || prev.name || '',
        width: item.width || null,
        height: item.height || null,
      }
    }));
    setMediaDialogOpen(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: !isEditMode ? generateSlug(value) : prev.slug
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.name || !formData.slug || !formData.email) {
        setError('Name, slug, and email are required');
        setSaving(false);
        return;
      }

      // Transform nested image object to flat properties for API
      const { image, ...restData } = formData;
      const authorData = {
        ...restData,
        imageUrl: image?.url || null,
        imageAlt: image?.alt || null,
        imageWidth: image?.width || null,
        imageHeight: image?.height || null,
        metaTitle: formData.metaTitle || formData.name,
        metaDescription: formData.metaDescription || formData.shortDescription,
      };

      if (isEditMode) {
        await authorsAPI.update(slug, authorData);
      } else {
        await authorsAPI.create(authorData);
      }

      navigate('/authors', { state: { refresh: Date.now() } });
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save author');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'seo', label: 'SEO', icon: Globe },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !formData.name && isEditMode) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>{error}</p>
        <Link to="/authors" className="mt-2 inline-block">
          <Button variant="outline">Back to Authors</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/authors">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Author' : 'New Author'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditMode ? 'Save Changes' : 'Create Author'}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Author name, email, and job title</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Author name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleChange('slug', e.target.value)}
                      placeholder="author-slug"
                      disabled={isEditMode}
                    />
                    {isEditMode && (
                      <p className="text-xs text-muted-foreground">Slug cannot be changed after creation</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="author@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job">Job Title</Label>
                    <Input
                      id="job"
                      value={formData.job}
                      onChange={(e) => handleChange('job', e.target.value)}
                      placeholder="e.g., Food Blogger, Chef"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Image */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Author Photo</CardTitle>
                <CardDescription>Upload from file or URL</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(formData.image?.url || imagePreviewUrl) ? (
                    <div className="relative">
                      <img
                        src={imagePreviewUrl || formData.image?.url}
                        alt={formData.image?.alt || 'Author photo'}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* File Upload Area */}
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          {isUploading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Click to upload
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Converts to WebP automatically
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageSelect}
                          disabled={isUploading}
                        />
                      </label>

                      {/* OR Divider */}
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
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleImageFromUrl}
                          disabled={isUploading || !imageUrlInput.trim()}
                          className="w-full"
                        >
                          {isUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4 mr-2" />
                              Upload from URL
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Select from Library Button */}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setMediaDialogOpen(true)}
                        className="w-full"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Select from Library
                      </Button>
                    </div>
                  )}

                  {formData.image?.url && (
                    <div className="space-y-2">
                      <Label htmlFor="imageAlt">Alt Text</Label>
                      <Input
                        id="imageAlt"
                        value={formData.image?.alt || ''}
                        onChange={(e) => handleChange('image', { ...formData.image, alt: e.target.value })}
                        placeholder="Image description"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>Author bio and descriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Textarea
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => handleChange('shortDescription', e.target.value)}
                placeholder="Brief description for author cards and listings"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tldr">TL;DR</Label>
              <Textarea
                id="tldr"
                value={formData.tldr}
                onChange={(e) => handleChange('tldr', e.target.value)}
                placeholder="Summary or TL;DR about the author"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
            <CardDescription>Search engine optimization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                value={formData.metaTitle}
                onChange={(e) => handleChange('metaTitle', e.target.value)}
                placeholder="SEO title (defaults to author name)"
              />
              <p className="text-xs text-muted-foreground">
                {formData.metaTitle?.length || 0}/60 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={formData.metaDescription}
                onChange={(e) => handleChange('metaDescription', e.target.value)}
                placeholder="SEO description (defaults to short description)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.metaDescription?.length || 0}/160 characters
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Dialog */}


      {/* Media Dialog */}
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
    </div >
  );
};

export default AuthorEditor;