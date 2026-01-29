import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isLoading: authLoading, isAuthenticated } = useAdminAuthContext();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn(email, password);
    
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.message);
    }
    
    setIsSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-partrunner-bg-main flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-partrunner-yellow/20 border-t-partrunner-yellow rounded-full animate-spin"></div>
          <p className="text-partrunner-gray-dark text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Yellow Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-partrunner-yellow items-center justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-black rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="/images/logo-full-black.png"
              alt="Partrunner"
              className="h-16 w-auto mx-auto"
            />
          </div>

          <h1 className="text-3xl font-bold text-partrunner-black mb-4">
            Panel de Administración
          </h1>
          <p className="text-partrunner-black/70 text-lg max-w-sm mx-auto">
            Gestiona facturas, reportes y usuarios de FacturaFlow desde un solo lugar.
          </p>

          {/* Features */}
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 justify-center text-partrunner-black/80">
              <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Procesamiento automático de facturas</span>
            </div>
            <div className="flex items-center gap-3 justify-center text-partrunner-black/80">
              <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Reportes de pagos semanales</span>
            </div>
            <div className="flex items-center gap-3 justify-center text-partrunner-black/80">
              <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Gestión de Pronto Pago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src="/images/logo-full-color.png"
              alt="Partrunner"
              className="h-10 w-auto mx-auto mb-4"
            />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-partrunner-yellow/10 rounded-full">
              <div className="w-2 h-2 bg-partrunner-yellow rounded-full animate-pulse"></div>
              <span className="text-partrunner-yellow-accent text-sm font-medium">
                Panel de Administración
              </span>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-partrunner-black mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-partrunner-gray-dark">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-partrunner-black mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-partrunner-gray-dark/50" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@partrunner.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-partrunner-gray-dark/50 focus:outline-none focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-partrunner-black mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-partrunner-gray-dark/50" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-partrunner-gray-dark/50 focus:outline-none focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full py-4 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-lg shadow-partrunner-yellow/25 hover:shadow-partrunner-yellow/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-partrunner-gray-dark/70 text-sm mt-8">
            Solo personal autorizado de Partrunner
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
