import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { pinterestBoardsAPI } from '../../services/api';
import { generateSlug } from '../../utils/helpers';

const BoardEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    board_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (isEditMode) loadBoard();
  }, [id, isEditMode, loadBoard]);

  const loadBoard = async () => {
    try {
      const response = await pinterestBoardsAPI.getBySlug(id);
      const board = response.data.board;
      setFormData({
        slug: board.slug,
        name: board.name,
        description: board.description || '',
        board_url: board.board_url || '',
        is_active: board.is_active === 1,
      });
    } catch {
      alert('Failed to load board');
      navigate('/pinterest/boards');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      alert('Name and slug are required');
      return;
    }

    try {
      setSaving(true);
      if (isEditMode) {
        await pinterestBoardsAPI.update(id, formData);
      } else {
        await pinterestBoardsAPI.create(formData);
      }
      navigate('/pinterest/boards');
    } catch {
      alert('Failed to save board');
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

  const getRSSFeedURL = () => {
    const baseURL = import.meta.env.VITE_SITE_URL || 'http://localhost:4321';
    return `${baseURL}/rss/pinterest/${formData.slug}.xml`;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pinterest/boards')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">
              {isEditMode ? 'Edit Pinterest Board' : 'New Pinterest Board'}
            </h2>
            <p className="text-muted-foreground mt-1">
              Create a board to organize pins and generate RSS feeds
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/pinterest/boards')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Board Information</CardTitle>
          <CardDescription>
            Basic information about this Pinterest board
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Board Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Dinner Recipes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                disabled={isEditMode}
                placeholder="e.g., dinner-recipes"
              />
              <p className="text-xs text-muted-foreground">
                Used in RSS feed URL (cannot be changed after creation)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Brief description of this board's content"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board_url">Pinterest Board URL</Label>
            <Input
              id="board_url"
              type="url"
              value={formData.board_url}
              onChange={(e) => handleChange('board_url', e.target.value)}
              placeholder="https://pinterest.com/yourusername/board-name"
            />
            <p className="text-xs text-muted-foreground">
              Link to your actual Pinterest board (optional)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active</Label>
            <p className="text-sm text-muted-foreground ml-2">
              (Inactive boards won't appear in RSS feeds)
            </p>
          </div>
        </CardContent>
      </Card>

      {formData.slug && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>RSS Feed URL</CardTitle>
            <CardDescription>
              Use this URL with IFTTT, Zapier, or Pinterest's RSS feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <input
                type="text"
                value={getRSSFeedURL()}
                readOnly
                className="w-full bg-background px-3 py-2 rounded border font-mono text-sm"
                onClick={(e) => e.target.select()}
              />
              <p className="text-xs text-muted-foreground">
                This feed will contain pins created in the last 24 hours assigned to this board.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">1. Create the board</strong>
            <p>Save this form to create the Pinterest board in the system.</p>
          </div>
          <div>
            <strong className="text-foreground">2. Assign pins to this board</strong>
            <p>When creating pins for articles, select this board from the dropdown.</p>
          </div>
          <div>
            <strong className="text-foreground">3. Connect to automation</strong>
            <p>Use the RSS feed URL with IFTTT or Zapier to automatically post pins to Pinterest.</p>
          </div>
          <div>
            <strong className="text-foreground">4. Monitor the feed</strong>
            <p>The RSS feed updates every 5 minutes and shows pins from the last 24 hours.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BoardEditor;

