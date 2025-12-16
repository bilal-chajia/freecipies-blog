import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Plus, Edit, Trash2, Search, Star } from 'lucide-react';
import { authorsAPI } from '../../services/api';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';

const AuthorsList = () => {
  const location = useLocation();
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(null); // Track which author is being updated
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    authorToDelete: null
  });

  // Ref to prevent duplicate API calls in React Strict Mode
  const isLoadingRef = useRef(false);

  // Load authors from API - reload when navigating back with refresh state
  useEffect(() => {
    if (!isLoadingRef.current) {
      loadAuthors();
    }
  }, [location.state?.refresh]);

  const loadAuthors = async () => {
    if (isLoadingRef.current) return; // Prevent duplicate calls
    isLoadingRef.current = true;

    try {
      setLoading(true);
      setError('');
      const response = await authorsAPI.getAll();
      const authorsData = response.data?.data || response.data || [];
      setAuthors(Array.isArray(authorsData) ? authorsData : []);
    } catch (err) {
      console.error('Failed to load authors:', err);
      setError('Failed to load authors. Please try again.');
      setAuthors([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Filter authors based on search term
  const filteredAuthors = authors.filter(author =>
    author.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    author.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    author.job?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = async (authorSlug, field, value) => {
    if (updating) return;
    setUpdating(authorSlug);

    try {
      await authorsAPI.update(authorSlug, { [field]: value });

      // Update local state
      setAuthors(authors.map(author =>
        author.slug === authorSlug ? { ...author, [field]: value } : author
      ));
    } catch (err) {
      console.error('Failed to update author:', err);
      setError('Failed to update author. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteClick = (author) => {
    setDeleteModal({
      isOpen: true,
      authorToDelete: author
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.authorToDelete) return;

    try {
      await authorsAPI.delete(deleteModal.authorToDelete.slug);
      // Remove from local state
      setAuthors(authors.filter(a => a.slug !== deleteModal.authorToDelete.slug));
      setDeleteModal({ isOpen: false, authorToDelete: null });
    } catch (err) {
      console.error('Failed to delete author:', err);
      setError('Failed to delete author. Please try again.');
      setDeleteModal({ isOpen: false, authorToDelete: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, authorToDelete: null });
  };

  // Skeleton table row
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-muted mr-3" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 w-32 bg-muted rounded" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 w-20 bg-muted rounded" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-5 w-10 bg-muted rounded-full mx-auto" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-5 w-10 bg-muted rounded-full mx-auto" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end space-x-2">
          <div className="h-9 w-9 bg-muted rounded" />
          <div className="h-9 w-9 bg-muted rounded" />
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-28 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-full bg-muted rounded animate-pulse" />
        <div className="bg-card rounded-md border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left"><div className="h-3 w-16 bg-muted-foreground/20 rounded" /></th>
                <th className="px-6 py-3 text-left"><div className="h-3 w-12 bg-muted-foreground/20 rounded" /></th>
                <th className="px-6 py-3 text-left"><div className="h-3 w-10 bg-muted-foreground/20 rounded" /></th>
                <th className="px-6 py-3 text-center"><div className="h-3 w-14 bg-muted-foreground/20 rounded mx-auto" /></th>
                <th className="px-6 py-3 text-center"><div className="h-3 w-16 bg-muted-foreground/20 rounded mx-auto" /></th>
                <th className="px-6 py-3 text-right"><div className="h-3 w-16 bg-muted-foreground/20 rounded ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      )}

      {/* Search Bar + Add Button */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search authors by name, email or job..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Link to="/authors/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Author
          </Button>
        </Link>
      </div>

      {/* Authors Table */}
      <div className="bg-card rounded-md border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Job
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Online
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Featured
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredAuthors.length > 0 ? (
              filteredAuthors.map((author) => (
                <tr key={author.slug} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {author.imageUrl ? (
                        <img
                          src={author.imageUrl}
                          alt={author.imageAlt || author.name}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            {author.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-sm font-medium">{author.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{author.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">{author.job || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={author.isOnline}
                        onCheckedChange={(checked) => handleToggle(author.slug, 'isOnline', checked)}
                        disabled={updating === author.slug}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      {author.isOnline && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={author.isFavorite}
                        onCheckedChange={(checked) => handleToggle(author.slug, 'isFavorite', checked)}
                        disabled={updating === author.slug}
                        className="data-[state=checked]:bg-yellow-400"
                      />
                      {author.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link to={`/authors/${author.slug}`}>
                        <Button variant="outline" size="icon">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteClick(author)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                  {searchTerm ? 'No authors found matching your search' : 'No authors yet. Create your first one!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Author"
        description={`Are you sure you want to delete "${deleteModal.authorToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default AuthorsList;