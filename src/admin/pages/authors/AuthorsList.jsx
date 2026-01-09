import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Switch } from '@/ui/switch.jsx';
import {
  Plus,
  Search,
  Users,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Briefcase,
  Eye,
  EyeOff,
  LayoutGrid
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/ui/dropdown-menu.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar.jsx';
import { Badge } from '@/ui/badge.jsx';
import { authorsAPI } from '../../services/api';
import ConfirmationModal from '@/ui/confirmation-modal.jsx';
import { toast } from 'sonner';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';

const AuthorsList = () => {
  const location = useLocation();
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    authorToDelete: null
  });

  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!isLoadingRef.current) {
      loadAuthors();
    }
  }, [location.state?.refresh]);

  const loadAuthors = async () => {
    if (isLoadingRef.current) return;
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
      setAuthors(authors.map(author =>
        author.slug === authorSlug ? { ...author, [field]: value } : author
      ));
      toast.success(`${field === 'isOnline' ? 'Visibility' : 'Featured status'} updated`);
    } catch (err) {
      console.error('Failed to update author:', err);
      toast.error('Failed to update author');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.authorToDelete) return;

    try {
      await authorsAPI.delete(deleteModal.authorToDelete.slug);
      setAuthors(authors.filter(a => a.slug !== deleteModal.authorToDelete.slug));
      setDeleteModal({ isOpen: false, authorToDelete: null });
      toast.success('Author removed successfully');
    } catch (err) {
      console.error('Failed to delete author:', err);
      toast.error('Failed to delete author');
      setDeleteModal({ isOpen: false, authorToDelete: null });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-4 w-96 bg-muted rounded-md" />
        </div>
        <div className="h-12 w-full bg-muted rounded-xl" />
        <div className="bg-card rounded-2xl border border-border/50 h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
            <Users className="h-4 w-4" />
            Team & Contributors
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Author Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content creators, their profiles, and featured status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/authors/new">
            <Button className="h-11 px-6 gap-2 shadow-sm rounded-xl">
              <Plus className="h-4 w-4" />
              Add New Author
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Search Actions */}
      <div className="relative w-full max-w-2xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60" />
        <Input
          placeholder="Filter authors by name, role, or contact info..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-12 pl-10 border-none bg-card shadow-sm ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all"
        />
      </div>

      {/* Authors Content */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Author Details</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Contact</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell text-center">Featured</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Visibility</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <AnimatePresence mode="popLayout">
                  {filteredAuthors.length > 0 ? (
                    filteredAuthors.map((author) => (
                      <motion.tr
                        key={author.slug}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-accent/30 transition-colors group"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border-2 border-background shadow-sm ring-1 ring-border/50">
                              {(() => {
                                const avatar = extractImage(author.imagesJson, 'avatar', 120);
                                const avatarUrl = toAdminImageUrl(avatar.imageUrl || author.imageUrl || '');
                                const avatarSrcSet = toAdminSrcSet(getImageSrcSet(author.imagesJson, 'avatar'));
                                const avatarStyle = buildImageStyle(avatar);
                                return (
                                  <AvatarImage
                                    src={avatarUrl}
                                    alt={author.name}
                                    srcSet={avatarSrcSet || undefined}
                                    sizes={avatarSrcSet ? '44px' : undefined}
                                    className="object-cover"
                                    style={avatarStyle}
                                  />
                                );
                              })()}
                              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold uppercase">
                                {author.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-sm tracking-tight">{author.name}</div>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mt-0.5">
                                <Briefcase className="h-3 w-3" />
                                {author.job || 'Contributor'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 opacity-60" />
                            {author.email}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap hidden lg:table-cell">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggle(author.slug, 'isFavorite', !author.isFavorite)}
                              className={`p-2 rounded-lg transition-all ${author.isFavorite ? 'bg-yellow-400/10 text-yellow-500' : 'hover:bg-muted text-muted-foreground/30'}`}
                            >
                              <Star className={`h-4 w-4 ${author.isFavorite ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-3">
                            <Switch
                              checked={author.isOnline}
                              onCheckedChange={(checked) => handleToggle(author.slug, 'isOnline', checked)}
                              disabled={updating === author.slug}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                            {author.isOnline ? (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold uppercase">Live</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[10px] font-bold uppercase">Hidden</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl">
                              <DropdownMenuItem asChild>
                                <Link to={`/authors/${author.slug}`} className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/articles?author=${author.slug}`} className="cursor-pointer">
                                  <LayoutGrid className="mr-2 h-4 w-4" />
                                  View Articles
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggle(author.slug, 'isFavorite', !author.isFavorite)}
                                className="cursor-pointer text-yellow-600 dark:text-yellow-400"
                              >
                                <Star className={`mr-2 h-4 w-4 ${author.isFavorite ? 'fill-current' : ''}`} />
                                {author.isFavorite ? 'Remove Featured' : 'Make Featured'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteModal({ isOpen: true, authorToDelete: author })}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Author
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                          <Users className="h-10 w-10 text-muted-foreground" />
                          <p className="font-medium text-sm">No authors found matching your criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, authorToDelete: null })}
        onConfirm={handleDeleteConfirm}
        title="Remove Contributor"
        description={`Are you sure you want to remove "${deleteModal.authorToDelete?.name}"? All content created by this author will remain but will not have an associated profile.`}
        confirmText="Remove Author"
        cancelText="Cancel"
      />
    </div>
  );
};

export default AuthorsList;
