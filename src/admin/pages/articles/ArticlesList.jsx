import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Eye,
  EyeOff,
  Star,
  Edit,
  Trash2,
  MoreVertical,
  ImagePlus,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Utensils,
  Layers,
} from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Badge } from '@/ui/badge.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/ui/dropdown-menu.jsx';
import { Avatar, AvatarImage, AvatarFallback } from '@/ui/avatar.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/ui/card.jsx';
import DataTable from '@/ui/data-table.jsx';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../services/api';
import { formatDate, formatRelativeTime, formatNumber, truncate, debounce, getStatusColor } from '../../utils/helpers';
import { useArticlesStore, useCategoriesStore, useAuthorsStore, useTagsStore } from '../../store/useStore';
import PinCreator from '../../components/pins/PinCreator';
import ArticleFilters from './ArticleFilters';

const ArticlesList = ({ fixedType = null }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type') || 'all';

  // fixedType takes priority over URL param
  const effectiveType = fixedType || urlType;

  const { articles, filters, pagination, setArticles, setFilters, setPagination } = useArticlesStore();
  const { categories, setCategories } = useCategoriesStore();
  const { authors, setAuthors } = useAuthorsStore();
  const { tags, setTags } = useTagsStore();
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [localFilters, setLocalFilters] = useState({
    search: '',
    type: effectiveType,
    category: 'all',
    author: 'all',
    status: 'all',
    tags: [],
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pin Creator state
  const [showPinCreator, setShowPinCreator] = useState(false);
  const [selectedArticleForPin, setSelectedArticleForPin] = useState(null);

  // Sync type filter from URL params (when navigating from sidebar)
  // Skip if fixedType is provided (component is used as wrapper)
  useEffect(() => {
    if (!fixedType && effectiveType !== localFilters.type) {
      setLocalFilters(prev => ({ ...prev, type: effectiveType }));
      setFilters({ type: effectiveType });
      setPagination({ page: 1 });
    }
  }, [effectiveType, fixedType]);

  // Initialize filter from fixedType on mount
  useEffect(() => {
    if (fixedType) {
      setFilters({ type: fixedType });
    }
  }, [fixedType]);

  useEffect(() => {
    loadCategories();
    loadAuthors();
    loadTags();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [filters, pagination.page, fixedType]);

  const loadArticles = async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Prioritize fixedType if set
      const typeToUse = fixedType || filters.type;
      if (typeToUse && typeToUse !== 'all') params.type = typeToUse;
      if (filters.category && filters.category !== 'all') params.category = filters.category;
      if (filters.author && filters.author !== 'all') params.author = filters.author;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await articlesAPI.getAll(params);

      if (response.data.success) {
        const articlesData = response.data.data || [];
        const paginationData = response.data.pagination || {};

        setArticles(articlesData);
        setPagination({
          ...pagination,
          total: paginationData.total || articlesData.length,
          totalPages: paginationData.totalPages || Math.ceil(articlesData.length / pagination.limit),
        });
      } else {
        setArticles([]);
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.data.success) setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAuthors = async () => {
    try {
      const response = await authorsAPI.getAll();
      if (response.data.success) setAuthors(response.data.data);
    } catch (error) {
      console.error('Failed to load authors:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      if (response.data.success) setTags(response.data.data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleRowSelectionChange = (selectedRows) => {
    setSelectedRows(selectedRows);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await articlesAPI.delete(id);
      loadArticles();
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  const handleToggleOnline = async (id) => {
    try {
      await articlesAPI.toggleOnline(id);
      loadArticles();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const debouncedSearch = useCallback(
    debounce((value) => {
      setFilters({ search: value });
      setPagination({ page: 1 });
    }, 500),
    []
  );

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);

    if (key === 'search') {
      debouncedSearch(value);
    } else {
      setFilters({ [key]: value });
      setPagination({ page: 1 });
    }
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      type: 'all',
      category: 'all',
      author: 'all',
      status: 'all',
      tags: [],
      dateFrom: '',
      dateTo: '',
    };
    setLocalFilters(clearedFilters);
    setFilters(clearedFilters);
    setPagination({ page: 1 });
  };

  const hasActiveFilters = useMemo(() => {
    return Object.entries(localFilters).some(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== '' && value !== 'all';
    });
  }, [localFilters]);

  const columns = useMemo(() => [
    {
      accessorKey: 'label',
      header: 'Article Content',
      cell: ({ row }) => {
        const article = row.original;
        return (
          <div className="flex items-center gap-4 py-1">
            <div className="relative group">
              <img
                src={article.imageUrl || '/placeholder-image.jpg'}
                alt={article.label}
                className="w-16 h-16 rounded-xl object-cover shadow-sm ring-1 ring-border/50 transition-all group-hover:ring-primary/50"
              />
              {article.isFavorite && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-current" />
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/articles/edit/${article.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate max-w-[280px]"
                >
                  {article.label}
                </Link>
                {article.type === 'recipe' && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider h-4 px-1.5 border-orange-500/30 text-orange-600 bg-orange-50">
                    Recipe
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{article.categoryLabel}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(article.viewCount || 0)}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'authorName',
      header: 'Author',
      cell: ({ row }) => {
        const article = row.original;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-1 ring-border/50">
              <AvatarImage src={article.authorAvatar} />
              <AvatarFallback className="text-[10px] font-bold">
                {(article.authorName || 'A').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{article.authorName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isOnline = row.original.isOnline;
        return (
          <Badge
            variant={isOnline ? "success" : "secondary"}
            className={`gap-1 px-2.5 py-0.5 font-medium ${isOnline ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}`}
          >
            {isOnline ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {isOnline ? 'Published' : 'Draft'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'publishedAt',
      header: 'Published Date',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {formatDate(row.original.publishedAt || row.original.createdAt, 'MMM dd, yyyy')}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(row.original.publishedAt || row.original.createdAt)}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const article = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 group"
              onClick={() => navigate(`/articles/edit/${article.id}`)}
              title="Edit"
            >
              <Edit className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent rounded-full">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Article Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open(`/articles/${article.slug}`, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Live Site
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleOnline(article.id)}>
                  {article.isOnline ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Move to Drafts
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Publish Now
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setSelectedArticleForPin(article);
                  setShowPinCreator(true);
                }}>
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Create Pinterest Pin
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(article.id)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Article
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [navigate]);

  const getPageTitle = () => {
    switch (effectiveType) {
      case 'recipe': return 'Recipes';
      case 'roundup': return 'Roundups';
      case 'article': return 'Articles';
      default: return 'Articles & Recipes';
    }
  };

  const getPageDescription = () => {
    switch (effectiveType) {
      case 'recipe': return 'Manage your culinary creations and cooking instructions.';
      case 'roundup': return 'Curate collections of your best content.';
      default: return 'Manage your content library, track performance, and publish new stories.';
    }
  };

  const getNewButtonLabel = () => {
    switch (effectiveType) {
      case 'recipe': return 'New Recipe';
      case 'roundup': return 'New Roundup';
      case 'article': return 'New Article';
      default: return 'New Content';
    }
  };

  const handleNewClick = () => {
    if (fixedType === 'recipe') navigate('/recipes/new');
    else if (fixedType === 'roundup') navigate('/roundups/new');
    else if (fixedType === 'article') navigate('/articles/new');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{getPageTitle()}</h1>
          <p className="text-muted-foreground mt-1">
            {getPageDescription()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fixedType ? (
            <Button className="h-10 px-6 gap-2 shadow-sm" onClick={handleNewClick}>
              <Plus className="h-4 w-4" />
              {getNewButtonLabel()}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 px-6 gap-2 shadow-sm">
                  <Plus className="h-4 w-4" />
                  New Content
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Choose Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/articles/new')} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" />
                  <span>New Article</span>
                  <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">Standard post</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/recipes/new')} className="cursor-pointer">
                  <Utensils className="w-4 h-4 mr-2 text-orange-500" />
                  <span>New Recipe</span>
                  <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">With ingredients</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/roundups/new')} className="cursor-pointer">
                  <Layers className="w-4 h-4 mr-2 text-purple-500" />
                  <span>New Roundup</span>
                  <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">Collection</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-none shadow-none ring-1 ring-primary/20">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Total Articles</p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-none shadow-none ring-1 ring-green-500/20">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Published</p>
              <p className="text-2xl font-bold">{articles.filter(a => a.isOnline).length}</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        {/* Placeholder for other stats */}
      </div>

      <div className="space-y-4">
        <ArticleFilters
          localFilters={localFilters}
          onFilterChange={handleFilterChange}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          categories={categories}
          authors={authors}
          tags={tags}
        />

        {/* Bulk Actions Banner */}
        {selectedRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-xl shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {selectedRows.length}
              </div>
              <span className="text-sm font-medium text-primary">
                {selectedRows.length} items selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 border-primary/30 text-primary hover:bg-primary/20">
                Bulk Status
              </Button>
              <Button variant="destructive" size="sm" className="h-8 shadow-sm">
                Delete Selected
              </Button>
            </div>
          </motion.div>
        )}

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={articles}
            loading={loading}
            enableRowSelection={true}
            enableSorting={true}
            enableFiltering={false}
            enablePagination={true}
            pageSize={pagination.limit}
            pageSizeOptions={[10, 20, 50]}
            onRowSelectionChange={handleRowSelectionChange}
          />
        </div>
      </div>

      {/* Pin Creator Dialog */}
      <PinCreator
        open={showPinCreator}
        onOpenChange={setShowPinCreator}
        article={selectedArticleForPin}
        onPinCreated={() => {
          setShowPinCreator(false);
          setSelectedArticleForPin(null);
        }}
      />
    </div>
  );
};

export default ArticlesList;
