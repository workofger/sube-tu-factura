import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-partrunner-black via-partrunner-charcoal to-partrunner-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-partrunner-yellow-accent animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
