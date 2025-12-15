import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Users,
  Tags,
  Image,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChefHat,
  Pin,
  Home,
  LayoutTemplate,
  ChevronDown,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useUIStore, useAuthStore } from '../store/useStore';
import SessionMonitor from './SessionMonitor';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const [pinterestExpanded, setPinterestExpanded] = useState(true);
  const [blogExpanded, setBlogExpanded] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);

  // Fetch logo on mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // Try to find logo in public/logos directory via a simple fetch
        const extensions = ['svg', 'png', 'webp', 'jpg'];
        for (const ext of extensions) {
          const response = await fetch(`/logos/logo-main.${ext}`, { method: 'HEAD' });
          if (response.ok) {
            setLogoUrl(`/logos/logo-main.${ext}`);
            break;
          }
        }
      } catch (e) {
        // No logo found, use fallback
      }
    };
    fetchLogo();
  }, []);

  // Main navigation items (Dashboard & Homepage)
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Homepage', href: '/homepage', icon: Home },
  ];

  // Blog management items
  const blogItems = [
    { name: 'Articles', href: '/articles', icon: FileText },
    { name: 'Categories', href: '/categories', icon: FolderOpen },
    { name: 'Authors', href: '/authors', icon: Users },
    { name: 'Tags', href: '/tags', icon: Tags },
  ];

  // Pinterest submenu items
  const pinterestItems = [
    { name: 'Board', href: '/pinterest/boards', icon: Pin },
    { name: 'Pin Template', href: '/templates', icon: LayoutTemplate },
  ];

  // Bottom navigation items
  const bottomNavigation = [
    { name: 'Media', href: '/media', icon: Image },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('admin_token');
    navigate('/login', { replace: true });
  };

  // Check active states
  const isPinterestActive = pinterestItems.some(item =>
    location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  );

  const isBlogActive = blogItems.some(item =>
    location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  );

  // Get current page info (name and icon) for header
  const getCurrentPageInfo = () => {
    const allItems = [...navigation, ...blogItems, ...pinterestItems, ...bottomNavigation];
    const current = allItems.find(item =>
      location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    );
    return current || { name: 'Dashboard', icon: LayoutDashboard };
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-0 md:w-64'
          } transition-all duration-300 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex-shrink-0 flex flex-col overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-zinc-800">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Freecipies"
                className="h-10 w-auto object-contain"
              />
            ) : (
              <>
                <ChefHat className="w-7 h-7 text-gray-900 dark:text-white mr-2" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Freecipies</span>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {/* Dashboard & Homepage */}
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                    ? 'text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 bg-gray-900 dark:bg-white rounded-lg"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </span>
                </Link>
              );
            })}

            {/* Blog Section */}
            <div className="space-y-1 pt-2">
              <button
                onClick={() => setBlogExpanded(!blogExpanded)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isBlogActive && !blogExpanded
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-3" />
                  Blog
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${blogExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {blogExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 space-y-1 pb-1">
                      {blogItems.map((item) => {
                        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`relative flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                              ? 'text-white dark:text-gray-900'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                              }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-bg"
                                className="absolute inset-0 bg-gray-900 dark:bg-white rounded-lg"
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center">
                              <Icon className="w-4 h-4 mr-3" />
                              {item.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pinterest Section */}
            <div className="space-y-1 pt-2">
              <button
                onClick={() => setPinterestExpanded(!pinterestExpanded)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isPinterestActive && !pinterestExpanded
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
              >
                <div className="flex items-center">
                  <Share2 className="w-5 h-5 mr-3" />
                  Pinterest
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${pinterestExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {pinterestExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 space-y-1 pb-1">
                      {pinterestItems.map((item) => {
                        const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`relative flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                              ? 'text-white dark:text-gray-900'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                              }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-bg"
                                className="absolute inset-0 bg-gray-900 dark:bg-white rounded-lg"
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center">
                              <Icon className="w-4 h-4 mr-3" />
                              {item.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Navigation Items */}
            {bottomNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                    ? 'text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 bg-gray-900 dark:bg-white rounded-lg"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
            <div className="flex items-center mb-4">
              <div className="h-9 w-9 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 font-bold text-sm">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || 'admin@freecipies.com'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-zinc-950">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="md:hidden mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {(() => {
              const pageInfo = getCurrentPageInfo();
              const PageIcon = pageInfo.icon;
              return (
                <div className="flex items-center gap-2">
                  <PageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {pageInfo.name}
                  </h1>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full transition-colors"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
      <SessionMonitor />
    </div>
  );
};

export default AdminLayout;
