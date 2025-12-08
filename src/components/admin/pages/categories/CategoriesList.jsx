import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { categoriesAPI } from '../../services/api';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';
import CategoryCard from './CategoryCard';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? 'No categories found matching your search' : 'No categories yet. Create your first one!'}
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              onDelete={handleDeleteClick}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>

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
    </div>
  );
};

export default CategoriesList;
