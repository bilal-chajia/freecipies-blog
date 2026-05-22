# Plan: Cache DataTable pour les listings admin (Phase 2)

## Goal

Integrate a non-reactive session-memory cache layer in the admin listings (`Articles`, `Recipes`, `Roundups`) managed by `ContentListBase` and the Zustand store. 

By keeping the cache purely in-memory, non-reactive, and separate from the reactive Zustand state (`ArticlesState`), we eliminate rendering overhead and optimize the system for speed while maintaining clean component boundaries.

---

## Technical Design & Architecture

### 1. New Helper Module: `articleListCache.ts`
We will create a dedicated cache file containing types, state, and narrow imperative operations:
`[NEW]` [articleListCache.ts](file:///c:/Users/Poste/Desktop/SaaS%20Astro/freecipies-blog/src/admin/store/articleListCache.ts)

#### Core Structures
```typescript
export type ContentType = 'article' | 'recipe' | 'roundup';

export interface ArticleListCacheParams {
  type: ContentType;
  category?: string;
  author?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export interface ArticleListCacheEntry {
  articles: unknown[]; // ContentListItem[]
  pagination: {
    total: number;
    totalPages: number;
  };
  fetchedAt: number;
  params: ArticleListCacheParams;
}
```

#### Cache Properties
- **Storage**: `const cache = new Map<string, ArticleListCacheEntry>();`
- **TTL**: `5 * 60 * 1000` (5 minutes)
- **Max Entries**: `50`
- **Eviction**: Map insertion order is utilized to achieve an elegant Least Recently Used (LRU) eviction strategy.

#### Helper Operations
1. `getCacheKey(params: ArticleListCacheParams): string`: Deterministically serializes query parameters into a stable JSON string.
2. `getArticleListCacheEntry(params: ArticleListCacheParams): ArticleListCacheEntry | null`: Pulls fresh cached data. If present and valid under TTL, moves it to the end of the Map iterator to refresh its insertion order (LRU hit).
3. `setArticleListCacheEntry(params: ArticleListCacheParams, entry: Omit<ArticleListCacheEntry, 'fetchedAt' | 'params'>): void`: Writes a new entry, evicting the oldest key if capacity exceeds `50` entries.
4. `invalidateArticleListCacheWhere(predicate: (entry: ArticleListCacheEntry) => boolean): void`: Fine-grained invalidation allowing targeted cache clears.
5. `patchArticleInListCache(id: string | number, patch: Partial<any>): void`: Performs optimistic updates in-place for active cache entries using normalized string ID comparisons.

---

### 2. Integration in `ContentListBase.tsx`

We will integrate the cache in `ContentListBase.tsx` to handle misses and update the Zustand reactive store only when UI-visible page data actually changes.

#### A. Stable Parameter Calculation
```typescript
const getQueryParams = useCallback((): ArticleQueryParams => {
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

    return params;
}, [contentType, filters, pagination.page, pagination.limit]);
```

#### B. Cache-Aware Data Fetching (`loadArticles`)
Incorporate cache checking, loading sequence race guards (`requestSeqRef`), and correct nullish coalescing operators (`??`):

```typescript
const requestSeqRef = useRef(0);

const loadArticles = useCallback(async (opts?: { force?: boolean }) => {
    const force = opts?.force === true;
    const params = getQueryParams();
    
    // 1. In-flight fetch cancellation guard
    const currentSeq = ++requestSeqRef.current;

    // 2. Try Cache hit if not forced
    if (!force) {
        const cached = getArticleListCacheEntry(params);
        if (cached) {
            setArticles(cached.articles as ContentListItem[]);
            setPagination({
                total: cached.pagination.total,
                totalPages: cached.pagination.totalPages,
            });
            setError(null);
            setLoading(false);
            return;
        }
    }

    // 3. Cache Miss or Forced Refresh -> API call
    try {
        setLoading(true);
        const response = await articlesAPI.getAll(params);

        if (currentSeq !== requestSeqRef.current) return;

        if (response.data.success) {
            const articlesData = (response.data.data || []) as ContentListItem[];
            const paginationData = response.data.pagination || {};
            const total = paginationData.total ?? articlesData.length;
            const totalPages = paginationData.totalPages ?? Math.ceil(total / params.limit);

            // Populate Cache
            setArticleListCacheEntry(params, {
                articles: articlesData,
                pagination: { total, totalPages },
            });

            // Update Zustand Store
            setArticles(articlesData);
            setPagination({ total, totalPages });
            setError(null);
        } else {
            setArticles([]);
            setError(response.data.message || 'Failed to load content');
        }
    } catch (err) {
        if (currentSeq !== requestSeqRef.current) return;
        toast.error('Failed to load content');
        setArticles([]);
        setError('Failed to load content');
    } finally {
        if (currentSeq === requestSeqRef.current) {
            setLoading(false);
        }
    }
}, [getQueryParams, setArticles, setPagination]);
```

#### C. Fine-Grained `handleToggleOnline` Cache Invalidation
```typescript
const handleToggleOnline = async (id: string | number) => {
    try {
        await articlesAPI.toggleOnline(id);
        toast.success('Status updated');

        const currentItem = articles.find(art => String(art.id) === String(id));
        const nextIsOnline = currentItem ? !currentItem.isOnline : true;

        // 1. Optimistically patch the UI-visible list in Zustand
        setArticles(articles.map(art => String(art.id) === String(id) ? { ...art, isOnline: nextIsOnline } : art));

        // 2. Patch status=all caches and other compatible entries
        patchArticleInListCache(id, { isOnline: nextIsOnline });

        // 3. Fine-grained cache eviction: remove/invalidate from status-specific entries
        const targetStatusToRemove = nextIsOnline ? 'draft' : 'published';
        const targetStatusToInvalidate = nextIsOnline ? 'published' : 'draft';

        invalidateArticleListCacheWhere(entry => 
            entry.params.type === contentType && 
            (entry.params.status === targetStatusToRemove || entry.params.status === targetStatusToInvalidate)
        );

        // 4. Force full page refresh if active status filter no longer matches changed item
        if (filters.status && filters.status !== 'all') {
            loadArticles({ force: true });
        }
    } catch (error) {
        toast.error('Failed to update status');
        loadArticles({ force: true });
    }
};
```

#### D. Simplified `handleDeleteConfirm` Invalidation
```typescript
const handleDeleteConfirm = async () => {
    if (!deleteModal.itemToDelete) return;
    const targetId = deleteModal.itemToDelete;
    try {
        await articlesAPI.delete(targetId);
        toast.success('Item deleted successfully');

        // 1. Optimistically clear row from reactive UI state immediately
        setArticles(articles.filter(art => String(art.id) !== String(targetId)));

        // 2. Invalidate all caches for this contentType (re-calculates properly upon refetch)
        invalidateArticleListCacheWhere(entry => entry.params.type === contentType);

        // 3. Force API call to re-fill page items and pagination borders
        loadArticles({ force: true });
    } catch (error) {
        toast.error('Failed to delete item');
        loadArticles({ force: true });
    } finally {
        setDeleteModal({ isOpen: false, itemToDelete: null });
    }
};
```

---

## Test & Verification Plan

### 1. Automated Unit Tests
We will add a new test file:
`[NEW]` [articleListCache.test.ts](file:///c:/Users/Poste/Desktop/SaaS%20Astro/freecipies-blog/src/admin/store/__tests__/articleListCache.test.ts)

Test scenarios:
- **Stable Serialization**: Confirms that different key ordering or missing defaults yield identical stable string keys.
- **Eviction Limit**: Writes 55 unique entries and checks that only the latest 50 are preserved (FIFO/LRU order).
- **TTL Expiration**: Uses simulated time or mock clocks to verify that entries older than 5 minutes return `null`.
- **Optimistic Patch**: Confirms `patchArticleInListCache` updates specific item fields in matches with normalized string IDs.
- **Fine-Grained Invalidation**: Tests that `invalidateArticleListCacheWhere` clears only targeted status keys without wiping all other categories.

### 2. Manual Verification
- Verify navigation back and forth between pagination pages and tab switches uses cache hits with zero pending requests.
- Verify changing any filter/search immediately forces a fresh load and registers a new unique cache signature.
- Verify toggling an article online/offline updates the listing row instantly and evicts only matching status listings, preserving general cache lists.
- Verify deleting an article wipes the item from the grid immediately and issues a forced refetch to re-fill empty grids correctly.
