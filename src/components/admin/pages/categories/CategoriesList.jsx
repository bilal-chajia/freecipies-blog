import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { categoriesAPI } from '../../services/api';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';
import CategoryCard from './CategoryCard';

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
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    categoryToDelete: null
  });

  // Load categories from API on mount and when navigating back with refresh state
  useEffect(() => {
    loadCategories();
  }, [location.state?.refresh]);  // Reload when refresh timestamp changes

  const loadCategories = async () => {
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
    try {
      await categoriesAPI.update(slug, data);

      // Update local state
      setCategories(categories.map(cat =>
        cat.slug === slug ? { ...cat, ...data } : cat
      ));
    } catch (err) {
      console.error('Failed to update category:', err);
      // Revert optimistic update or show error toast (optional)
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, categoryToDelete: null });
  };

  // Skeleton card component
  const SkeletonCard = () => (
    <div className="relative overflow-hidden rounded-xl aspect-square bg-muted animate-pulse">
      {/* Gradient overlay skeleton */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {/* Bottom content skeleton */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-6 w-20 bg-white/20 rounded-full" />
        <div className="h-3 w-full bg-white/10 rounded" />
        <div className="h-3 w-3/4 bg-white/10 rounded" />
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
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-40 bg-muted rounded animate-pulse" />
            <div className="h-10 w-36 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
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
            <h2 className="text-3xl font-bold">Categories</h2>
            <Link to="/categories/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Category
              </Button>
            </Link>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p>{error}</p>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categories Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
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
