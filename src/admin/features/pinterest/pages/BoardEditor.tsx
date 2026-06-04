import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/card';
import { MediaDialog } from '@admin/features/media/components';
import { pinterestBoardsAPI } from '../../../services/api';
import { toAdminImageUrl, generateSlug, buildImageSlotFromMedia } from '../../../utils/helpers';
import { extractImage } from '@shared/utils';

const BoardEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const loadedRef = useRef(false);
  const [error, setError] = useState('');
  const [boardId, setBoardId] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    board_url: '',
    cover_image_url: '',
    is_active: false,
  });

  useEffect(() => {
    if (isEditMode && !loadedRef.current) {
      loadedRef.current = true;
      loadBoard();
    }
  }, [id]);

  const loadBoard = async () => {
    try {
      setLoading(true);
      const response = await pinterestBoardsAPI.getBySlug(id || '');
      const board = response.data?.data?.board || response.data?.board;
      if (board) {
        setBoardId(board.id);
        setFormData({
          slug: board.slug,
          name: board.name,
          description: board.description || '',
          board_url: board.board_url || '',
          cover_image_url: board.cover_image_url || '',
          is_active: board.is_active || false,
        });
      }
    } catch {
      toast.error('Failed to load board');
      navigate('/pinterest/boards');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      setError('Name and slug are required');
      return;
    }

    try {
      setSaving(true);
      if (isEditMode && boardId) {
        await pinterestBoardsAPI.update(boardId, formData);
      } else {
        await pinterestBoardsAPI.create(formData);
      }
      navigate('/pinterest/boards');
    } catch (error) {
      console.error('Error saving board:', error);
      setError('Failed to save board');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaSelect = (item: any) => {
    const slot = buildImageSlotFromMedia(item, {
      alt: item.alt_text || formData.name || '',
      variant_keys: ['sm', 'md', 'lg'],
    });
    if (slot) {
      handleChange('cover_image_url', { cover: slot });
    }
    setMediaDialogOpen(false);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const getRSSFeedURL = () => {
    const baseURL = import.meta.env.VITE_SITE_URL || window.location.origin;
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
            <h2 className="text-3xl font-bold tracking-tight text-balance">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Label>Cover Image</Label>
            <div className="flex flex-col gap-3">
              {formData.cover_image_url ? (() => {
                const imageData = typeof formData.cover_image_url === 'object' 
                  ? extractImage(formData.cover_image_url, 'hero', 1200)
                  : { imageUrl: formData.cover_image_url };
                
                const previewUrl = toAdminImageUrl(imageData.imageUrl);

                if (!previewUrl) return null;

                return (
                  <div className="relative aspect-video w-full max-w-[240px] rounded-lg border bg-muted group">
                    <img
                      src={previewUrl}
                      alt={imageData.imageAlt || "Board cover"}
                      className="h-full w-full object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleChange('cover_image_url', '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })() : (
                <div 
                  className="flex aspect-video w-full max-w-[240px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => setMediaDialogOpen(true)}
                >
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-xs">Select Image</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={formData.cover_image_url}
                  onChange={(e) => handleChange('cover_image_url', e.target.value)}
                  placeholder="Or enter image URL"
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => setMediaDialogOpen(true)}>
                  Library
                </Button>
              </div>
            </div>
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
              <Input
                type="text"
                value={getRSSFeedURL()}
                readOnly
                className="w-full font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <p className="text-xs text-muted-foreground">
                This feed will contain pins created in the last 24 hours assigned to this board.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <MediaDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        onSelect={handleMediaSelect}
      />
    </div>
  );
};

export default BoardEditor;
