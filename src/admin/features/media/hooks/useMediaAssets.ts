import { useEffect, useState } from 'react';
import { mediaAPI } from '../../../services/api';
import { useMediaStore } from '../../../store/useStore';
import { toast } from 'sonner';
import type { MediaLibraryItem } from '../utils/mediaHelpers';

export interface UseMediaAssetsOptions {
  filterTypeInitial?: string;
  searchQueryInitial?: string;
}

export const useMediaAssets = (options?: UseMediaAssetsOptions) => {
  const {
    media,
    selectedMedia,
    loading,
    setMedia,
    clearSelection,
    pagination,
    setPagination,
    setLoading,
    toggleMediaSelection
  } = useMediaStore();

  const mediaItems = media as MediaLibraryItem[];

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(options?.searchQueryInitial || '');
  const [filterType, setFilterType] = useState(options?.filterTypeInitial || 'all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | string | null; isBulk: boolean }>({
    isOpen: false,
    id: null,
    isBulk: false
  });
  const [editingImage, setEditingImage] = useState<{ source: MediaLibraryItem; context?: string } | null>(null);

  const loadMedia = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        type: filterType,
        search: searchQuery || undefined,
        sortBy,
        order: sortOrder,
        page: pageNum,
        limit: pagination.limit
      };

      const getUtcBoundary = (d: Date, isEndOfDay: boolean): string => {
        const date = new Date(d);
        if (isEndOfDay) {
          date.setHours(23, 59, 59, 999);
        } else {
          date.setHours(0, 0, 0, 0);
        }
        return date.toISOString();
      };

      if (dateFrom) params.dateFrom = getUtcBoundary(dateFrom, false);
      if (dateTo) params.dateTo = getUtcBoundary(dateTo, true);

      const response = await mediaAPI.getAll(params);

      if (response.data.success) {
        const { data, pagination: paginationData } = response.data.data as {
          data: unknown[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        };
        setMedia(data);
        setPagination(paginationData);
      }
    } catch (error) {
      toast.error('Failed to load media assets');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) return;
    loadMedia(newPage);
  };

  useEffect(() => {
    loadMedia(1);
  }, [filterType, sortBy, sortOrder, dateFrom, dateTo, searchQuery]);

  const handleBulkDelete = () => {
    setDeleteModal({ isOpen: true, id: null, isBulk: true });
  };

  const confirmDelete = async () => {
    const { id, isBulk } = deleteModal;
    try {
      if (isBulk) {
        await mediaAPI.bulkDelete(selectedMedia);
        clearSelection();
        toast.success(`Deleted ${selectedMedia.length} assets`);
      } else if (id !== null) {
        await mediaAPI.delete(id);
        toast.success('Asset deleted');
      }
      loadMedia();
    } catch (error) {
      toast.error('Failed to delete asset(s)');
    } finally {
      setDeleteModal({ isOpen: false, id: null, isBulk: false });
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Asset URL copied');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const handleEditorSave = async (file: File) => {
    if (editingImage?.context === 'upload') {
      setEditingImage(null);
      return;
    }

    try {
      setUploading(true);
      toast.info('To replace an image, please delete it and upload a new one via the Upload Assets button.');
      setEditingImage(null);
    } catch (error) {
      toast.error('Failed to update image');
    } finally {
      setUploading(false);
    }
  };

  return {
    mediaItems,
    selectedMedia,
    loading,
    pagination,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    uploading,
    setUploading,
    showUploadDialog,
    setShowUploadDialog,
    deleteModal,
    setDeleteModal,
    editingImage,
    setEditingImage,
    loadMedia,
    handlePageChange,
    handleBulkDelete,
    confirmDelete,
    handleCopyUrl,
    handleEditorSave,
    clearSelection,
    toggleMediaSelection
  };
};
