import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/*  Auth Store                                                        */
/* ------------------------------------------------------------------ */

interface AuthState {
  user: { username: string; name?: string; email?: string; role: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: { username: string; name?: string; email?: string; role: string }, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'admin-auth' }
  )
);

/* ------------------------------------------------------------------ */
/*  UI Store                                                          */
/* ------------------------------------------------------------------ */

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
}));

/* ------------------------------------------------------------------ */
/*  Articles Store                                                    */
/* ------------------------------------------------------------------ */

interface ArticleFilters {
  type: string;
  category: string;
  author: string;
  status: string;
  search: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface ArticlesState {
  articles: unknown[];
  currentArticle: unknown;
  loading: boolean;
  error: string | null;
  filters: ArticleFilters;
  pagination: PaginationState;
  setArticles: (articles: unknown[]) => void;
  setCurrentArticle: (article: unknown) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<ArticleFilters>) => void;
  setPagination: (pagination: Partial<PaginationState>) => void;
  resetFilters: () => void;
}

export const useArticlesStore = create<ArticlesState>((set) => ({
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,
  filters: {
    type: 'all',
    category: 'all',
    author: 'all',
    status: 'all',
    search: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  },
  setArticles: (articles) => set({ articles }),
  setCurrentArticle: (article) => set({ currentArticle: article }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  })),
  resetFilters: () => set({
    filters: {
      type: 'all',
      category: 'all',
      author: 'all',
      status: 'all',
      search: '',
    },
  }),
}));

/* ------------------------------------------------------------------ */
/*  Authors Store                                                     */
/* ------------------------------------------------------------------ */

interface AuthorsState {
  authors: unknown[];
  currentAuthor: unknown;
  loading: boolean;
  error: string | null;
  setAuthors: (authors: unknown[]) => void;
  setCurrentAuthor: (author: unknown) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthorsStore = create<AuthorsState>((set) => ({
  authors: [],
  currentAuthor: null,
  loading: false,
  error: null,
  setAuthors: (authors) => set({ authors }),
  setCurrentAuthor: (author) => set({ currentAuthor: author }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

/* ------------------------------------------------------------------ */
/*  Media Store                                                       */
/* ------------------------------------------------------------------ */

interface MediaPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

interface MediaState {
  media: unknown[];
  selectedMedia: (number | string)[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  pagination: MediaPagination;
  setMedia: (media: unknown[]) => void;
  appendMedia: (newMedia: unknown[]) => void;
  setSelectedMedia: (selected: (number | string)[]) => void;
  toggleMediaSelection: (id: number | string) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUploadProgress: (progress: number) => void;
  setPagination: (pagination: Partial<MediaPagination>) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  media: [],
  selectedMedia: [],
  loading: false,
  error: null,
  uploadProgress: 0,
  pagination: {
    page: 1,
    limit: 24,
    total: 0,
    total_pages: 0,
    has_more: false
  },
  setMedia: (media) => set({ media }),
  appendMedia: (newMedia) => set((state) => ({ media: [...state.media, ...newMedia] })),
  setSelectedMedia: (selected) => set({ selectedMedia: selected }),
  toggleMediaSelection: (id) => set((state) => ({
    selectedMedia: state.selectedMedia.includes(id)
      ? state.selectedMedia.filter((mediaId) => mediaId !== id)
      : [...state.selectedMedia, id]
  })),
  clearSelection: () => set({ selectedMedia: [] }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setPagination: (pagination) => set((state) => ({
    pagination: { ...state.pagination, ...pagination }
  })),
}));

/* ------------------------------------------------------------------ */
/*  Categories Store                                                  */
/* ------------------------------------------------------------------ */

interface CategoriesState {
  categories: unknown[];
  loading: boolean;
  error: string | null;
  setCategories: (categories: unknown[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: [],
  loading: false,
  error: null,
  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

/* ------------------------------------------------------------------ */
/*  Tags Store                                                        */
/* ------------------------------------------------------------------ */

interface TagsState {
  tags: unknown[];
  loading: boolean;
  error: string | null;
  setTags: (tags: unknown[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTagsStore = create<TagsState>((set) => ({
  tags: [],
  loading: false,
  error: null,
  setTags: (tags) => set({ tags }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

/* ------------------------------------------------------------------ */
/*  Pinterest Boards Store                                            */
/* ------------------------------------------------------------------ */

interface PinterestBoardsState {
  boards: unknown[];
  loading: boolean;
  error: string | null;
  setBoards: (boards: unknown[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePinterestBoardsStore = create<PinterestBoardsState>((set) => ({
  boards: [],
  loading: false,
  error: null,
  setBoards: (boards) => set({ boards }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

/* ------------------------------------------------------------------ */
/*  Homepage Store                                                    */
/* ------------------------------------------------------------------ */

interface HomepageState {
  homepage: Record<string, unknown>;
  loading: boolean;
  error: string | null;
  setHomepage: (homepage: Record<string, unknown>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHomepageStore = create<HomepageState>((set) => ({
  homepage: {},
  loading: false,
  error: null,
  setHomepage: (homepage) => set({ homepage }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

/* ------------------------------------------------------------------ */
/*  Settings Store                                                    */
/* ------------------------------------------------------------------ */

interface SettingsState {
  settings: Record<string, unknown>;
  loading: boolean;
  error: string | null;
  updateSetting: (key: string, value: unknown) => void;
  setSettings: (settings: Record<string, unknown>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  loading: false,
  error: null,
  setSettings: (settings) => set({ settings }),
  updateSetting: (key, value) => set((state) => ({
    settings: { ...state.settings, [key]: value }
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  resetSettings: () => set({ settings: {}, loading: false, error: null }),
}));
