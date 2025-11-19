import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useTagsStore } from '../../store/useStore';
import { generateSlug } from '../../utils/helpers';

const TagEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug;
  const { tags, setTags } = useTagsStore();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    color: '#FF6B6B',
  });

  useEffect(() => {
    if (isEditMode) {
      const tag = tags.find(t => t.slug === slug);
      if (tag) {
        setFormData({
          slug: tag.slug,
          name: tag.name,
          color: tag.color,
        });
      }
    }
  }, [slug, isEditMode, tags]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Tag name is required');
      return;
    }

    try {
      setSaving(true);

      if (isEditMode) {
        // Update existing tag
        const updatedTags = tags.map(tag =>
          tag.slug === slug ? { ...tag, ...formData } : tag
        );
        setTags(updatedTags);
      } else {
        // Add new tag
        const newTag = { ...formData };
        setTags([...tags, newTag]);
      }

      navigate('/tags');
    } catch {
      alert('Failed to save tag');
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tags')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">
              {isEditMode ? 'Edit Tag' : 'New Tag'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isEditMode ? `Editing: ${formData.name}` : 'Create a new tag for organizing content'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/tags')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tag Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Quick Recipes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              placeholder="e.g., quick-recipes"
              disabled={isEditMode}
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs (cannot be changed after creation)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-12 h-10 rounded border cursor-pointer"
            />
            <Input
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="#FF6B6B"
              className="font-mono"
            />
            <div
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: formData.color }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Choose a color to visually distinguish this tag
          </p>
        </div>
      </div>
    </div>
  );
};

export default TagEditor;