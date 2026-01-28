import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Download, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  Key,
  Users,
  FolderKanban,
  Sun,
  Moon
} from 'lucide-react';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminUser, signOut } = useAdminAuthContext();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isSuperAdmin = adminUser?.role === 'super_admin';
  const isOperations = adminUser?.role === 'operations' || isSuperAdmin;

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Facturas', href: '/admin/invoices', icon: FileText },
    { name: 'Proyectos', href: '/admin/projects', icon: FolderKanban },
    { name: 'Reportes', href: '/admin/reports', icon: Download },
    ...(isOperations ? [
      { name: 'Usuarios', href: '/admin/users', icon: Users },
    ] : []),
    ...(isSuperAdmin ? [
      { name: 'Configuración', href: '/admin/settings', icon: Settings },
      { name: 'API Keys', href: '/admin/api-keys', icon: Key },
    ] : []),
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const isCurrentPath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-partrunner-black transition-colors duration-300">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,195,65,0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,195,65,0.03),transparent_50%)]"></div>
      </div>
      
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-partrunner-charcoal rounded-xl border border-gray-200 dark:border-partrunner-gray-dark text-gray-700 dark:text-white shadow-sm"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white dark:bg-partrunner-charcoal backdrop-blur-xl border-r border-gray-200 dark:border-partrunner-gray-dark z-40
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-partrunner-gray-dark">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <img 
              src={isDark ? "/images/icon-color.png" : "/images/icon-color.png"}
              alt="Partrunner"
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Partrunner</h1>
              <p className="text-xs text-partrunner-yellow font-medium">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isCurrentPath(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-partrunner-yellow/10 text-partrunner-yellow-dark dark:text-partrunner-yellow border border-partrunner-yellow/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-partrunner-gray-dark'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-partrunner-yellow' : ''}`} />
                <span className="font-medium">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-partrunner-yellow" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-partrunner-gray-dark space-y-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-partrunner-gray-dark hover:bg-gray-200 dark:hover:bg-partrunner-black text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-partrunner-yellow" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm font-medium">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 bg-partrunner-yellow/20 rounded-xl flex items-center justify-center">
              <span className="text-partrunner-yellow-dark dark:text-partrunner-yellow font-bold">
                {adminUser?.fullName?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white font-medium truncate text-sm">
                {adminUser?.fullName || 'Admin'}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs truncate">
                {adminUser?.email || ''}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
