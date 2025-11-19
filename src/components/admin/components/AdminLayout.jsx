import { Link, useLocation, Outlet } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useUIStore, useAuthStore } from '../store/useStore';

const AdminLayout = () => {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore();
  const { user, clearAuth } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Homepage', href: '/homepage', icon: Home },
    { name: 'Articles', href: '/articles', icon: FileText },
    { name: 'Categories', href: '/categories', icon: FolderOpen },
    { name: 'Authors', href: '/authors', icon: Users },
    { name: 'Tags', href: '/tags', icon: Tags },
    { name: 'Pinterest Boards', href: '/pinterest/boards', icon: Pin },
    { name: 'Media', href: '/media', icon: Image },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 bg-card border-r border-border overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <ChefHat className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">Freecipies</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'admin@freecipies.com'}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
              <h1 className="text-2xl font-bold">
                {navigation.find(item => item.href === location.pathname)?.name || 'Admin Panel'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

