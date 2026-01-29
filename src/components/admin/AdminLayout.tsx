import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Download, 
  LogOut,
  Menu,
  X,
  Settings,
  Key,
  Users,
  FolderKanban,
  HelpCircle,
  User,
  Search,
  Bell,
  ChevronDown
} from 'lucide-react';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminUser, signOut } = useAdminAuthContext();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = React.useState(false);

  const isSuperAdmin = adminUser?.role === 'super_admin';
  const isOperations = adminUser?.role === 'operations' || isSuperAdmin;

  const mainNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Facturas', href: '/admin/invoices', icon: FileText },
    { name: 'Proyectos', href: '/admin/projects', icon: FolderKanban },
    { name: 'Reportes', href: '/admin/reports', icon: Download },
    ...(isOperations ? [
      { name: 'Usuarios', href: '/admin/users', icon: Users },
    ] : []),
  ];

  const adminSubNavigation = [
    ...(isSuperAdmin ? [
      { name: 'Configuración', href: '/admin/settings', icon: Settings },
      { name: 'API Keys', href: '/admin/api-keys', icon: Key },
    ] : []),
  ];

  const bottomNavigation = [
    { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
    { name: 'Mi Perfil', href: '/admin/profile', icon: User },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const isCurrentPath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-partrunner-bg-main">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl border border-partrunner-gray-light text-partrunner-black shadow-card"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar - Yellow like Figma */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-partrunner-yellow z-40
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-black/10">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/images/icon-color.png"
                alt="Partrunner"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="text-xl font-extrabold text-partrunner-black uppercase tracking-tight">
              Partrunner
            </h1>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="p-4 space-y-2">
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isCurrentPath(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm
                  ${isActive 
                    ? 'bg-white text-partrunner-black font-medium shadow-card' 
                    : 'text-partrunner-black/80 hover:bg-white/50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="capitalize tracking-tight">{item.name}</span>
              </Link>
            );
          })}

          {/* Admin Submenu */}
          {isSuperAdmin && adminSubNavigation.length > 0 && (
            <div>
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm text-partrunner-black/80 hover:bg-white/50"
              >
                <div className="flex items-center gap-4">
                  <Settings className="w-5 h-5" />
                  <span className="capitalize tracking-tight">Admin</span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {adminMenuOpen && (
                <div className="ml-6 mt-1 space-y-1">
                  {adminSubNavigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = isCurrentPath(item.href);
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm
                          ${isActive 
                            ? 'bg-white text-partrunner-black font-medium' 
                            : 'text-partrunner-black/70 hover:bg-white/40'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-black/10">
          <nav className="p-4 space-y-2">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = isCurrentPath(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-sm
                    ${isActive 
                      ? 'bg-white text-partrunner-black font-medium' 
                      : 'text-partrunner-black/80 hover:bg-white/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="capitalize tracking-tight">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Header Nav */}
        <header className="sticky top-0 z-20 bg-white shadow-header border-b border-partrunner-gray-light">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8">
            {/* Search */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <Search className="w-5 h-5 text-partrunner-black/40" />
              <input
                type="text"
                placeholder="Buscar factura..."
                className="flex-1 bg-transparent text-partrunner-black/80 placeholder:text-partrunner-black/40 focus:outline-none text-base"
              />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* User Badge */}
              <div className="hidden sm:flex items-center gap-3 bg-partrunner-yellow px-3 py-2 rounded-lg">
                <User className="w-5 h-5 text-partrunner-black" />
                <span className="text-sm font-medium text-partrunner-black">
                  {adminUser?.fullName?.split(' ')[0] || 'Admin'}
                </span>
                <ChevronDown className="w-5 h-5 text-partrunner-black/60" />
              </div>

              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-partrunner-black/60" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-partrunner-red rounded-full"></span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-partrunner-red"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
