# Design: Data Table Performance — Pagination & Search Fix

**Date:** May 22, 2026  
**Status:** Approved (Phase 1 only)

---

## Problem Statement

The admin listing pages (Articles, Recipes, Roundups) share `ContentListBase.tsx` which delegates rendering to `DataTable` (`src/admin/ui/data-table.tsx`).

### Bug 1: Pagination footer hidden (Critical)

`ContentListBase` fetches server-paginated slices (e.g. 10 items) with `page`/`limit` params and receives `pagination.total` from the API. But `DataTable` line 231 decides whether to show pagination with:

```typescript
enablePagination && table.getRowCount() > pageSize
```

Since `data.length` often equals `pageSize`, the condition is false and the pagination footer disappears. The user is stuck on page 1.

### Bug 2: Search keystroke lag

Every character typed in `ArticleFilters.tsx` line 100 updates `localFilters.search` via `onFilterChange`, which triggers `setLocalFilters` + `setFilters` in `ContentListBase.tsx` line 253. This re-renders the entire table on each keystroke.

### Issue 3: Zustand over-subscription

`ContentListBase` destructures the full `useArticlesStore` object (line 109), causing re-renders on any unrelated store mutation.

---

## Phase 1: Controlled Server Pagination + Search Debounce (Priority)

### 1.1 Add server-side pagination mode to `DataTable`

New props on `DataTableProps`:

| Prop | Type | Purpose |
|------|------|---------|
| `manualPagination` | `boolean` | Enables server-side mode |
| `pageIndex` | `number` | Current page (0-indexed) |
| `pageCount` | `number` | Total pages from server |
| `totalCount` | `number` | Total rows across all pages |
| `onPageChange` | `(pageIndex: number) => void` | Page navigation callback |
| `onPageSizeChange` | `(pageSize: number) => void` | Rows-per-page callback |

When `manualPagination` is true:
- Pass `manualPagination: true` and `pageCount` to `useReactTable`.
- Do NOT include `getPaginationRowModel()` or `getFilteredRowModel()`.
- Control pagination state via `state.pagination: { pageIndex, pageSize }`.
- Intercept `onPaginationChange` to call `onPageChange` / `onPageSizeChange`.
- Show footer when `totalCount > pageSize` (not `table.getRowCount() > pageSize`).
- Display "Showing X to Y of Z results" using `totalCount`.

### 1.2 Wire `ContentListBase` to server-side mode

Pass controlled props from `ContentListBase` to `DataTable`:

```tsx
<DataTable
  columns={columns}
  data={articles}
  loading={loading}
  enableRowSelection={true}
  enableSorting={true}
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
```

### 1.3 Decouple search input in `ArticleFilters`

- Add local state: `const [searchValue, setSearchValue] = useState(localFilters.search)`
- Bind input `value` to `searchValue`, `onChange` updates only `searchValue`.
- Create a stable debounced handler (400ms) that calls `onFilterChange('search', value)`.
- Add sync effect: `useEffect(() => setSearchValue(localFilters.search), [localFilters.search])` for external resets (Clear Filters button).

### 1.4 Fine-grained Zustand selectors in `ContentListBase`

Replace the destructured store object with individual selectors:

```typescript
const articles = useArticlesStore((s) => s.articles) as ContentListItem[];
const filters = useArticlesStore((s) => s.filters);
const pagination = useArticlesStore((s) => s.pagination);
const setArticles = useArticlesStore((s) => s.setArticles);
const setFilters = useArticlesStore((s) => s.setFilters);
const setPagination = useArticlesStore((s) => s.setPagination);
```

---

## Phase 2: Zustand Cache Layer (Deferred — justify by measurement)

Only implement if page-to-page navigation remains noticeably slow after Phase 1.

> [!IMPORTANT]
> Phase 2 is intentionally deferred. The surgical invalidation pattern (in-place mutation across cached pages, partial invalidation by contentType) adds significant bug surface: stale data after full edits, coherence after filter/search/status combinations, and weak typing (`unknown[]`). Measure first, cache second.

**Notes for future Phase 2 design:**
- Cache key must include sort column/direction if sorting becomes server-side.
- Do not promise "zero refetch" after mutations. Prefer visible coherence and clear invalidation over optimistic cache hits.

---

## Verification Plan

### Automated
- Type-check passes (`tsc --noEmit`).

### Manual
- **Pagination:** Confirm footer appears, page navigation works, "Showing 1 to 10 of N" displays correct total.
- **Search:** Confirm typing is fluid with no lag. API call fires only after 400ms pause.
- **Filters:** Confirm Clear Filters resets the search input text.
- **Re-render count:** Use React DevTools Profiler to verify table does not re-render on unrelated store changes.
