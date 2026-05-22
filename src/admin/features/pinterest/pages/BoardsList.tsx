import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ExternalLink, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Badge } from '@/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/ui/card';
import { pinterestBoardsAPI } from '../../../services/api';
import { toAdminImageUrl } from '../../../utils/helpers';
import { extractImage } from '@shared/utils';
import ConfirmationModal from '@/ui/confirmation-modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

interface PinterestBoard {
  id: string | number;
  name: string;
  description?: string | null;
  slug: string;
  cover_image_url?: any;
  is_active?: boolean;
  board_url?: string | null;
}

const BoardsList = () => {
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    boardToDelete: PinterestBoard | null;
  }>({
    isOpen: false,
    boardToDelete: null
  });

  // Load boards from API on mount
  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pinterestBoardsAPI.getAll();
      const data = response.data?.data || response.data?.boards || response.data || [];
      setBoards(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load boards');
      toast.error('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  // Filter boards based on search term
  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (board: PinterestBoard) => {
    setDeleteModal({
      isOpen: true,
      boardToDelete: board
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.boardToDelete) {
      try {
        await pinterestBoardsAPI.delete(deleteModal.boardToDelete.id);
        toast.success('Board deleted successfully');
        loadBoards(); // Reload boards from API
      } catch (err) {
        toast.error('Failed to delete board');
      }
      setDeleteModal({ isOpen: false, boardToDelete: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, boardToDelete: null });
  };

  // Skeleton board card
  const SkeletonBoard = () => (
    <div className="border border-border/80 bg-card rounded-lg p-3 animate-pulse shadow-xs">
      <div className="aspect-video w-full bg-muted relative overflow-hidden rounded-md" />
      <div className="p-3">
        <div className="h-5 w-32 bg-muted rounded mb-2" />
        <div className="h-4 w-full bg-muted rounded mb-3" />
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="flex gap-2">
          <div className="h-7 w-14 bg-muted rounded" />
          <div className="h-7 w-16 bg-muted rounded" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-muted rounded animate-pulse" />
            <div className="h-9 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonBoard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-md">
        <p>Error: {error}</p>
        <Button variant="outline" onClick={loadBoards} className="mt-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Search Bar + Buttons */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 size-3.5 text-muted-foreground opacity-60"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <Input
            type="text"
            placeholder="Search boards..."
            className="h-9 pl-9 border border-border/80 bg-card rounded-lg focus-visible:ring-primary/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadBoards} className="h-9 px-3 rounded-lg border border-border/80 shadow-xs">
          <RefreshCw className="size-3.5 mr-1.5 animate-spin-slow" />
          Refresh
        </Button>
        <Link to="/pinterest/boards/new">
          <Button size="sm" className="h-9 px-4 rounded-lg shadow-xs">
            <Plus className="size-3.5 mr-1.5" />
            New Board
          </Button>
        </Link>
      </div>

      {/* Boards Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {filteredBoards.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon="pinterest"
              title={boards.length === 0 ? 'No boards yet' : 'No boards found'}
              description={boards.length === 0 ? 'Create your first Pinterest board to organize your pins.' : 'Try adjusting your search terms.'}
              actionLabel={boards.length === 0 ? 'New Board' : undefined}
              actionHref={boards.length === 0 ? '/pinterest/boards/new' : undefined}
            />
          </div>
        ) : (
          filteredBoards.map((board) => (
            <motion.div
              key={board.id}
              variants={itemVariants}
              layout
            >
              <Card className="overflow-hidden flex flex-col group h-full rounded-lg border border-border/80 bg-card shadow-xs hover:border-border hover:bg-accent/5 transition-all duration-200">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  {(() => {
                    if (!board.cover_image_url) return (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <ImageIcon size={32} />
                      </div>
                    );

                    const imageSlot = typeof board.cover_image_url === 'object' 
                      ? board.cover_image_url 
                      : { hero: { url: board.cover_image_url } };
                    
                    const { imageUrl, imageAlt } = extractImage(imageSlot, 'hero', 1200);
                    const previewUrl = toAdminImageUrl(imageUrl);

                    if (!previewUrl) return (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <ImageIcon size={32} />
                      </div>
                    );

                    return (
                      <img 
                        src={previewUrl} 
                        alt={imageAlt || board.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    );
                  })()}
                  <div className="absolute top-2 right-2">
                    <Badge variant={board.is_active ? "default" : "secondary"} className="rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                      {board.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm font-bold line-clamp-1">{board.name}</CardTitle>
                </CardHeader>
                
                <CardContent className="p-3 pt-0 flex-1">
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                    {board.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60">
                    <span>Slug: {board.slug}</span>
                  </div>
                </CardContent>

                <CardFooter className="p-3 pt-0 gap-1.5 mt-auto">
                  <Link to={`/pinterest/boards/${board.slug}`}>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs rounded-md border border-border/80 shadow-xs">
                      <Edit className="size-3.5 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs rounded-md border border-border/80 shadow-xs text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => handleDeleteClick(board)}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Delete
                  </Button>
                  {board.board_url && (
                    <a href={board.board_url} target="_blank" rel="noopener noreferrer" className="ml-auto">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-md hover:bg-accent/10">
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </a>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Board"
        description={`Are you sure you want to delete "${deleteModal.boardToDelete?.name}"? This will also unassign all pins from this board.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default BoardsList;
