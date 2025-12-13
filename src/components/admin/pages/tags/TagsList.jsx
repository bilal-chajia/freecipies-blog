import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { tagsAPI } from '../../services/api';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';
import ColorPicker from '../../components/ColorPicker';
import { generateSlug } from '../../utils/helpers';

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const TagsList = () => {
  const location = useLocation();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editing state - track which tag is being edited
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#ff6600');
  const [saving, setSaving] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);

  // New tag state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ff6600');
  const [showNewColorPicker, setShowNewColorPicker] = useState(false);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    tagToDelete: null
  });

  // Load tags from API
  useEffect(() => {
    fetchTags();
  }, [location.state?.refresh]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await tagsAPI.getAll();
      const apiResponse = response.data;
      const tagsData = Array.isArray(apiResponse) ? apiResponse : (apiResponse?.data || []);
      const mappedTags = tagsData.map(tag => ({
        slug: tag.slug,
        name: tag.label || tag.name,
        color: tag.color || '#ff6600'
      }));
      setTags(mappedTags);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  // Start editing a tag
  const handleStartEdit = (tag) => {
    setEditingId(tag.slug);
    setEditingName(tag.name);
    setEditingColor(tag.color);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('#ff6600');
  };

  // Save edited tag
  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      return;
    }

    try {
      setSaving(true);
      await tagsAPI.update(editingId, {
        label: editingName.trim(),
        color: editingColor,
        slug: editingId
      });

      // Update local state
      setTags(tags.map(tag =>
        tag.slug === editingId
          ? { ...tag, name: editingName.trim(), color: editingColor }
          : tag
      ));

      handleCancelEdit();
    } catch (err) {
      console.error('Failed to update tag:', err);
      setError('Failed to save tag: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      return;
    }

    try {
      setSaving(true);
      const newSlug = generateSlug(newTagName.trim());

      await tagsAPI.create({
        slug: newSlug,
        label: newTagName.trim(),
        color: newTagColor
      });

      // Add to local state
      setTags([...tags, {
        slug: newSlug,
        name: newTagName.trim(),
        color: newTagColor
      }]);

      // Reset new tag form
      setIsCreatingNew(false);
      setNewTagName('');
      setNewTagColor('#ff6600');
    } catch (err) {
      console.error('Failed to create tag:', err);
      setError('Failed to create tag: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Cancel new tag
  const handleCancelNew = () => {
    setIsCreatingNew(false);
    setNewTagName('');
    setNewTagColor('#ff6600');
  };

  // Delete tag
  const handleDeleteClick = (tag) => {
    setDeleteModal({ isOpen: true, tagToDelete: tag });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.tagToDelete) {
      try {
        await tagsAPI.delete(deleteModal.tagToDelete.slug);
        setTags(tags.filter(tag => tag.slug !== deleteModal.tagToDelete.slug));
        setDeleteModal({ isOpen: false, tagToDelete: null });
      } catch (err) {
        console.error('Failed to delete tag:', err);
        setError('Failed to delete tag: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, tagToDelete: null });
  };

  // Skeleton tag card
  const SkeletonTag = () => (
    <div className="p-4 rounded-lg border bg-card animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-20 bg-muted rounded-full" />
        <div className="h-5 w-5 bg-muted rounded" />
      </div>
      <div className="h-4 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-2/3 bg-muted rounded" />
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="h-9 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded mt-2 animate-pulse" />
            </div>
            <div className="h-10 w-28 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <SkeletonTag key={i} />
            ))}
          </div>
        </motion.div>
      ) : (

        <motion.div
          key="content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Tags</h2>
              <p className="text-muted-foreground mt-1">Organize your content with tags</p>
            </div>
            <Button onClick={() => setIsCreatingNew(true)} disabled={isCreatingNew}>
              <Plus className="w-4 h-4 mr-2" />
              New Tag
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Tags Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >

            {/* New Tag Card */}
            {isCreatingNew && (
              <div className="border rounded-xl p-4 bg-card border-primary/50 shadow-lg">
                {/* Editable Badge */}
                <div className="mb-4">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name..."
                    className="h-8 text-sm font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateTag();
                      if (e.key === 'Escape') handleCancelNew();
                    }}
                  />
                </div>

                {/* Preview Badge */}
                <div className="mb-4">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: newTagColor }}
                  >
                    {newTagName || 'New Tag'}
                  </span>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  {/* Color picker */}
                  <div className="relative">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-background shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50"
                      style={{ backgroundColor: newTagColor }}
                      onClick={() => setShowNewColorPicker(!showNewColorPicker)}
                      title="Click to change color"
                    />
                    {showNewColorPicker && (
                      <ColorPicker
                        color={newTagColor}
                        onChange={setNewTagColor}
                        onClose={() => setShowNewColorPicker(false)}
                        className="top-8 left-0"
                      />
                    )}
                  </div>

                  <div className="flex-1" />

                  {/* Cancel */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCancelNew}
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </Button>

                  {/* Save */}
                  <Button
                    size="icon"
                    variant="default"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || saving}
                    title="Save tag"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Tags */}
            {tags.length === 0 && !isCreatingNew ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">
                  No tags yet. Click "New Tag" to create your first one!
                </p>
              </div>
            ) : (
              tags.map((tag) => (
                <motion.div
                  key={tag.slug}
                  variants={itemVariants}
                  layout
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`border rounded-xl p-4 transition-colors bg-card ${editingId === tag.slug ? 'border-primary/50 shadow-lg' : 'hover:shadow-lg hover:border-primary/20'
                    }`}
                >
                  {editingId === tag.slug ? (
                    // Edit Mode
                    <>
                      {/* Editable Name */}
                      <div className="mb-4">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 text-sm font-medium"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                      </div>

                      {/* Preview Badge */}
                      <div className="mb-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: editingColor }}
                        >
                          {editingName || 'Tag'}
                        </span>
                      </div>

                      {/* Actions Row */}
                      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                        {/* Color picker */}
                        <div className="relative">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-background shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50"
                            style={{ backgroundColor: editingColor }}
                            onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                            title="Click to change color"
                          />
                          {showEditColorPicker && (
                            <ColorPicker
                              color={editingColor}
                              onChange={setEditingColor}
                              onClose={() => setShowEditColorPicker(false)}
                              className="top-8 left-0"
                            />
                          )}
                        </div>

                        <div className="flex-1" />

                        {/* Cancel */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          onClick={handleCancelEdit}
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </Button>

                        {/* Save */}
                        <Button
                          size="icon"
                          variant="default"
                          className="h-8 w-8 rounded-full"
                          onClick={handleSaveEdit}
                          disabled={!editingName.trim() || saving}
                          title="Save changes"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    // View Mode
                    <>
                      {/* Clickable Badge */}
                      <div className="mb-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: tag.color }}
                          onClick={() => handleStartEdit(tag)}
                          title="Click to edit"
                        >
                          {tag.name}
                        </span>
                      </div>

                      {/* Slug */}
                      <p className="text-xs text-muted-foreground font-mono mb-4">/{tag.slug}</p>

                      {/* Actions Row */}
                      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                        {/* Color indicator (view only) */}
                        <div
                          className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                          style={{ backgroundColor: tag.color }}
                          title={`Color: ${tag.color}`}
                        />

                        <div className="flex-1" />

                        {/* Delete */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(tag)}
                          title="Delete tag"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>

          {/* Confirmation Modal */}
          <ConfirmationModal
            isOpen={deleteModal.isOpen}
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            title="Delete Tag"
            description={`Are you sure you want to delete "${deleteModal.tagToDelete?.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TagsList;