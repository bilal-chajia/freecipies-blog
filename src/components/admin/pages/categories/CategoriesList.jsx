import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { categoriesAPI } from '../../services/api';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';
import CategoryCard from './CategoryCard';
import { toast } from 'sonner';

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

const CategoriesList = () => {
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(null); // Track which category is being updated
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    categoryToDelete: null
  });

  // Ref to prevent duplicate API calls in React Strict Mode
  const isLoadingRef = useRef(false);

  // Load categories from API on mount and when navigating back with refresh state
  useEffect(() => {
    if (!isLoadingRef.current) {
      loadCategories();
    }
  }, [location.state?.refresh]);  // Reload when refresh timestamp changes

  const loadCategories = async () => {
    if (isLoadingRef.current) return; // Prevent duplicate calls
    isLoadingRef.current = true;

    try {
      setLoading(true);
      setError('');
      const response = await categoriesAPI.getAll();

      // Handle response format - API returns data directly
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

  // Filter categories based on search term
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

      // Remove from local state
      setCategories(categories.filter(cat => cat.slug !== deleteModal.categoryToDelete.slug));
      setDeleteModal({ isOpen: false, categoryToDelete: null });
    } catch (err) {
      console.error('Failed to delete category:', err);
      setError('Failed to delete category. Please try again.');
      setDeleteModal({ isOpen: false, categoryToDelete: null });
    }
  };

  const handleUpdate = async (slug, data) => {
    if (updating) return; // Prevent double-clicks
    setUpdating(slug);

    try {
      await categoriesAPI.update(slug, data);

      // Update local state
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

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, categoryToDelete: null });
  };

  // Skeleton card component - matches CategoryCard design
  const SkeletonCard = ({ delay = 0 }) => (
    <div
      className="relative overflow-hidden rounded-lg aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-700 dark:to-zinc-800"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Gradient overlay like real card */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Action buttons skeleton - top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
        <div className="h-3 w-3 rounded-full bg-white/20" />
        <div className="h-3 w-3 rounded-full bg-white/20" />
        <div className="w-px h-3 bg-white/10 mx-0.5" />
        <div className="h-3 w-3 rounded-full bg-white/20" />
        <div className="h-2.5 w-2.5 rounded bg-white/20" />
        <div className="h-2.5 w-2.5 rounded bg-white/20" />
      </div>

      {/* Bottom content skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="border-t border-white/20 pt-2 space-y-1.5">
          {/* Badge skeleton */}
          <div className="h-5 w-16 bg-orange-400/40 rounded-full" />
          {/* Description skeleton */}
          <div className="h-2.5 w-full bg-white/10 rounded" />
        </div>
      </div>
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
          className="space-y-4"
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <div className="h-10 w-full bg-muted rounded-md animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
          </div>

          {/* Grid skeleton - matches content grid columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <SkeletonCard key={i} delay={i * 50} />
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
          className="space-y-4"
        >

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p>{error}</p>
            </div>
          )}

          {/* Search Bar + New Category Button */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search categories..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Link to="/categories/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Category
              </Button>
            </Link>
          </div>

          {/* Categories Grid */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={searchTerm} // Re-trigger animation on search
          >
            {filteredCategories.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No categories found matching your search' : 'No categories yet. Create your first one!'}
                </p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <motion.div key={category.slug} variants={itemVariants} layout>
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

          {/* Confirmation Modal */}
          <ConfirmationModal
            isOpen={deleteModal.isOpen}
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            title="Delete Category"
            description={`Are you sure you want to delete "${deleteModal.categoryToDelete?.label}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CategoriesList;
