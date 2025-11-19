import { useState, useEffect } from 'react';
import { useAuthorsStore } from '../../store/useStore';
import { Button } from '@/components/ui/button.jsx';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '@/components/ui/confirmation-modal.jsx';

const AuthorsList = () => {
  const { authors, loading, error, setAuthors } = useAuthorsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    authorToDelete: null
  });

  // Charger les auteurs au montage du composant
  useEffect(() => {
    // Simuler un chargement de données
    const mockAuthors = [
      { slug: 'john-doe', name: 'John Doe', email: 'john@example.com', bio: 'A passionate food blogger with 10 years of experience.' },
      { slug: 'jane-smith', name: 'Jane Smith', email: 'jane@example.com', bio: 'Professional chef turned recipe developer.' },
      { slug: 'robert-johnson', name: 'Robert Johnson', email: 'robert@example.com', bio: 'Food photographer and recipe tester.' },
    ];
    setAuthors(mockAuthors);
  }, [setAuthors]);

  // Filtrer les auteurs en fonction du terme de recherche
  const filteredAuthors = authors.filter(author =>
    author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    author.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (author) => {
    setDeleteModal({
      isOpen: true,
      authorToDelete: author
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.authorToDelete) {
      const updatedAuthors = authors.filter(author => author.slug !== deleteModal.authorToDelete.slug);
      setAuthors(updatedAuthors);
      setDeleteModal({ isOpen: false, authorToDelete: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, authorToDelete: null });
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
        <p>Erreur: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Authors</h1>
        <Link to="/authors/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Author
          </Button>
        </Link>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search authors..."
          className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tableau des auteurs */}
      <div className="bg-card rounded-md border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Bio
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
                    <div className="text-sm font-medium">{author.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{author.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {author.bio}
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
                <td colSpan="4" className="px-6 py-4 text-center text-muted-foreground">
                  No authors found
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