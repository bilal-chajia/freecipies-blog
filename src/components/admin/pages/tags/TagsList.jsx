import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, X, Check, Tag, Search, Hash, Filter, Info, Edit } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Card } from '@/ui/card.jsx';
import { tagsAPI } from '../../services/api';
import ConfirmationModal from '@/ui/confirmation-modal.jsx';
import ColorPicker from '../../components/ColorPicker';
import { generateSlug, getContrastColor } from '../../utils/helpers';
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
    transition: { type: "spring", stiffness: 400, damping: 28 }
  }
};

const TagsList = () => {
  const location = useLocation();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#ff6600');
  const [saving, setSaving] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ff6600');
  const [showNewColorPicker, setShowNewColorPicker] = useState(false);

  const [deleteModal, setDeleteModal] = useState({
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
      const mappedTags = tagsData.map(tag => ({
        slug: tag.slug,
        name: tag.label || tag.name,
        color: tag.color || '#ff6600'
      }));
      setTags(mappedTags);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setError('Failed to load tags. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (tag) => {
    setEditingId(tag.slug);
    setEditingName(tag.name);
    setEditingColor(tag.color);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('#ff6600');
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) return;

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
      console.error('Failed to update tag:', err);
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
      console.error('Failed to create tag:', err);
      toast.error('Failed to create tag');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelNew = () => {
    setIsCreatingNew(false);
    setNewTagName('');
    setNewTagColor('#ff6600');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.tagToDelete) return;
    try {
      await tagsAPI.delete(deleteModal.tagToDelete.slug);
      setTags(tags.filter(tag => tag.slug !== deleteModal.tagToDelete.slug));
      setDeleteModal({ isOpen: false, tagToDelete: null });
      toast.success('Tag deleted');
    } catch (err) {
      console.error('Failed to delete tag:', err);
      toast.error('Failed to delete tag');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-2">
            <div className="h-9 w-64 bg-muted rounded-lg" />
            <div className="h-4 w-96 bg-muted rounded-md" />
        </div>
        <div className="h-12 w-full bg-muted rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
            <Tag className="h-4 w-4" />
            Metatags & Logic
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Content Tags</h1>
          <p className="text-muted-foreground mt-1">
            System labels to aggregate content and power smart recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreatingNew(true)} className="h-11 px-6 gap-2 shadow-sm rounded-xl" disabled={isCreatingNew}>
            <Plus className="h-4 w-4" />
            New Label
          </Button>
        </div>
      </div>

      {/* Modern Search Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60" />
          <Input
            placeholder="Search tags by label or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-10 border-none bg-card shadow-sm ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/50 rounded-lg border border-border/30 ml-auto">
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
              <Card className="p-5 border-2 border-primary/20 bg-primary/5 shadow-lg rounded-2xl flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">New Label</span>
                    <button onClick={handleCancelNew} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                 </div>
                 <Input
                   value={newTagName}
                   onChange={(e) => setNewTagName(e.target.value)}
                   placeholder="Enter tag name..."
                   className="h-9 px-3 bg-background border-none ring-1 ring-border/50 text-sm font-bold"
                   autoFocus
                 />
                 <div className="flex items-center gap-3">
                   <div className="relative">
                      <button 
                        className="h-8 w-8 rounded-full border-2 border-background shadow-md overflow-hidden ring-1 ring-border/40"
                        style={{ backgroundColor: newTagColor }}
                        onClick={() => setShowNewColorPicker(!showNewColorPicker)}
                      />
                      {showNewColorPicker && (
                        <div className="absolute top-10 left-0 z-50">
                           <ColorPicker color={newTagColor} onChange={setNewTagColor} onClose={() => setShowNewColorPicker(false)} />
                        </div>
                      )}
                   </div>
                   <div className="flex-1" />
                   <Button size="sm" className="h-8 px-4 font-bold text-[11px] uppercase tracking-wider" onClick={handleCreateTag} disabled={!newTagName.trim() || saving}>
                      Create
                   </Button>
                 </div>
              </Card>
            </motion.div>
          )}

          {/* Tags List */}
          {filteredTags.length === 0 && !isCreatingNew ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40">
               <Hash className="h-10 w-10 mb-2" />
               <p className="text-sm font-medium">No matching tags found</p>
            </div>
          ) : (
            filteredTags.map((tag) => (
              <motion.div
                key={tag.slug}
                variants={itemVariants}
                layout
                className="h-full"
              >
                <Card className={`group p-5 rounded-2xl border border-border/50 shadow-sm transition-all duration-300 h-full flex flex-col ${editingId === tag.slug ? 'ring-2 ring-primary/20 border-primary/40 bg-accent/20' : 'hover:shadow-md hover:border-primary/20 bg-card'}`}>
                  {editingId === tag.slug ? (
                    <div className="flex flex-col gap-3 h-full">
                       <Input
                         value={editingName}
                         onChange={(e) => setEditingName(e.target.value)}
                         className="h-9 px-3 bg-background border-none ring-1 ring-border/50 text-sm font-bold"
                         autoFocus
                       />
                       <div className="flex items-center gap-2">
                          <div className="relative">
                             <button 
                               className="h-7 w-7 rounded-full border-2 border-background shadow-sm ring-1 ring-border/40"
                               style={{ backgroundColor: editingColor }}
                               onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                             />
                             {showEditColorPicker && (
                               <div className="absolute top-9 left-0 z-50">
                                  <ColorPicker color={editingColor} onChange={setEditingColor} onClose={() => setShowEditColorPicker(false)} />
                               </div>
                             )}
                          </div>
                          <div className="flex-1" />
                          <button onClick={handleCancelEdit} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                             <X className="h-4 w-4" />
                          </button>
                          <button onClick={handleSaveEdit} disabled={!editingName.trim() || saving} className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors">
                             <Check className="h-4 w-4" />
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full relative">
                       <div className="flex items-start justify-between mb-4">
                          <div 
                             className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm"
                             style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
                          >
                             {tag.name}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleStartEdit(tag)} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                                <Edit className="h-3.5 w-3.5" />
                             </button>
                             <button onClick={() => setDeleteModal({ isOpen: true, tagToDelete: tag })} className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                             </button>
                          </div>
                       </div>
                       <div className="mt-auto">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono transition-colors group-hover:text-primary/60">
                             <Hash className="h-3 w-3" />
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