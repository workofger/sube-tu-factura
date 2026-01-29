import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, FileText, CheckCircle, Clock, Zap } from 'lucide-react';
import { useUserAuthContext } from '../../contexts/UserAuthContext';

const UserLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading: isCheckingSession, isAuthenticated } = useUserAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/portal/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await login(email, password);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-partrunner-bg-main flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-partrunner-yellow/20 border-t-partrunner-yellow rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-partrunner-bg-main flex flex-col lg:flex-row items-center justify-center p-4 transition-colors duration-300">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,216,64,0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,216,64,0.05),transparent_50%)]"></div>
      </div>

      <div className="relative w-full max-w-4xl flex bg-white rounded-2xl shadow-xl overflow-hidden border border-partrunner-gray-light">
        {/* Left Panel - Branding/Features */}
        <div className="hidden lg:flex w-1/2 bg-partrunner-yellow p-8 flex-col justify-between">
          <div className="flex-grow flex flex-col justify-center">
            <img 
              src="/images/logo-full-black.png"
              alt="Partrunner"
              className="h-14 w-auto mb-8"
            />
            <h2 className="text-2xl font-bold text-partrunner-black mb-3">
              Portal de Flotilleros
            </h2>
            <p className="text-partrunner-black/70 text-sm mb-8">
              Administra tus facturas, revisa el estado de tus pagos y mantén tu información actualizada.
            </p>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/20 rounded-xl p-3">
                <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-partrunner-black" />
                </div>
                <div>
                  <p className="font-semibold text-partrunner-black text-sm">Historial de Facturas</p>
                  <p className="text-partrunner-black/60 text-xs">Consulta todas tus facturas enviadas</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/20 rounded-xl p-3">
                <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-partrunner-black" />
                </div>
                <div>
                  <p className="font-semibold text-partrunner-black text-sm">Estado de Pagos</p>
                  <p className="text-partrunner-black/60 text-xs">Conoce cuándo recibirás tu pago</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/20 rounded-xl p-3">
                <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-partrunner-black" />
                </div>
                <div>
                  <p className="font-semibold text-partrunner-black text-sm">Pronto Pago</p>
                  <p className="text-partrunner-black/60 text-xs">Recibe tus pagos en 1 día hábil</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-partrunner-black/50 text-xs">
            © {new Date().getFullYear()} Partrunner. Todos los derechos reservados.
          </p>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src="/images/logo-full-black.png"
              alt="Partrunner"
              className="h-10 w-auto mx-auto mb-4"
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-partrunner-black mb-2">
              Iniciar Sesión
            </h2>
            <p className="text-gray-500 text-sm">
              Ingresa tus credenciales para continuar
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-gray-400 focus:outline-none focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-gray-400 focus:outline-none focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3.5 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-lg shadow-partrunner-yellow/25 hover:shadow-partrunner-yellow/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Acceder
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-3">
            <a href="#" className="text-partrunner-yellow-accent hover:text-partrunner-yellow-dark text-sm font-medium">
              ¿Olvidaste tu contraseña?
            </a>
            <p className="text-gray-500 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/" className="text-partrunner-yellow-accent hover:text-partrunner-yellow-dark font-medium">
                Contacta a tu administrador
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
