import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useStore';
import AdminLayout from './components/AdminLayout';
import ThemeProvider from './components/ThemeProvider';
import Dashboard from './pages/dashboard/Dashboard';
import './App.css';
import './index.css'; // Import global styles including Tailwind

// Lazy load pages for better performance
import { lazy, Suspense } from 'react';

const Homepage = lazy(() => import('./pages/homepage/Homepage'));
const ArticlesList = lazy(() => import('./pages/articles/ArticlesList'));
const ArticleEditor = lazy(() => import('./pages/articles/ArticleEditor'));
const CategoriesList = lazy(() => import('./pages/categories/CategoriesList'));
const CategoryEditor = lazy(() => import('./pages/categories/CategoryEditor'));
const AuthorsList = lazy(() => import('./pages/authors/AuthorsList'));
const AuthorEditor = lazy(() => import('./pages/authors/AuthorEditor'));
const TagsList = lazy(() => import('./pages/tags/TagsList'));
const TagEditor = lazy(() => import('./pages/tags/TagEditor'));
const MediaLibrary = lazy(() => import('./pages/media/MediaLibrary'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const Login = lazy(() => import('./pages/auth/Login'));
const BoardsList = lazy(() => import('./pages/pinterest/BoardsList'));
const BoardEditor = lazy(() => import('./pages/pinterest/BoardEditor'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />

              {/* Homepage */}
              <Route path="homepage" element={<Homepage />} />

              {/* Articles */}
              <Route path="articles" element={<ArticlesList />} />
              <Route path="articles/new" element={<ArticleEditor />} />
              <Route path="articles/:slug" element={<ArticleEditor />} />

              {/* Categories */}
              <Route path="categories" element={<CategoriesList />} />
              <Route path="categories/new" element={<CategoryEditor />} />
              <Route path="categories/:slug" element={<CategoryEditor />} />

              {/* Authors */}
              <Route path="authors" element={<AuthorsList />} />
              <Route path="authors/new" element={<AuthorEditor />} />
              <Route path="authors/:slug" element={<AuthorEditor />} />

              {/* Tags */}
              <Route path="tags" element={<TagsList />} />
              <Route path="tags/new" element={<TagEditor />} />
              <Route path="tags/:slug" element={<TagEditor />} />

              {/* Media */}
              <Route path="media" element={<MediaLibrary />} />

              {/* Pinterest Boards */}
              <Route path="pinterest/boards" element={<BoardsList />} />
              <Route path="pinterest/boards/new" element={<BoardEditor />} />
              <Route path="pinterest/boards/:id" element={<BoardEditor />} />

              {/* Settings */}
              <Route path="settings" element={<Settings />} />
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
