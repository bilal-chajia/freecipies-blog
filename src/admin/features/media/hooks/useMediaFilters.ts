import { useState } from 'react';

export interface UseMediaFiltersOptions {
  filterTypeInitial?: string;
  searchQueryInitial?: string;
}

export const useMediaFilters = (options?: UseMediaFiltersOptions) => {
  const [searchQuery, setSearchQuery] = useState(options?.searchQueryInitial || '');
  const [filterType, setFilterType] = useState(options?.filterTypeInitial || 'all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sort_order, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  return {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    sort_order,
    setSortOrder,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
};
