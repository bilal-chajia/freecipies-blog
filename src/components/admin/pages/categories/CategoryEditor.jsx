import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { categoriesAPI, mediaAPI } from '../../services/api';
import { generateSlug } from '../../utils/helpers';

const CategoryEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

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
  });

  useEffect(() => {
    if (isEditMode) {
      loadCategory();
    }
  }, [slug, isEditMode]);

  const loadCategory = async () => {
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
          image: category.image || null,
          collectionTitle: category.collectionTitle || '',
          numEntriesPerPage: category.numEntriesPerPage || 12,
          isOnline: category.isOnline || false,
          isFavorite: category.isFavorite || false,
          sortOrder: category.sortOrder || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load category:', err);
      setError('Failed to load category');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setImageFile(file);

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.label || !formData.slug) {
        setError('Label and slug are required');
        setSaving(false);
        return;
      }

      let imagePayload = formData.image;

      // If a new image file was selected, upload it first
      if (imageFile) {
        const response = await mediaAPI.upload(imageFile);
        const imageData = response.data?.data || response.data;
        imagePayload = {
          url: imageData.url,
          alt: formData.image?.alt || formData.label, // Use existing alt text or fallback to label
          width: imageData.width || null,
          height: imageData.height || null,
        };
      }

      const categoryData = {
        ...formData,
        image: imagePayload,
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

      navigate('/categories');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/categories')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-3xl font-bold">{isEditMode ? 'Edit Category' : 'New Category'}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/categories')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                  placeholder="e.g., Recipes"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  disabled={isEditMode}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={formData.headline}
                onChange={(e) => handleChange('headline', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Short Description *</Label>
              <Textarea
                value={formData.shortDescription}
                onChange={(e) => handleChange('shortDescription', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>TL;DR</Label>
              <Textarea
                value={formData.tldr}
                onChange={(e) => handleChange('tldr', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input
                value={formData.metaTitle}
                onChange={(e) => handleChange('metaTitle', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={formData.metaDescription}
                onChange={(e) => handleChange('metaDescription', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(imagePreviewUrl || formData.image?.url) ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img
                    src={imagePreviewUrl || formData.image.url}
                    alt={formData.image?.alt || formData.label}
                    className="w-full max-w-md h-48 object-cover rounded"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Alt Text</Label>
                  <Input
                    value={formData.image?.alt || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      image: { ...prev.image, alt: e.target.value }
                    }))}
                  />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded p-6 text-center">
                <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <Label className="cursor-pointer text-blue-600 hover:underline">
                  {saving ? 'Saving...' : 'Click to upload image'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={saving}
                  />
                </Label>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Collection Title</Label>
              <Input
                value={formData.collectionTitle}
                onChange={(e) => handleChange('collectionTitle', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Entries Per Page</Label>
              <Input
                type="number"
                value={formData.numEntriesPerPage}
                onChange={(e) => handleChange('numEntriesPerPage', parseInt(e.target.value) || 12)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isOnline}
                onCheckedChange={(checked) => handleChange('isOnline', checked)}
              />
              <Label>Online</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isFavorite}
                onCheckedChange={(checked) => handleChange('isFavorite', checked)}
              />
              <Label>Featured</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CategoryEditor;
