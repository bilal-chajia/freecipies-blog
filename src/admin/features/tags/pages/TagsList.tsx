import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, X, Check, Tag, Search, Hash, Edit } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Card } from '@/ui/card';
import { tagsAPI } from '../../../services/api';
import ConfirmationModal from '@/ui/confirmation-modal';
import { EmptyState } from '@/components/ui/EmptyState';
import ColorPicker from '@/components/ColorPicker';
import { generateSlug, getContrastColor } from '../../../utils/helpers';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 28 }
  }
};

interface TagItem {
  slug: string;
  name: string;
  color: string;
}

const TagsList = () => {
  const location = useLocation();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#ff6b35');
  const [saving, setSaving] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ff6b35');
  const [showNewColorPicker, setShowNewColorPicker] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    tagToDelete: TagItem | null;
  }>({
    isOpen: false,
    tagToDelete: null
  });

  useEffect(() => {
    fetchTags();
  }, [location.state?.refresh]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await tagsAPI.getAll();
      const apiResponse = response.data;
      const tagsData = Array.isArray(apiResponse) ? apiResponse : (apiResponse?.data || []);
      const mappedTags = tagsData.map((tag: any) => ({
        slug: tag.slug,
        name: tag.label || tag.name,
        color: tag.color || '#ff6b35'
      }));
      setTags(mappedTags);
      setError(null);
    } catch (err) {
      setError('Failed to load tags. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (tag: TagItem) => {
    setEditingId(tag.slug);
    setEditingName(tag.name);
    setEditingColor(tag.color);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('#ff6b35');
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim() || !editingId) return;

    try {
      setSaving(true);
      await tagsAPI.update(editingId, {
        label: editingName.trim(),
        color: editingColor,
        slug: editingId
      });

      setTags(tags.map(tag =>
        tag.slug === editingId
          ? { ...tag, name: editingName.trim(), color: editingColor }
          : tag
      ));
      toast.success('Tag updated');
      handleCancelEdit();
    } catch (err) {
      toast.error('Failed to update tag');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      setSaving(true);
      const newSlug = generateSlug(newTagName.trim());

      await tagsAPI.create({
        slug: newSlug,
        label: newTagName.trim(),
        color: newTagColor
      });

      const newTag = { slug: newSlug, name: newTagName.trim(), color: newTagColor };
      setTags([...tags, newTag]);
      toast.success('New tag created');
      handleCancelNew();
    } catch (err) {
      toast.error('Failed to create tag');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelNew = () => {
    setIsCreatingNew(false);
    setNewTagName('');
    setNewTagColor('#ff6b35');
  };

  const handleDeleteConfirm = async () => {
    const { tagToDelete } = deleteModal;
    if (!tagToDelete) return;
    try {
      await tagsAPI.delete(tagToDelete.slug);
      setTags(tags.filter(tag => tag.slug !== tagToDelete.slug));
      setDeleteModal({ isOpen: false, tagToDelete: null });
      toast.success('Tag deleted');
    } catch (err) {
      toast.error('Failed to delete tag');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex flex-col gap-1">
          <div className="h-6 w-48 bg-muted rounded-md" />
          <div className="h-4 w-80 bg-muted rounded-md" />
        </div>
        <div className="h-9 w-full bg-muted rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs mb-0.5 uppercase tracking-wider">
            <Tag className="size-3.5" />
            Metatags & Logic
          </div>
          <h1 className="text-xl font-bold tracking-tight text-balance">Content Tags</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            System labels to aggregate content and power smart recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreatingNew(true)} className="h-9 px-4 gap-2 shadow-xs rounded-lg" disabled={isCreatingNew}>
            <Plus className="size-3.5" />
            New Label
          </Button>
        </div>
      </div>

      {/* Modern Search Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground opacity-60" />
          <Input
            placeholder="Search tags by label or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 border border-border/80 bg-card rounded-lg focus-visible:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 bg-accent/50 rounded-lg border border-border/30 ml-auto">
          <span className="text-xs font-bold text-muted-foreground">{tags.length}</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Registered Tags</span>
        </div>
      </div>

      {/* Tags Content Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={searchTerm}
        >
          {/* Create New Block */}
          {isCreatingNew && (
            <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-4 border border-primary/30 bg-primary/5 shadow-xs rounded-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">New Label</span>
                  <button onClick={handleCancelNew} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="size-3.5" />
                  </button>
                </div>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name..."
                  className="h-8 px-2 bg-background border border-border/80 text-sm font-bold rounded-md"
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      className="h-7 w-7 rounded-md border border-border/80 shadow-xs overflow-hidden"
                      style={{ backgroundColor: newTagColor }}
                      onClick={() => setShowNewColorPicker(!showNewColorPicker)}
                    />
                    {showNewColorPicker && (
                      <div className="absolute top-9 left-0 z-50">
                        <ColorPicker color={newTagColor} onChange={(val) => setNewTagColor(val || '#ff6b35')} onClose={() => setShowNewColorPicker(false)} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <Button size="sm" className="h-8 px-3 font-bold text-[10px] uppercase tracking-wider rounded-md" onClick={handleCreateTag} disabled={!newTagName.trim() || saving}>
                    Create
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Tags List */}
          {filteredTags.length === 0 && !isCreatingNew ? (
            <div className="col-span-full">
              <EmptyState
                icon="search"
                title={tags.length === 0 ? 'No tags yet' : 'No matching tags'}
                description={tags.length === 0 ? 'Create your first tag to label and organize content.' : 'Try adjusting your search terms.'}
                actionLabel={tags.length === 0 ? 'New Label' : undefined}
                onAction={tags.length === 0 ? () => setIsCreatingNew(true) : undefined}
              />
            </div>
          ) : (
            filteredTags.map((tag) => (
              <motion.div
                key={tag.slug}
                variants={itemVariants}
                layout
                className="h-full"
              >
                <Card className={`group p-4 rounded-lg border border-border/80 shadow-xs transition-all duration-200 h-full flex flex-col ${editingId === tag.slug ? 'ring-1 ring-primary/30 border-primary/40 bg-accent/10' : 'hover:border-border hover:bg-accent/5 bg-card'}`}>
                  {editingId === tag.slug ? (
                    <div className="flex flex-col gap-3 h-full">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 px-2 bg-background border border-border/80 text-sm font-bold rounded-md"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            className="h-7 w-7 rounded-md border border-border/80 shadow-xs"
                            style={{ backgroundColor: editingColor }}
                            onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                          />
                          {showEditColorPicker && (
                            <div className="absolute top-9 left-0 z-50">
                              <ColorPicker color={editingColor} onChange={(val) => setEditingColor(val || '#ff6b35')} onClose={() => setShowEditColorPicker(false)} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1" />
                        <button onClick={handleCancelEdit} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                          <X className="size-3.5" />
                        </button>
                        <button onClick={handleSaveEdit} disabled={!editingName.trim() || saving} className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
                          <Check className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full relative">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest"
                          style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
                        >
                          {tag.name}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleStartEdit(tag)} className="p-1 hover:bg-primary/10 hover:text-primary rounded-md transition-colors">
                            <Edit className="size-3.5" />
                          </button>
                          <button onClick={() => setDeleteModal({ isOpen: true, tagToDelete: tag })} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono transition-colors group-hover:text-primary/60">
                          <Hash className="size-3" />
                          {tag.slug}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, tagToDelete: null })}
        onConfirm={handleDeleteConfirm}
        title="Remove Metadata Tag"
        description={`Removing "${deleteModal.tagToDelete?.name}" will dissociate it from all articles and recipes. This cannot be undone.`}
        confirmText="Remove Tag"
        cancelText="Cancel"
      />
    </div>
  );
};

export default TagsList;