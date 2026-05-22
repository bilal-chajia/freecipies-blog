import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { ColumnDef, Row } from '@tanstack/react-table';
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
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/ui/avatar';
import {
    Card,
    CardContent,
} from '@/ui/card';
import DataTable from '@/ui/data-table';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../services/api';
import { formatDate, formatRelativeTime, formatNumber, debounce, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';
import { useArticlesStore, useCategoriesStore, useAuthorsStore, useTagsStore } from '../../store/useStore';
import { PinCreator } from '@admin/features/pins/components';
import ArticleFilters from '@admin/features/articles/pages/ArticleFilters';
import type { ContentFilters, ContentType, CategoryItem, AuthorItem, TagItem } from '@admin/features/articles/pages/ArticleFilters';
import ConfirmationModal from '@/ui/confirmation-modal';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/EmptyState';

type ContentListItem = {
    id: string | number;
    slug?: string;
    label?: string;
    headline?: string;
    imageUrl?: string;
    imageAlt?: string;
    isFavorite?: boolean;
    categoryLabel?: string;
    viewCount?: number;
    authorAvatar?: string;
    authorName?: string;
    workflowStatus?: string;
    publishedAt?: string;
    createdAt?: string;
    [key: string]: unknown;
};

type ArticleQueryParams = {
    page: number;
    limit: number;
    type: ContentType;
    category?: string;
    author?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
};

type ContentListBaseProps = {
    contentType: ContentType;
    title: string;
    description: string;
    newButtonLabel: string;
    newButtonPath: string;
    editPathPrefix: string;
    livePathPrefix: string;
    editIdField?: string;
    typeIcon?: LucideIcon;
    statsLabel?: string;
};

type DeleteModalState = {
    isOpen: boolean;
    itemToDelete: string | number | null;
};

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
}: ContentListBaseProps) => {
    const navigate = useNavigate();

    const articles = useArticlesStore((s) => s.articles) as ContentListItem[];
    const filters = useArticlesStore((s) => s.filters);
    const pagination = useArticlesStore((s) => s.pagination);
    const setArticles = useArticlesStore((s) => s.setArticles);
    const setFilters = useArticlesStore((s) => s.setFilters);
    const setPagination = useArticlesStore((s) => s.setPagination);

    const { categories, setCategories } = useCategoriesStore();
    const { authors, setAuthors } = useAuthorsStore();
    const { tags, setTags } = useTagsStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<ContentListItem[]>([]);
    const [localFilters, setLocalFilters] = useState<ContentFilters>({
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
    const [selectedArticleForPin, setSelectedArticleForPin] = useState<ContentListItem | null>(null);

    const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
        isOpen: false,
        itemToDelete: null
    });

    // Initialize filter on mount or when contentType changes
    useEffect(() => {
        setFilters({ type: contentType });
        setLocalFilters(prev => ({ ...prev, type: contentType }));
    }, [contentType]);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                // Fetch sequentially to avoid concurrent SQLite lock contention in dev mode.
                // Only re-fetch if the store is empty (metadata rarely changes per session).
                if (categories.length === 0) {
                    const catRes = await categoriesAPI.getAll();
                    if (catRes.data.success) setCategories(catRes.data.data);
                }
                if (authors.length === 0) {
                    const authRes = await authorsAPI.getAll();
                    if (authRes.data.success) setAuthors(authRes.data.data);
                }
                if (tags.length === 0) {
                    const tagRes = await tagsAPI.getAll();
                    if (tagRes.data.success) setTags(tagRes.data.data);
                }
            } catch (error) {
                toast.error('Failed to load metadata');
            }
        };
        loadMetadata();
    }, []);

    const loadArticles = useCallback(async () => {
        try {
            setLoading(true);
            const params: ArticleQueryParams = {
                page: pagination.page,
                limit: pagination.limit,
                type: contentType,
            };

            if (filters.category && filters.category !== 'all') params.category = filters.category;
            if (filters.author && filters.author !== 'all') params.author = filters.author;
            if (filters.status && filters.status !== 'all') params.status = filters.status;
            if (filters.search) params.search = filters.search;
            if (filters.dateFrom) params.dateFrom = filters.dateFrom;
            if (filters.dateTo) params.dateTo = filters.dateTo;

            const response = await articlesAPI.getAll(params);

            if (response.data.success) {
                const articlesData = (response.data.data || []) as ContentListItem[];
                const paginationData = response.data.pagination || {};

                setArticles(articlesData);
                setPagination({
                    total: paginationData.total || articlesData.length,
                    totalPages: paginationData.totalPages || Math.ceil((paginationData.total || 0) / pagination.limit),
                });
                setError(null);
            } else {
                setArticles([]);
                setError(response.data.message || 'Failed to load content');
            }
        } catch (error) {
            toast.error('Failed to load content');
            setArticles([]);
            setError('Failed to load content');
        } finally {
            setLoading(false);
        }
    }, [contentType, filters, pagination.page, pagination.limit, setArticles, setPagination]);

    useEffect(() => {
        loadArticles();
    }, [loadArticles]);

    const handleRowSelectionChange = (rows: ContentListItem[]) => {
        setSelectedRows(rows);
    };

    const handleDelete = (id: string | number) => {
        setDeleteModal({ isOpen: true, itemToDelete: id });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.itemToDelete) return;
        try {
            await articlesAPI.delete(deleteModal.itemToDelete);
            toast.success('Item deleted successfully');
            loadArticles();
        } catch (error) {
            toast.error('Failed to delete item');
        } finally {
            setDeleteModal({ isOpen: false, itemToDelete: null });
        }
    };

    const handleToggleOnline = async (id: string | number, currentStatus?: string) => {
        try {
            const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
            await articlesAPI.setWorkflowStatus(id, nextStatus);
            toast.success(`Moved to ${nextStatus === 'published' ? 'Published' : 'Drafts'}`);
            loadArticles();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const debouncedSearch = useMemo(
        () => debounce((value: string) => {
            setLocalFilters(prev => ({ ...prev, search: value }));
            setFilters({ search: value });
            setPagination({ page: 1 });
        }, 500),
        [setFilters, setPagination]
    );

    const handleFilterChange = (keyOrObj: keyof ContentFilters | Partial<ContentFilters>, value?: string | (string | number)[]) => {
        if (typeof keyOrObj === 'object' && keyOrObj !== null) {
            setLocalFilters(prev => ({ ...prev, ...keyOrObj }));
            setFilters(keyOrObj as Parameters<typeof setFilters>[0]);
            setPagination({ page: 1 });
            return;
        }

        const key = keyOrObj;

        if (key === 'search') {
            if (typeof value === 'string') {
                debouncedSearch(value);
            }
        } else {
            setLocalFilters(prev => ({ ...prev, [key]: value }));
            setFilters({ [key]: value } as Parameters<typeof setFilters>[0]);
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

    const columns = useMemo<ColumnDef<ContentListItem>[]>(() => [
        {
            accessorKey: 'label',
            header: 'Content',
            cell: ({ row }: { row: Row<ContentListItem> }) => {
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
                                <div className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground rounded-full p-0.5 shadow-sm">
                                    <Star className="size-2.5 fill-current" />
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
                                    <Eye className="size-3" />
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
            meta: { className: 'hidden md:table-cell' },
            cell: ({ row }: { row: Row<ContentListItem> }) => {
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
            accessorKey: 'workflowStatus',
            header: 'Status',
            cell: ({ row }: { row: Row<ContentListItem> }) => {
                const status = row.original.workflowStatus || 'draft';
                const statusColors: Record<string, string> = {
                    published: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
                    draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20',
                    in_review: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20',
                    scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
                    archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20',
                };
                const statusLabels: Record<string, string> = {
                    published: 'Published',
                    draft: 'Draft',
                    in_review: 'In Review',
                    scheduled: 'Scheduled',
                    archived: 'Archived',
                };
                return (
                    <Badge
                        variant="secondary"
                        className={`gap-1 px-2.5 py-0.5 font-medium ${statusColors[status] || ''}`}
                    >
                        {status === 'published' ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {statusLabels[status] || status}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'publishedAt',
            header: 'Date',
            meta: { className: 'hidden md:table-cell' },
            cell: ({ row }: { row: Row<ContentListItem> }) => (
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
            cell: ({ row }: { row: Row<ContentListItem> }) => {
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
                            <Edit className="size-4 text-muted-foreground group-hover:text-primary" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent rounded-full">
                                    <MoreVertical className="size-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`${editPathPrefix}/${item[editIdField]}`)}>
                                    <Edit className="size-4 mr-2" />
                                    Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`${livePathPrefix}/${item.slug}`, '_blank')}>
                                    <ExternalLink className="size-4 mr-2" />
                                    View Live Site
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleOnline(item.id, item.workflowStatus as string)}>
                                    {item.workflowStatus === 'published' ? (
                                        <>
                                            <EyeOff className="size-4 mr-2" />
                                            Move to Drafts
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="size-4 mr-2" />
                                            Publish Now
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setSelectedArticleForPin(item);
                                    setShowPinCreator(true);
                                }}>
                                    <ImagePlus className="size-4 mr-2" />
                                    Create Pinterest Pin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleDelete(item.id)}
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                    <Trash2 className="size-4 mr-2" />
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
        <div className="space-y-4 pb-6">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-balance">{title}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button className="h-9 px-4 gap-2 shadow-sm text-xs" onClick={() => navigate(newButtonPath)}>
                        <Plus className="size-3.5" />
                        {newButtonLabel}
                    </Button>
                </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/80 bg-card rounded-lg shadow-xs">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{statsLabel}</p>
                            <p className="text-xl font-bold">{pagination.total}</p>
                        </div>
                        <div className="p-1.5 bg-muted rounded-md text-muted-foreground">
                            <TypeIcon className="size-4" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-border/80 bg-card rounded-lg shadow-xs">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Published</p>
                            <p className="text-xl font-bold">{(articles as ContentListItem[]).filter(a => a.workflowStatus === 'published').length}</p>
                        </div>
                        <div className="p-1.5 bg-muted rounded-md text-muted-foreground">
                            <CheckCircle2 className="size-4" />
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
                    categories={categories as Parameters<typeof ArticleFilters>[0]['categories']}
                    authors={authors as Parameters<typeof ArticleFilters>[0]['authors']}
                    tags={tags as Parameters<typeof ArticleFilters>[0]['tags']}
                    fixedType={contentType}
                />

                {/* Bulk Actions Banner */}
                {selectedRows.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between bg-secondary/40 border border-border/80 p-2.5 rounded-lg shadow-xs"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                                {selectedRows.length}
                            </div>
                            <span className="text-xs font-medium text-foreground">
                                {selectedRows.length} items selected
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-7 px-3 text-xs border-border/80">
                                Bulk Status
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7 px-3 text-xs shadow-sm">
                                Delete Selected
                            </Button>
                        </div>
                    </motion.div>
                )}

                {articles.length === 0 && !loading ? (
                    <EmptyState
                        icon={contentType}
                        title={`No ${title} Yet`}
                        description={`Get started by creating your first ${contentType}.`}
                        actionLabel={`New ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`}
                        actionHref={newButtonPath}
                    />
                ) : (
                    <div className="bg-card rounded-lg border border-border/80 shadow-xs overflow-hidden">
                        <DataTable
                            columns={columns}
                            data={articles}
                            loading={loading}
                            error={error}
                            enableRowSelection={true}
                            enableSorting={false}
                            enableFiltering={false}
                            enablePagination={true}
                            manualPagination={true}
                            pageIndex={pagination.page - 1}
                            pageSize={pagination.limit}
                            pageCount={pagination.totalPages}
                            totalCount={pagination.total}
                            onPageChange={(idx) => setPagination({ page: idx + 1 })}
                            onPageSizeChange={(size) => setPagination({ page: 1, limit: size })}
                            pageSizeOptions={[10, 20, 50]}
                            onRowSelectionChange={handleRowSelectionChange}
                        />
                    </div>
                )}
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

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, itemToDelete: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Content"
                description="Are you sure you want to delete this item? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>

    );
};

export default ContentListBase;
