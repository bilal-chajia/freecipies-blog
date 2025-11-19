import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { usePinterestBoardsStore } from '../../store/useStore';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';

const BoardsList = () => {
  const { boards, loading, error, setBoards } = usePinterestBoardsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    boardToDelete: null
  });

  // Load mock Pinterest boards on mount
  useEffect(() => {
    const mockBoards = [
      { id: 1, name: 'Quick Recipes', slug: 'quick-recipes', description: 'Fast and easy recipes for busy days', is_active: true, pin_count: 45 },
      { id: 2, name: 'Healthy Eating', slug: 'healthy-eating', description: 'Nutritious meals and healthy alternatives', is_active: true, pin_count: 32 },
      { id: 3, name: 'Dessert Ideas', slug: 'dessert-ideas', description: 'Sweet treats and dessert recipes', is_active: false, pin_count: 28 },
      { id: 4, name: 'Meal Prep', slug: 'meal-prep', description: 'Weekly meal planning and preparation', is_active: true, pin_count: 19 },
      { id: 5, name: 'Vegetarian Dishes', slug: 'vegetarian-dishes', description: 'Plant-based recipes and vegetarian options', is_active: true, pin_count: 37 },
    ];
    setBoards(mockBoards);
  }, [setBoards]);

  // Filter boards based on search term
  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (board) => {
    setDeleteModal({
      isOpen: true,
      boardToDelete: board
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.boardToDelete) {
      const updatedBoards = boards.filter(board => board.id !== deleteModal.boardToDelete.id);
      setBoards(updatedBoards);
      setDeleteModal({ isOpen: false, boardToDelete: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, boardToDelete: null });
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
        <h2 className="text-3xl font-bold">Pinterest Boards</h2>
        <Link to="/pinterest/boards/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Board
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search boards..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBoards.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No boards found</p>
          </div>
        ) : (
          filteredBoards.map((board) => (
            <div key={board.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">{board.name}</h3>
                <Badge variant={board.is_active ? 'default' : 'secondary'}>
                  {board.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{board.description}</p>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-muted-foreground">
                  {board.pin_count} pins
                </span>
                <span className="text-sm text-muted-foreground">
                  Slug: {board.slug}
                </span>
              </div>
              <div className="flex gap-2">
                <Link to={`/pinterest/boards/${board.id}`}>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => handleDeleteClick(board)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                {board.is_active && (
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </Button>
                )}
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
        title="Delete Board"
        description={`Are you sure you want to delete "${deleteModal.boardToDelete?.name}"? This will also delete all associated pins.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default BoardsList;
