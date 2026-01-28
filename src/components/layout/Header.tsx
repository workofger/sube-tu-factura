import React from 'react';
import { Sun, Moon, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const Header: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header className="bg-partrunner-yellow dark:bg-partrunner-black text-partrunner-black dark:text-white pt-8 pb-24 px-6 relative overflow-hidden transition-colors duration-300">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Light mode decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-y-20 translate-x-20 dark:opacity-0 transition-opacity duration-300"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-partrunner-yellow-dark/30 rounded-full blur-2xl translate-y-20 -translate-x-10 dark:opacity-0 transition-opacity duration-300"></div>
        
        {/* Dark mode decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-partrunner-yellow/10 rounded-full blur-3xl -translate-y-20 translate-x-20 opacity-0 dark:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute bottom-0 left-1/2 w-[600px] h-32 bg-gradient-to-t from-partrunner-yellow/5 to-transparent opacity-0 dark:opacity-100 transition-opacity duration-300"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Top bar with logo and theme toggle */}
        <div className="flex justify-between items-center mb-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={isDark ? "/images/logo-full-white.png" : "/images/logo-full-black.png"}
              alt="Partrunner"
              className="h-8 md:h-10 w-auto transition-opacity duration-300"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 backdrop-blur-sm border border-white/30 dark:border-white/10 transition-all duration-200 group"
            aria-label={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
          >
            {isDark ? (
              <Sun size={20} className="text-partrunner-yellow group-hover:rotate-12 transition-transform duration-200" />
            ) : (
              <Moon size={20} className="text-partrunner-black group-hover:-rotate-12 transition-transform duration-200" />
            )}
          </button>
        </div>

        {/* Hero content */}
        <div className="flex justify-between items-center">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              SUBE TU{' '}
              <span className="text-white dark:text-partrunner-yellow drop-shadow-sm">
                FACTURA
              </span>
            </h1>
            <p className="mt-4 text-partrunner-black/70 dark:text-white/70 font-medium text-lg">
              Valida y procesa tus facturas CFDI de forma rápida, segura y automática.
            </p>
          </div>

          {/* Icon decoration - visible on md+ */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 dark:bg-partrunner-yellow/20 rounded-3xl blur-xl scale-110"></div>
              <div className="relative bg-white/30 dark:bg-partrunner-charcoal/80 p-8 rounded-3xl backdrop-blur-sm border border-white/40 dark:border-partrunner-yellow/20">
                <FileText size={64} className="text-partrunner-black dark:text-partrunner-yellow" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
