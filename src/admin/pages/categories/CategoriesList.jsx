import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Search, FolderTree, LayoutGrid, Filter, ArrowUpRight } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Badge } from '@/ui/badge.jsx';
import { categoriesAPI } from '../../services/api';
import ConfirmationModal from '@/ui/confirmation-modal.jsx';
import CategoryCard from './CategoryCard';
import { toast } from 'sonner';

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const CategoriesList = () => {
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    categoryToDelete: null
  });

  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!isLoadingRef.current) {
      loadCategories();
    }
  }, [location.state?.refresh]);

  const loadCategories = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      setError('');
      const response = await categoriesAPI.getAll();
      const categoriesData = response.data?.data || response.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories. Please try again.');
      setCategories([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const filteredCategories = categories.filter(category =>
    category.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (category) => {
    setDeleteModal({
      isOpen: true,
      categoryToDelete: category
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.categoryToDelete) return;

    try {
      await categoriesAPI.delete(deleteModal.categoryToDelete.slug);
      setCategories(categories.filter(cat => cat.slug !== deleteModal.categoryToDelete.slug));
      setDeleteModal({ isOpen: false, categoryToDelete: null });
      toast.success('Category deleted successfully');
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error('Failed to delete category');
      setDeleteModal({ isOpen: false, categoryToDelete: null });
    }
  };

  const handleUpdate = async (slug, data) => {
    if (updating) return;
    setUpdating(slug);

    try {
      await categoriesAPI.update(slug, data);
      setCategories(categories.map(cat =>
        cat.slug === slug ? { ...cat, ...data } : cat
      ));
      toast.success('Category updated');
    } catch (err) {
      console.error('Failed to update category:', err);
      toast.error('Failed to update category');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-4 w-96 bg-muted rounded-md" />
        </div>
        <div className="flex gap-4">
          <div className="h-11 flex-1 bg-muted rounded-xl" />
          <div className="h-11 w-36 bg-muted rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-2xl" />
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
            <FolderTree className="h-4 w-4" />
            Taxonomy Management
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Content Categories</h1>
          <p className="text-muted-foreground mt-1">
            Organize your recipes and articles into logical groups for better discoverability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/categories/new">
            <Button className="h-11 px-6 gap-2 shadow-sm rounded-xl">
              <Plus className="h-4 w-4" />
              New Category
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Search Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60" />
          <Input
            placeholder="Search categories by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-10 border-none bg-card shadow-sm ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="h-12 px-4 gap-2 rounded-xl bg-card border-none ring-1 ring-border/50">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Grid View</span>
          </Button>
          <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/50 rounded-lg border border-border/30">
            <span className="text-xs font-bold text-muted-foreground">{categories.length}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Total</span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={searchTerm}
        >
          {filteredCategories.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-60">
              <div className="p-4 bg-muted/50 rounded-full">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No categories found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or create a new category.</p>
              </div>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <motion.div
                key={category.slug}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <CategoryCard
                  category={category}
                  onDelete={handleDeleteClick}
                  onUpdate={handleUpdate}
                  isUpdating={updating === category.slug}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, categoryToDelete: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteModal.categoryToDelete?.label}"? This will affect all content assigned to this category.`}
        confirmText="Confirm Delete"
        cancelText="Keep Category"
      />
    </div>
  );
};

export default CategoriesList;
