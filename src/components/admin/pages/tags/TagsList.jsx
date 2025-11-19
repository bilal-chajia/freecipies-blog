import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { useTagsStore } from '../../store/useStore';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';

const TagsList = () => {
  const { tags, loading, error, setTags } = useTagsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    tagToDelete: null
  });

  // Load mock tags on mount
  useEffect(() => {
    const mockTags = [
      { slug: 'quick-recipes', name: 'Quick Recipes', color: '#FF6B6B' },
      { slug: 'healthy-eating', name: 'Healthy Eating', color: '#4ECDC4' },
      { slug: 'baking', name: 'Baking', color: '#45B7D1' },
      { slug: 'vegetarian', name: 'Vegetarian', color: '#96CEB4' },
      { slug: 'gluten-free', name: 'Gluten Free', color: '#FFEAA7' },
      { slug: 'meal-prep', name: 'Meal Prep', color: '#DDA0DD' },
      { slug: 'dinner-ideas', name: 'Dinner Ideas', color: '#98D8C8' },
      { slug: 'breakfast', name: 'Breakfast', color: '#F7DC6F' },
    ];
    setTags(mockTags);
  }, [setTags]);

  // Filter tags based on search term
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (tag) => {
    setDeleteModal({
      isOpen: true,
      tagToDelete: tag
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.tagToDelete) {
      const updatedTags = tags.filter(tag => tag.slug !== deleteModal.tagToDelete.slug);
      setTags(updatedTags);
      setDeleteModal({ isOpen: false, tagToDelete: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, tagToDelete: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Tags</h2>
        <Link to="/tags/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Tag
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tags..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTags.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No tags found</p>
          </div>
        ) : (
          filteredTags.map((tag) => (
            <div key={tag.slug} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: tag.color }}
                  />
                  <h3 className="font-bold text-lg">{tag.name}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Slug: {tag.slug}</p>
              <div className="flex gap-2">
                <Link to={`/tags/${tag.slug}`}>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => handleDeleteClick(tag)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

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
    </div>
  );
};

export default TagsList;