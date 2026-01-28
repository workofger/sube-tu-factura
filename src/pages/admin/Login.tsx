import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isLoading: authLoading, isAuthenticated } = useAdminAuthContext();
  const { isDark, toggleTheme } = useTheme();
  
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
      <div className="min-h-screen bg-gray-50 dark:bg-partrunner-black flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-partrunner-yellow/20 border-t-partrunner-yellow rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-partrunner-black flex items-center justify-center p-4 transition-colors duration-300">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-partrunner-yellow/10 rounded-full blur-3xl -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-partrunner-yellow/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-partrunner-yellow/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Theme Toggle - Top Right */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-2.5 rounded-xl bg-white dark:bg-partrunner-charcoal border border-gray-200 dark:border-partrunner-gray-dark text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 shadow-sm"
        aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
      >
        {isDark ? <Sun size={20} className="text-partrunner-yellow" /> : <Moon size={20} />}
      </button>
      
      <div className="w-full max-w-md relative">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <img 
              src={isDark ? "/images/logo-full-white.png" : "/images/logo-full-black.png"}
              alt="Partrunner"
              className="h-12 w-auto"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-partrunner-yellow/10 rounded-full">
            <div className="w-2 h-2 bg-partrunner-yellow rounded-full animate-pulse"></div>
            <span className="text-partrunner-yellow-dark dark:text-partrunner-yellow text-sm font-medium">
              Panel de Administración
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-partrunner-charcoal rounded-2xl border border-gray-200 dark:border-partrunner-gray-dark shadow-xl dark:shadow-2xl dark:shadow-black/20 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Bienvenido de vuelta
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
            Ingresa tus credenciales para acceder
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  placeholder="admin@partrunner.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-partrunner-black border-2 border-gray-200 dark:border-partrunner-gray-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-partrunner-black border-2 border-gray-200 dark:border-partrunner-gray-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full py-3.5 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-lg shadow-partrunner-yellow/25 hover:shadow-partrunner-yellow/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Acceder
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-6">
          Solo personal autorizado de Partrunner
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
