import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/useStore';
import AdminLayout from './components/AdminLayout';
import ThemeProvider from './components/ThemeProvider';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/dashboard/Dashboard';
import './App.css';
import './index.css'; // Import global styles including Tailwind
import { importWithRetry } from './utils/importWithRetry';

// Lazy load pages for better performance
import { lazy, Suspense, useEffect } from 'react';

const Homepage = lazy(() => importWithRetry(() => import('./pages/homepage/Homepage')));
const ArticlesList = lazy(() => importWithRetry(() => import('./pages/articles/ArticlesList')));
const ArticleEditor = lazy(() => importWithRetry(() => import('./pages/articles/ArticleEditor')));
const GutenbergArticleEditor = lazy(() => importWithRetry(() => import('./pages/articles/GutenbergArticleEditor')));
const RecipesList = lazy(() => importWithRetry(() => import('./pages/recipes/RecipesList')));
const RecipeEditor = lazy(() => importWithRetry(() => import('./pages/articles/RecipeEditor')));
const GutenbergRecipeEditor = lazy(() => importWithRetry(() => import('./pages/articles/GutenbergRecipeEditor')));
const RoundupsList = lazy(() => importWithRetry(() => import('./pages/roundups/RoundupsList')));
const RoundupEditor = lazy(() => importWithRetry(() => import('./pages/articles/RoundupEditor')));
const GutenbergRoundupEditor = lazy(() => importWithRetry(() => import('./pages/articles/GutenbergRoundupEditor')));
const CategoriesList = lazy(() => importWithRetry(() => import('./pages/categories/CategoriesList')));
const CategoryEditor = lazy(() => importWithRetry(() => import('./pages/categories/CategoryEditor')));
const AuthorsList = lazy(() => importWithRetry(() => import('./pages/authors/AuthorsList')));
const AuthorEditor = lazy(() => importWithRetry(() => import('./pages/authors/AuthorEditor')));
const TagsList = lazy(() => importWithRetry(() => import('./pages/tags/TagsList')));
const MediaLibrary = lazy(() => importWithRetry(() => import('./pages/media/MediaLibrary')));
const Settings = lazy(() => importWithRetry(() => import('./pages/settings/Settings')));
const Login = lazy(() => importWithRetry(() => import('./pages/auth/Login')));
const BoardsList = lazy(() => importWithRetry(() => import('./pages/pinterest/BoardsList')));
const BoardEditor = lazy(() => importWithRetry(() => import('./pages/pinterest/BoardEditor')));
const TemplatesList = lazy(() => importWithRetry(() => import('@modules/templates/components').then(m => ({ default: m.TemplatesList }))));
const TemplateEditor = lazy(() => importWithRetry(() => import('@modules/templates/components').then(m => ({ default: m.TemplateEditor }))));

// Loading component with skeleton
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

// Auth redirect handler - listens for unauthorized events from API interceptor

const AuthRedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  return null;
};

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AdminApp() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/admin">
        <AuthRedirectHandler />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Template Editor - Full Screen (outside AdminLayout) */}
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <TemplateEditor />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/new"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <TemplateEditor />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/:slug"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <TemplateEditor />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Routes (inside AdminLayout) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AdminLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />

              {/* Homepage */}
              <Route path="homepage" element={<Navigate to="/homepage/hero" replace />} />
              <Route path="homepage/:section" element={<Homepage />} />

              {/* Articles - Gutenberg Editor (default) */}
              <Route path="articles" element={<ArticlesList />} />
              <Route path="articles/new" element={<GutenbergArticleEditor />} />
              <Route path="articles/:slug" element={<GutenbergArticleEditor />} />

              {/* Articles Legacy - Old Editor */}
              <Route path="articles-legacy/new" element={<ArticleEditor />} />
              <Route path="articles-legacy/:slug" element={<ArticleEditor />} />

              {/* Recipes - Gutenberg Editor (default) */}
              <Route path="recipes" element={<RecipesList />} />
              <Route path="recipes/new" element={<GutenbergRecipeEditor />} />
              <Route path="recipes/:slug" element={<GutenbergRecipeEditor />} />

              {/* Recipes Legacy - Old Editor */}
              <Route path="recipes-legacy/new" element={<RecipeEditor />} />
              <Route path="recipes-legacy/:slug" element={<RecipeEditor />} />

              {/* Roundups - Gutenberg Editor (default) */}
              <Route path="roundups" element={<RoundupsList />} />
              <Route path="roundups/new" element={<GutenbergRoundupEditor />} />
              <Route path="roundups/:slug" element={<GutenbergRoundupEditor />} />

              {/* Roundups Legacy - Old Editor */}
              <Route path="roundups-legacy/new" element={<RoundupEditor />} />
              <Route path="roundups-legacy/:slug" element={<RoundupEditor />} />

              {/* Categories */}
              <Route path="categories" element={<CategoriesList />} />
              <Route path="categories/new" element={<CategoryEditor />} />
              <Route path="categories/:slug" element={<CategoryEditor />} />

              {/* Authors */}
              <Route path="authors" element={<AuthorsList />} />
              <Route path="authors/new" element={<AuthorEditor />} />
              <Route path="authors/:slug" element={<AuthorEditor />} />

              {/* Tags - inline editing in list */}
              <Route path="tags" element={<TagsList />} />

              {/* Media */}
              <Route path="media" element={<MediaLibrary />} />

              {/* Pinterest Boards */}
              <Route path="pinterest/boards" element={<BoardsList />} />
              <Route path="pinterest/boards/new" element={<BoardEditor />} />
              <Route path="pinterest/boards/:id" element={<BoardEditor />} />

              {/* Settings */}
              <Route path="settings" element={<Navigate to="/settings/general" replace />} />
              <Route path="settings/:tab" element={<Settings />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default AdminApp;
