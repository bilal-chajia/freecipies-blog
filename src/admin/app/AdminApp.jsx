import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import AdminLayout from '../components/AdminLayout';
import ThemeProvider from '../components/ThemeProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { Toaster } from '../ui/sonner';
import '../App.css';
import '../index.css'; // Import global styles including Tailwind
import { Login, adminLayoutRoutes, fullScreenAdminRoutes } from './routes';

import { Suspense, useEffect } from 'react';

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

const renderAdminRoute = (route) => {
  if (route.element) {
    return <Route key={route.path || 'index'} {...route} />;
  }

  const Component = route.Component;
  const routeProps = route.index ? { index: true } : { path: route.path };
  return <Route key={route.path || 'index'} {...routeProps} element={<Component />} />;
};

function AdminApp() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/admin">
        <AuthRedirectHandler />
        <Toaster position="top-right" richColors closeButton duration={4000} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Login Route */}
            <Route path="/login" element={<Login />} />

            {fullScreenAdminRoutes.map(({ path, Component }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Component />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
            ))}

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
              {adminLayoutRoutes.map(renderAdminRoute)}
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
