import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Eye,
  EyeOff,
  Star,
  Edit,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  X,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
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

const ArticlesList = () => {
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

  useEffect(() => {
    loadCategories();
    loadAuthors();
    loadTags();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [filters, pagination.page]);

  // Sample article data for testing
  const getSampleArticles = () => {
    const now = new Date();
    const baseDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago

    return [
      {
        id: 1,
        slug: 'ultimate-chocolate-chip-cookies',
        label: 'Ultimate Chocolate Chip Cookies',
        type: 'recipe',
        categorySlug: 'desserts',
        authorSlug: 'sarah-johnson',
        isOnline: true,
        isFavorite: true,
        viewCount: 1250,
        createdAt: new Date(baseDate.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (2 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'The perfect chocolate chip cookies with crispy edges and chewy centers. A family favorite that never disappoints.',
        image: { url: 'https://example.com/cookies.jpg', alt: 'Golden chocolate chip cookies on a baking sheet' },
        categoryLabel: 'Desserts',
        authorName: 'Sarah Johnson',
        tags: [
          { id: 1, label: 'Dessert' },
          { id: 2, label: 'Cookies' },
          { id: 3, label: 'Chocolate' },
          { id: 4, label: 'Baking' }
        ]
      },
      {
        id: 2,
        slug: 'mediterranean-quinoa-salad',
        label: 'Mediterranean Quinoa Salad',
        type: 'recipe',
        categorySlug: 'healthy',
        authorSlug: 'mike-chen',
        isOnline: true,
        isFavorite: false,
        viewCount: 890,
        createdAt: new Date(baseDate.getTime() + (3 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (4 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'A refreshing and nutritious quinoa salad packed with Mediterranean flavors, perfect for lunch or as a side dish.',
        image: { url: 'https://example.com/quinoa-salad.jpg', alt: 'Colorful Mediterranean quinoa salad in a bowl' },
        categoryLabel: 'Healthy',
        authorName: 'Mike Chen',
        tags: [
          { id: 5, label: 'Healthy' },
          { id: 6, label: 'Salad' },
          { id: 7, label: 'Mediterranean' },
          { id: 8, label: 'Quinoa' }
        ]
      },
      {
        id: 3,
        slug: 'beginners-guide-to-home-brewing',
        label: 'Beginner\'s Guide to Home Brewing',
        type: 'article',
        categorySlug: 'lifestyle',
        authorSlug: 'alex-rodriguez',
        isOnline: false,
        isFavorite: true,
        viewCount: 2100,
        createdAt: new Date(baseDate.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: null,
        shortDescription: 'Everything you need to know to start brewing your own beer at home. From equipment to recipes, we\'ve got you covered.',
        image: { url: 'https://example.com/brewing.jpg', alt: 'Home brewing setup with bottles and equipment' },
        categoryLabel: 'Lifestyle',
        authorName: 'Alex Rodriguez',
        tags: [
          { id: 9, label: 'DIY' },
          { id: 10, label: 'Beer' },
          { id: 11, label: 'Home Brewing' },
          { id: 12, label: 'Tutorial' }
        ]
      },
      {
        id: 4,
        slug: 'spicy-thai-green-curry',
        label: 'Authentic Spicy Thai Green Curry',
        type: 'recipe',
        categorySlug: 'asian',
        authorSlug: 'priya-patel',
        isOnline: true,
        isFavorite: false,
        viewCount: 675,
        createdAt: new Date(baseDate.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (8 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'Learn to make authentic Thai green curry from scratch with this comprehensive recipe featuring fresh herbs and traditional techniques.',
        image: { url: 'https://example.com/thai-curry.jpg', alt: 'Steaming Thai green curry in a bowl' },
        categoryLabel: 'Asian',
        authorName: 'Priya Patel',
        tags: [
          { id: 13, label: 'Thai' },
          { id: 14, label: 'Curry' },
          { id: 15, label: 'Spicy' },
          { id: 16, label: 'Asian Cuisine' }
        ]
      },
      {
        id: 5,
        slug: 'urban-gardening-tips',
        label: 'Urban Gardening: Growing Food in Small Spaces',
        type: 'article',
        categorySlug: 'lifestyle',
        authorSlug: 'emma-davis',
        isOnline: true,
        isFavorite: false,
        viewCount: 1450,
        createdAt: new Date(baseDate.getTime() + (10 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (11 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'Transform your balcony or windowsill into a productive garden. Practical tips for growing vegetables and herbs in urban environments.',
        image: { url: 'https://example.com/urban-garden.jpg', alt: 'Colorful vegetables growing in containers on a balcony' },
        categoryLabel: 'Lifestyle',
        authorName: 'Emma Davis',
        tags: [
          { id: 17, label: 'Gardening' },
          { id: 18, label: 'Urban' },
          { id: 19, label: 'Sustainability' },
          { id: 20, label: 'Vegetables' }
        ]
      },
      {
        id: 6,
        slug: 'classic-tiramisu',
        label: 'Classic Italian Tiramisu',
        type: 'recipe',
        categorySlug: 'desserts',
        authorSlug: 'giuseppe-marino',
        isOnline: false,
        isFavorite: true,
        viewCount: 980,
        createdAt: new Date(baseDate.getTime() + (12 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: null,
        shortDescription: 'Master the art of traditional Italian tiramisu with this authentic recipe passed down through generations.',
        image: { url: 'https://example.com/tiramisu.jpg', alt: 'Layered tiramisu in a glass dish' },
        categoryLabel: 'Desserts',
        authorName: 'Giuseppe Marino',
        tags: [
          { id: 21, label: 'Italian' },
          { id: 22, label: 'Dessert' },
          { id: 23, label: 'Coffee' },
          { id: 24, label: 'Traditional' }
        ]
      },
      {
        id: 7,
        slug: 'mindfulness-meditation-guide',
        label: 'A Complete Guide to Mindfulness Meditation',
        type: 'article',
        categorySlug: 'wellness',
        authorSlug: 'lisa-wong',
        isOnline: true,
        isFavorite: false,
        viewCount: 3200,
        createdAt: new Date(baseDate.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (15 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'Discover the transformative power of mindfulness meditation. Learn techniques, benefits, and how to build a daily practice.',
        image: { url: 'https://example.com/meditation.jpg', alt: 'Person meditating peacefully in a zen garden' },
        categoryLabel: 'Wellness',
        authorName: 'Lisa Wong',
        tags: [
          { id: 25, label: 'Mindfulness' },
          { id: 26, label: 'Meditation' },
          { id: 27, label: 'Wellness' },
          { id: 28, label: 'Mental Health' }
        ]
      },
      {
        id: 8,
        slug: 'homemade-pizza-dough',
        label: 'Perfect Homemade Pizza Dough Recipe',
        type: 'recipe',
        categorySlug: 'italian',
        authorSlug: 'marco-rossi',
        isOnline: true,
        isFavorite: true,
        viewCount: 1850,
        createdAt: new Date(baseDate.getTime() + (16 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (17 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'Make restaurant-quality pizza at home with this easy, no-knead pizza dough recipe that delivers perfect results every time.',
        image: { url: 'https://example.com/pizza-dough.jpg', alt: 'Fresh pizza dough ready to be shaped' },
        categoryLabel: 'Italian',
        authorName: 'Marco Rossi',
        tags: [
          { id: 29, label: 'Pizza' },
          { id: 30, label: 'Italian' },
          { id: 31, label: 'Bread' },
          { id: 32, label: 'Homemade' }
        ]
      },
      {
        id: 9,
        slug: 'sustainable-living-habits',
        label: '10 Sustainable Living Habits for Everyday Life',
        type: 'article',
        categorySlug: 'lifestyle',
        authorSlug: 'david-green',
        isOnline: true,
        isFavorite: false,
        viewCount: 2750,
        createdAt: new Date(baseDate.getTime() + (18 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (19 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'Small changes that make a big difference. Practical sustainable living tips that anyone can incorporate into their daily routine.',
        image: { url: 'https://example.com/sustainable.jpg', alt: 'Eco-friendly products and sustainable living items' },
        categoryLabel: 'Lifestyle',
        authorName: 'David Green',
        tags: [
          { id: 33, label: 'Sustainability' },
          { id: 34, label: 'Environment' },
          { id: 35, label: 'Eco-friendly' },
          { id: 36, label: 'Lifestyle' }
        ]
      },
      {
        id: 10,
        slug: 'mexican-street-tacos',
        label: 'Authentic Mexican Street Tacos',
        type: 'recipe',
        categorySlug: 'mexican',
        authorSlug: 'carlos-mendoza',
        isOnline: false,
        isFavorite: false,
        viewCount: 560,
        createdAt: new Date(baseDate.getTime() + (20 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: null,
        shortDescription: 'Experience the real flavors of Mexico with these authentic street tacos. Simple ingredients, maximum flavor.',
        image: { url: 'https://example.com/street-tacos.jpg', alt: 'Fresh Mexican street tacos with lime and cilantro' },
        categoryLabel: 'Mexican',
        authorName: 'Carlos Mendoza',
        tags: [
          { id: 37, label: 'Mexican' },
          { id: 38, label: 'Tacos' },
          { id: 39, label: 'Street Food' },
          { id: 40, label: 'Authentic' }
        ]
      },
      {
        id: 11,
        slug: 'photography-composition-rules',
        label: 'Mastering Photography: Composition Rules',
        type: 'article',
        categorySlug: 'photography',
        authorSlug: 'anna-kim',
        isOnline: true,
        isFavorite: true,
        viewCount: 1680,
        createdAt: new Date(baseDate.getTime() + (22 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (23 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'Learn the fundamental rules of photographic composition that will transform your images from snapshots to stunning photographs.',
        image: { url: 'https://example.com/photography.jpg', alt: 'Professional camera and photography equipment' },
        categoryLabel: 'Photography',
        authorName: 'Anna Kim',
        tags: [
          { id: 41, label: 'Photography' },
          { id: 42, label: 'Composition' },
          { id: 43, label: 'Art' },
          { id: 44, label: 'Tutorial' }
        ]
      },
      {
        id: 12,
        slug: 'vegan-chocolate-mousse',
        label: 'Decadent Vegan Chocolate Mousse',
        type: 'recipe',
        categorySlug: 'vegan',
        authorSlug: 'maya-patel',
        isOnline: true,
        isFavorite: false,
        viewCount: 920,
        createdAt: new Date(baseDate.getTime() + (25 * 24 * 60 * 60 * 1000)).toISOString(),
        publishedAt: new Date(baseDate.getTime() + (26 * 24 * 60 * 60 * 1000)).toISOString(),
        shortDescription: 'Indulge in this rich, creamy vegan chocolate mousse that proves plant-based desserts can be just as decadent as traditional ones.',
        image: { url: 'https://example.com/vegan-mousse.jpg', alt: 'Smooth vegan chocolate mousse in elegant glasses' },
        categoryLabel: 'Vegan',
        authorName: 'Maya Patel',
        tags: [
          { id: 45, label: 'Vegan' },
          { id: 46, label: 'Chocolate' },
          { id: 47, label: 'Dessert' },
          { id: 48, label: 'Plant-based' }
        ]
      }
    ];
  };

  const loadArticles = async () => {
    try {
      setLoading(true);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get sample data
      let sampleArticles = getSampleArticles();

      // Apply filters
      if (filters.type !== 'all') {
        sampleArticles = sampleArticles.filter(article => article.type === filters.type);
      }

      if (filters.category !== 'all') {
        sampleArticles = sampleArticles.filter(article => article.categorySlug === filters.category);
      }

      if (filters.author !== 'all') {
        sampleArticles = sampleArticles.filter(article => article.authorSlug === filters.author);
      }

      if (filters.status !== 'all') {
        const isOnline = filters.status === 'online';
        sampleArticles = sampleArticles.filter(article => article.isOnline === isOnline);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        sampleArticles = sampleArticles.filter(article =>
          article.label.toLowerCase().includes(searchTerm) ||
          article.shortDescription.toLowerCase().includes(searchTerm) ||
          article.authorName.toLowerCase().includes(searchTerm)
        );
      }

      // Apply date filters if provided
      if (localFilters.dateFrom) {
        const fromDate = new Date(localFilters.dateFrom);
        sampleArticles = sampleArticles.filter(article => {
          const articleDate = new Date(article.publishedAt || article.createdAt);
          return articleDate >= fromDate;
        });
      }

      if (localFilters.dateTo) {
        const toDate = new Date(localFilters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        sampleArticles = sampleArticles.filter(article => {
          const articleDate = new Date(article.publishedAt || article.createdAt);
          return articleDate <= toDate;
        });
      }

      // Apply tag filters if provided
      if (localFilters.tags && localFilters.tags.length > 0) {
        sampleArticles = sampleArticles.filter(article =>
          localFilters.tags.some(tagId =>
            article.tags.some(tag => tag.id === tagId)
          )
        );
      }

      // Sort articles (default by created date descending)
      sampleArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const totalArticles = sampleArticles.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedArticles = sampleArticles.slice(startIndex, endIndex);

      // Update store
      setArticles(paginatedArticles);
      setPagination({
        ...pagination,
        total: totalArticles,
        totalPages: Math.ceil(totalArticles / pagination.limit),
      });

    } catch (error) {
      console.error('Failed to load articles:', error);
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
                <Link
                  to={`/articles/${article.slug}`}
                  className="font-medium hover:text-primary truncate"
                >
                  {article.label}
                </Link>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/articles/${article.slug}`} className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Articles</h2>
          <p className="text-muted-foreground mt-1">
            Manage your articles and recipes
          </p>
        </div>
        <Link to="/articles/new">
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            New Article
          </Button>
        </Link>
      </div>

      {/* Filters Section */}
      <div className="space-y-4">
        {/* Search and Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles by title, content, or author..."
                value={localFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1 min-w-[20px] h-5 text-xs">
                  {Object.values(localFilters).filter(v => v !== '' && v !== 'all' && (!Array.isArray(v) || v.length > 0)).length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleClearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={localFilters.type}
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="recipe">Recipes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={localFilters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Author Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Author</label>
              <Select
                value={localFilters.author}
                onValueChange={(value) => handleFilterChange('author', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Authors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {authors.map((author) => (
                    <SelectItem key={author.slug} value={author.slug}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={localFilters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date From
              </label>
              <Input
                type="date"
                value={localFilters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date To
              </label>
              <Input
                type="date"
                value={localFilters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            {/* Tags Filter - Multi-select */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-background">
                {localFilters.tags.map((tagId) => {
                  const tag = tags.find(t => t.id === tagId);
                  return (
                    <Badge key={tagId} variant="secondary" className="gap-1">
                      {tag?.label || tagId}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          const newTags = localFilters.tags.filter(t => t !== tagId);
                          handleFilterChange('tags', newTags);
                        }}
                      />
                    </Badge>
                  );
                })}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      + Add Tag
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    {tags
                      .filter(tag => !localFilters.tags.includes(tag.id))
                      .map((tag) => (
                        <DropdownMenuItem
                          key={tag.id}
                          onClick={() => {
                            const newTags = [...localFilters.tags, tag.id];
                            handleFilterChange('tags', newTags);
                          }}
                        >
                          {tag.label}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}
      </div>

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

    </div>
  );
};

export default ArticlesList;

