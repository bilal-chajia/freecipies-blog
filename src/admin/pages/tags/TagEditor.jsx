import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Tag, Palette, Loader2 } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Label } from '@/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import { tagsAPI } from '../../services/api';
import { generateSlug } from '../../utils/helpers';
import ColorPicker from '@/components/ColorPicker';

const TagEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug && slug !== 'new';
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    color: '#ff6600',
  });

  // Load tag from API when editing
  useEffect(() => {
    if (isEditMode && slug) {
      const fetchTag = async () => {
        try {
          setLoading(true);
          const response = await tagsAPI.getBySlug(slug);
          // API returns { success: true, data: {...} }, axios wraps this in response.data
          const apiResponse = response.data;
          const tag = apiResponse?.data || apiResponse;
          setFormData({
            slug: tag.slug || '',
            name: tag.label || tag.name || '',
            color: tag.color || '#ff6600',
          });
        } catch (err) {
          console.error('Failed to fetch tag:', err);
          setError('Failed to load tag: ' + (err.response?.data?.error || err.message));
        } finally {
          setLoading(false);
        }
      };
      fetchTag();
    }
  }, [slug, isEditMode]);

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      setError('Tag name is required');
      return;
    }

    if (!formData.slug || !formData.slug.trim()) {
      setError('Slug is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Call API to persist changes - map 'name' to 'label' for API
      const tagData = {
        slug: formData.slug,
        label: formData.name, // API expects 'label'
        color: formData.color,
      };

      if (isEditMode) {
        await tagsAPI.update(slug, tagData);
      } else {
        await tagsAPI.create(tagData);
      }

      navigate('/tags');
    } catch (err) {
      console.error('Failed to save tag:', err);
      setError('Failed to save tag: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && !isEditMode) {
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
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/tags')} className="rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{isEditMode ? 'Edit Tag' : 'New Tag'}</h2>
              <p className="text-sm text-muted-foreground">{isEditMode ? `Updating ${formData.name}` : 'Create a new tag for organizing content'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/tags')}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

      <div className="container px-4 md:px-8 max-w-4xl mx-auto mt-6">
        {error && (
          <div className="mb-6 bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info Card */}
          <Card className="border-0 shadow-sm ring-1 ring-border/50">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-base">Tag Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Tag Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Quick Recipes"
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
                <p className="text-xs text-muted-foreground">
                  Used in URLs {isEditMode && '(cannot be changed after creation)'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Color Card */}
          <Card className="border-0 shadow-sm ring-1 ring-border/50">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/10 rounded-md">
                  <Palette className="w-4 h-4 text-purple-500" />
                </div>
                <CardTitle className="text-base">Appearance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Preview - First */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Preview</Label>
                <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-3">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    {formData.name || 'Tag Name'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    This is how your tag will appear
                  </span>
                </div>
              </div>

              {/* Badge Color - Second */}
              <div className="space-y-2 relative">
                <Label className="text-sm font-medium text-muted-foreground">Badge Color</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-10 rounded border cursor-pointer hover:ring-2 hover:ring-primary/50"
                    style={{ backgroundColor: formData.color }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    placeholder="#FF6B6B"
                    className="font-mono h-9 flex-1"
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: formData.color }}
                  />
                </div>
                {showColorPicker && (
                  <ColorPicker
                    color={formData.color}
                    onChange={(color) => handleChange('color', color)}
                    onClose={() => setShowColorPicker(false)}
                    className="top-20 left-0"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Choose a color to visually distinguish this tag
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TagEditor;