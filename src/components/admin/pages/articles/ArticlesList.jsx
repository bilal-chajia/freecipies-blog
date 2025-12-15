import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  EyeOff,
  Star,
  Edit,
  Trash2,
  MoreVertical,
  ImagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import DataTable from '@/components/ui/data-table.jsx';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../services/api';
import { formatDate, formatNumber, truncate, debounce } from '../../utils/helpers';
import { useArticlesStore, useCategoriesStore, useAuthorsStore, useTagsStore } from '../../store/useStore';
import PinCreator from '../../components/pins/PinCreator';
import ArticleFilters from './ArticleFilters';

const ArticlesList = () => {
  const navigate = useNavigate();
  const { articles, filters, pagination, setArticles, setFilters, setPagination } = useArticlesStore();
  const { categories, setCategories } = useCategoriesStore();
  const { authors, setAuthors } = useAuthorsStore();
  const { tags, setTags } = useTagsStore();
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [localFilters, setLocalFilters] = useState({
    search: '',
    type: 'all',
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

  useEffect(() => {
    loadCategories();
    loadAuthors();
    loadTags();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [filters, pagination.page]);

  const loadArticles = async () => {
    try {
      setLoading(true);

      // Build query params for API
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.type && filters.type !== 'all') {
        params.type = filters.type;
      }
      if (filters.category && filters.category !== 'all') {
        params.category = filters.category;
      }
      if (filters.author && filters.author !== 'all') {
        params.author = filters.author;
      }
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      // Call the API
      const response = await articlesAPI.getAll(params);

      if (response.data.success) {
        const articlesData = response.data.data || [];
        const paginationData = response.data.pagination || {};

        // Update store
        setArticles(articlesData);
        setPagination({
          ...pagination,
          total: paginationData.total || articlesData.length,
          totalPages: paginationData.totalPages || Math.ceil(articlesData.length / pagination.limit),
        });
      } else {
        console.error('Failed to load articles:', response.data.message);
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
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAuthors = async () => {
    try {
      const response = await authorsAPI.getAll();
      if (response.data.success) {
        setAuthors(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load authors:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleRowSelectionChange = (selectedRows) => {
    setSelectedRows(selectedRows);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedRows.length} selected article${selectedRows.length !== 1 ? 's' : ''}?`)) return;

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      loadArticles();
      setSelectedRows([]);
    } catch (error) {
      console.error('Failed to delete articles:', error);
      alert('Failed to delete some articles');
    }
  };

  const handleBulkToggleOnline = async (online) => {
    if (selectedRows.length === 0) return;

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      loadArticles();
      setSelectedRows([]);
    } catch (error) {
      console.error('Failed to toggle articles:', error);
      alert('Failed to update articles');
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      loadArticles();
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('Failed to delete article');
    }
  };

  const handleToggleOnline = async (slug) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      loadArticles();
    } catch (error) {
      console.error('Failed to toggle online status:', error);
    }
  };

  const handleToggleFavorite = async (slug) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      loadArticles();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value) => {
      setFilters({ search: value });
      setPagination({ page: 1 }); // Reset to first page on search
    }, 500),
    []
  );

  // Handle local filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);

    // Apply filters to store
    if (key === 'search') {
      debouncedSearch(value);
    } else {
      setFilters({ [key]: value });
      setPagination({ page: 1 }); // Reset to first page on filter change
    }
  };

  // Clear all filters
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

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.entries(localFilters).some(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== '' && value !== 'all';
    });
  }, [localFilters]);

  // Define table columns
  const columns = useMemo(() => [
    {
      accessorKey: 'label',
      header: 'Article',
      cell: ({ row }) => {
        const article = row.original;
        return (
          <div className="flex items-center gap-3">
            {article.image?.url && (
              <img
                src={article.image.url}
                alt={article.label}
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/admin/articles/${article.slug}`;
                  }}
                  className="font-medium hover:text-primary truncate cursor-pointer"
                >
                  {article.label}
                </span>
                {article.isFavorite && (
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {truncate(article.shortDescription, 60)}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.type === 'recipe' ? 'default' : 'secondary'}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'categoryLabel',
      header: 'Category',
    },
    {
      accessorKey: 'authorName',
      header: 'Author',
    },
    {
      accessorKey: 'isOnline',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isOnline ? 'default' : 'secondary'}>
          {row.original.isOnline ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      accessorKey: 'viewCount',
      header: 'Views',
      cell: ({ row }) => formatNumber(row.original.viewCount || 0),
    },
    {
      accessorKey: 'publishedAt',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.publishedAt || row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const article = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/admin/articles/${article.slug}`;
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleToggleOnline(article.slug)}>
                  {article.isOnline ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Set Offline
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Set Online
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleFavorite(article.slug)}>
                  <Star className="w-4 h-4 mr-2" />
                  {article.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(article.slug)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedArticleForPin(article);
                    setShowPinCreator(true);
                  }}
                >
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Create Pin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-4">

      {/* Filters Section */}
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

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
          <span className="text-sm">
            {selectedRows.length} article{selectedRows.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkToggleOnline(true)}>
              <Eye className="w-4 h-4 mr-2" />
              Set Online
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkToggleOnline(false)}>
              <EyeOff className="w-4 h-4 mr-2" />
              Set Offline
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={articles}
        loading={loading}
        enableRowSelection={true}
        enableSorting={true}
        enableFiltering={false}
        enablePagination={true}
        pageSize={pagination.limit}
        pageSizeOptions={[5, 10, 20, 50]}
        searchPlaceholder="Search articles..."
        emptyMessage="No articles found. Create your first one!"
        onRowSelectionChange={handleRowSelectionChange}
      />

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
