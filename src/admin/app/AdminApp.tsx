import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useAuthStore } from '../store/useStore';
import AdminLayout from '../components/AdminLayout';
import ThemeProvider from '../components/ThemeProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { Toaster } from '../ui/sonner';
import '../App.css';
import '../index.css';
import { Login, adminLayoutRoutes, fullScreenAdminRoutes } from './routes';
import type { AdminLayoutRoute } from './routes';
import PageLoader from '../components/PageLoader';
import { getProtectedRouteDestination } from './route-contract';

import { Suspense, useEffect } from 'react';

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

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuthStore();

  const destination = getProtectedRouteDestination(isAuthenticated);

  if (destination) {
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};

const renderAdminRoute = (route: AdminLayoutRoute) => {
  if ('element' in route) {
    const { index, path, element } = route;
    const routeProps = index ? { index: true as const } : { path };
    return <Route key={path || 'index'} {...routeProps} element={element} />;
  }

  const { index, path, Component } = route;
  const routeProps = index ? { index: true as const } : { path };
  return <Route key={path || 'index'} {...routeProps} element={<Component />} />;
};

function AdminApp() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/admin">
        <AuthRedirectHandler />
        <Toaster position="top-right" richColors closeButton duration={4000} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default AdminApp;
