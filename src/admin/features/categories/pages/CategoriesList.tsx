import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router';
import { Plus, Search, FolderTree, LayoutGrid } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { categoriesAPI } from '../../../services/api';
import ConfirmationModal from '@/ui/confirmation-modal';
import { EmptyState } from '@/components/ui/EmptyState';
import CategoryCard from './CategoryCard';
import { toast } from 'sonner';
import type { Category } from '@modules/categories/schema/categories.schema';
import { useCategoriesStore } from '@/store/useStore';

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

interface DeleteModalState {
  isOpen: boolean;
  categoryToDelete: Category | null;
}

const CategoriesList = () => {
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categoriesData = (response.data as any)?.data || (response.data as any) || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch {
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

  const handleDeleteClick = (category: Category) => {
    setDeleteModal({
      isOpen: true,
      categoryToDelete: category
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.categoryToDelete) return;

    try {
      await categoriesAPI.delete(deleteModal.categoryToDelete.slug);
      useCategoriesStore.getState().setCategories([]);
      setCategories(categories.filter(cat => cat.slug !== deleteModal.categoryToDelete!.slug));
      setDeleteModal({ isOpen: false, categoryToDelete: null });
      toast.success('Category deleted successfully');
    } catch {
      toast.error('Failed to delete category');
      setDeleteModal({ isOpen: false, categoryToDelete: null });
    }
  };

  const handleUpdate = async (slug: string, data: Partial<Category>) => {
    if (updating) return;
    setUpdating(slug);

    try {
      await categoriesAPI.update(slug, data);
      useCategoriesStore.getState().setCategories([]);
      setCategories(categories.map(cat =>
        cat.slug === slug ? { ...cat, ...data } : cat
      ));
      toast.success('Category updated');
    } catch {
      toast.error('Failed to update category');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex flex-col gap-1.5">
          <div className="h-6 w-48 bg-muted rounded-md" />
          <div className="h-3 w-80 bg-muted rounded-md" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 flex-1 bg-muted rounded-lg" />
          <div className="h-9 w-28 bg-muted rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[10px] mb-0.5 uppercase tracking-wider">
            <FolderTree className="h-3.5 w-3.5" />
            Taxonomy Management
          </div>
          <h1 className="text-xl font-bold tracking-tight text-balance">Content Categories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize your recipes and articles into logical groups for better discoverability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/categories/new">
            <Button className="h-9 px-4 gap-2 shadow-sm rounded-lg text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Category
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Search Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-60" />
          <Input
            placeholder="Search categories by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9 border border-border/80 bg-card shadow-xs rounded-lg text-xs focus-visible:ring-primary/20 focus-visible:ring-offset-0 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="h-9 px-3 gap-2 rounded-lg bg-card border border-border/80 text-xs">
            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Grid View</span>
          </Button>
          <div className="h-5 w-px bg-border/50 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md border border-border/80">
            <span className="text-xs font-bold text-muted-foreground">{categories.length}</span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60">Total</span>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        layout
      >
        <AnimatePresence>
          {filteredCategories.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon="categories"
                title="No categories found"
                description={categories.length === 0 ? 'Create your first category to organize content.' : 'Try adjusting your search terms.'}
                actionLabel={categories.length === 0 ? 'New Category' : undefined}
                actionHref={categories.length === 0 ? '/categories/new' : undefined}
              />
            </div>
          ) : (
            filteredCategories.map((category) => (
              <motion.div
                key={category.slug}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
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
        </AnimatePresence>
      </motion.div>

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
