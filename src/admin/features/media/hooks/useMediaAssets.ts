import { useEffect, useState } from 'react';
import { mediaAPI } from '../../../services/api';
import { useMediaStore } from '../../../store/useStore';
import { toast } from 'sonner';
import type { MediaLibraryItem } from '../utils/mediaHelpers';
import { useMediaFilters } from './useMediaFilters';
import { useMediaDialogs } from './useMediaDialogs';

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

  const filters = useMediaFilters(options);
  const dialogs = useMediaDialogs();

  const loadMedia = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        type: filters.filterType,
        search: filters.searchQuery || undefined,
        sortBy: filters.sortBy,
        order: filters.sort_order,
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

      if (filters.dateFrom) params.dateFrom = getUtcBoundary(filters.dateFrom, false);
      if (filters.dateTo) params.dateTo = getUtcBoundary(filters.dateTo, true);

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
  }, [
    filters.filterType,
    filters.sortBy,
    filters.sort_order,
    filters.dateFrom,
    filters.dateTo,
    filters.searchQuery
  ]);

  const confirmDelete = () => dialogs.confirmDelete(() => loadMedia());

  return {
    mediaItems,
    selectedMedia,
    loading,
    pagination,
    viewMode,
    setViewMode,
    
    // Spread filters
    ...filters,

    // Spread dialogs
    ...dialogs,
    confirmDelete,

    loadMedia,
    handlePageChange,
    clearSelection,
    toggleMediaSelection
  };
};
