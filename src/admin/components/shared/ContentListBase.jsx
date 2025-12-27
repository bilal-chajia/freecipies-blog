import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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
    CheckCircle2,
    Clock,
    ExternalLink,
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
} from '@/ui/card.jsx';
import DataTable from '@/ui/data-table.jsx';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../services/api';
import { formatDate, formatRelativeTime, formatNumber, debounce, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';
import { useArticlesStore, useCategoriesStore, useAuthorsStore, useTagsStore } from '../../store/useStore';
import PinCreator from '../pins/PinCreator';
import ArticleFilters from '../../pages/articles/ArticleFilters';

const ContentListBase = ({
    contentType,
    title,
    description,
    newButtonLabel,
    newButtonPath,
    editPathPrefix,
    livePathPrefix,
    editIdField = 'id',
    typeIcon: TypeIcon = FileText,
    statsLabel = 'Total Items',
}) => {
    const navigate = useNavigate();

    const { articles, filters, pagination, setArticles, setFilters, setPagination } = useArticlesStore();
    const { categories, setCategories } = useCategoriesStore();
    const { authors, setAuthors } = useAuthorsStore();
    const { tags, setTags } = useTagsStore();
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [localFilters, setLocalFilters] = useState({
        search: '',
        type: contentType,
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

    // Initialize filter on mount or when contentType changes
    useEffect(() => {
        setFilters({ type: contentType });
        setLocalFilters(prev => ({ ...prev, type: contentType }));
    }, [contentType]);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [catRes, authRes, tagRes] = await Promise.all([
                    categoriesAPI.getAll(),
                    authorsAPI.getAll(),
                    tagsAPI.getAll()
                ]);
                if (catRes.data.success) setCategories(catRes.data.data);
                if (authRes.data.success) setAuthors(authRes.data.data);
                if (tagRes.data.success) setTags(tagRes.data.data);
            } catch (error) {
                console.error('Failed to load metadata:', error);
            }
        };
        loadMetadata();
    }, []);

    const loadArticles = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                type: contentType,
            };

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
            console.error('Failed to load content:', error);
            setArticles([]);
        } finally {
            setLoading(false);
        }
    }, [contentType, filters, pagination.page, pagination.limit, setArticles, setPagination]);

    useEffect(() => {
        loadArticles();
    }, [loadArticles]);

    const handleRowSelectionChange = (rows) => {
        setSelectedRows(rows);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await articlesAPI.delete(id);
            loadArticles();
        } catch (error) {
            console.error('Failed to delete item:', error);
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

    const debouncedSearch = useMemo(
        () => debounce((value) => {
            setFilters({ search: value });
            setPagination({ page: 1 });
        }, 500),
        [setFilters, setPagination]
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
            type: contentType,
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
            if (key === 'type') return false;
            if (Array.isArray(value)) return value.length > 0;
            return value !== '' && value !== 'all';
        });
    }, [localFilters]);

    const columns = useMemo(() => [
        {
            accessorKey: 'label',
            header: 'Content',
            cell: ({ row }) => {
                const item = row.original;
                const imageUrl = toAdminImageUrl(item.imageUrl || '');
                const imageAlt = item.imageAlt || item.label || item.headline || '';
                return (
                    <div className="flex items-center gap-4 py-1">
                        <div className="relative group">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={imageAlt}
                                    className="w-16 h-16 rounded-xl object-cover shadow-sm ring-1 ring-border/50 transition-all group-hover:ring-primary/50"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-muted/50 text-muted-foreground flex items-center justify-center ring-1 ring-border/50">
                                    <ImagePlus className="h-4 w-4" />
                                </div>
                            )}
                            {item.isFavorite && (
                                <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                                <Link
                                    to={`${editPathPrefix}/${item[editIdField]}`}
                                    className="font-semibold text-foreground hover:text-primary transition-colors truncate max-w-[280px]"
                                >
                                    {item.label}
                                </Link>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{item.categoryLabel}</span>
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {formatNumber(item.viewCount || 0)}
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
                const item = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 ring-1 ring-border/50">
                            <AvatarImage src={toAdminImageUrl(item.authorAvatar)} />
                            <AvatarFallback className="text-[10px] font-bold">
                                {(item.authorName || 'A').charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{item.authorName}</span>
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
            header: 'Date',
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
                const item = row.original;
                return (
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 group"
                            onClick={() => navigate(`${editPathPrefix}/${item[editIdField]}`)}
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
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`${editPathPrefix}/${item[editIdField]}`)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`${livePathPrefix}/${item.slug}`, '_blank')}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Live Site
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleOnline(item.id)}>
                                    {item.isOnline ? (
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
                                    setSelectedArticleForPin(item);
                                    setShowPinCreator(true);
                                }}>
                                    <ImagePlus className="w-4 h-4 mr-2" />
                                    Create Pinterest Pin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleDelete(item.id)}
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Item
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ], [navigate, editPathPrefix, livePathPrefix, editIdField]);

    return (
        <div className="space-y-6 pb-8">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground mt-1">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button className="h-10 px-6 gap-2 shadow-sm" onClick={() => navigate(newButtonPath)}>
                        <Plus className="h-4 w-4" />
                        {newButtonLabel}
                    </Button>
                </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-none shadow-none ring-1 ring-primary/20">
                    <CardContent className="pt-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider">{statsLabel}</p>
                            <p className="text-2xl font-bold">{pagination.total}</p>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <TypeIcon className="h-5 w-5" />
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
                    fixedType={contentType}
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

export default ContentListBase;
