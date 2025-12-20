import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'admin-auth',
    }
  )
);

// UI Store
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  theme: 'light',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
}));

// Articles Store
export const useArticlesStore = create((set) => ({
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,
  filters: {
    type: 'all', // 'all', 'article', 'recipe'
    category: 'all',
    author: 'all',
    status: 'all', // 'all', 'online', 'offline'
    search: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
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

// Authors Store
export const useAuthorsStore = create((set) => ({
  authors: [],
  currentAuthor: null,
  loading: false,
  error: null,

  setAuthors: (authors) => set({ authors }),
  setCurrentAuthor: (author) => set({ currentAuthor: author }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Media Store
export const useMediaStore = create((set) => ({
  media: [],
  selectedMedia: [],
  loading: false,
  error: null,
  uploadProgress: 0,
  
  setMedia: (media) => set({ media }),
  setSelectedMedia: (selected) => set({ selectedMedia: selected }),
  toggleMediaSelection: (id) => set((state) => ({
    selectedMedia: state.selectedMedia.includes(id)
      ? state.selectedMedia.filter(mediaId => mediaId !== id)
      : [...state.selectedMedia, id]
  })),
  clearSelection: () => set({ selectedMedia: [] }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));

// Categories Store
export const useCategoriesStore = create((set) => ({
  categories: [],
  loading: false,
  error: null,

  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Tags Store
export const useTagsStore = create((set) => ({
  tags: [],
  loading: false,
  error: null,

  setTags: (tags) => set({ tags }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Pinterest Boards Store
export const usePinterestBoardsStore = create((set) => ({
  boards: [],
  loading: false,
  error: null,

  setBoards: (boards) => set({ boards }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Homepage Store
export const useHomepageStore = create((set) => ({
  homepage: {},
  loading: false,
  error: null,

  setHomepage: (homepage) => set({ homepage }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Settings Store
export const useSettingsStore = create((set) => ({
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

