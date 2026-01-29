import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Upload,
  Receipt,
} from 'lucide-react';
import { useUserAuthContext } from '../../contexts/UserAuthContext';

interface UserLayoutProps {
  children: ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUserAuthContext();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
    { name: 'Mis Facturas', href: '/portal/invoices', icon: FileText },
    { name: 'Facturación', href: '/portal/facturacion', icon: Receipt },
    { name: 'Subir Factura', href: '/', icon: Upload },
    { name: 'Mi Perfil', href: '/portal/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  const isCurrentPath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-partrunner-bg-main transition-colors duration-300">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,216,64,0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,216,64,0.03),transparent_50%)]"></div>
      </div>

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl border border-partrunner-gray-light text-partrunner-black shadow-sm"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 h-full w-64 bg-partrunner-yellow z-40
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-partrunner-yellow-dark">
          <Link to="/portal/dashboard" className="flex items-center gap-3">
            <img 
              src="/images/logo-full-black.png"
              alt="Partrunner"
              className="h-10 w-auto"
            />
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
                  ${
                    isActive
                      ? 'bg-white text-partrunner-black shadow-sm'
                      : 'text-partrunner-black/80 hover:bg-partrunner-yellow-dark'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-partrunner-yellow-accent' : 'text-partrunner-black/70'}`} />
                <span className="font-medium">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-partrunner-yellow-accent" />}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-partrunner-yellow-dark space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 bg-partrunner-yellow-dark rounded-xl flex items-center justify-center">
              <span className="text-partrunner-black font-bold">
                {user?.fiscal_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-partrunner-black font-medium truncate text-sm">
                {user?.fiscal_name || user?.email || 'Usuario'}
              </p>
              <p className="text-partrunner-black/60 text-xs truncate">
                {user?.type === 'flotillero' ? 'Flotillero' : 'Independiente'}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl border border-red-500/30 transition-colors"
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
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default UserLayout;
