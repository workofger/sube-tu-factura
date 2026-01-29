import React from 'react';
import { FileText, Clock, CheckCircle } from 'lucide-react';
import { formatDeadline, isAfterDeadline } from '../../utils/dates';

export const Header: React.FC = () => {
  const afterDeadline = isAfterDeadline();
  const deadline = formatDeadline();

  return (
    <header className="relative bg-partrunner-yellow overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 pb-20">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <img 
            src="/images/logo-full-black.png" 
            alt="Partrunner" 
            className="h-10 w-auto"
          />
          
          {/* Deadline Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            afterDeadline 
              ? 'bg-red-500/20 text-red-800 border border-red-500/30' 
              : 'bg-white/30 text-partrunner-black border border-white/50'
          }`}>
            <Clock size={16} />
            <span className="hidden sm:inline">
              {afterDeadline ? 'Fuera de plazo' : `Límite: ${deadline}`}
            </span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-partrunner-black mb-4">
            Sube tu Factura
          </h1>
          <p className="text-partrunner-black/70 text-lg mb-6">
            Carga tu XML y PDF para procesar automáticamente tu factura con inteligencia artificial
          </p>

          {/* Process Steps */}
          <div className="flex items-center justify-center gap-4 md:gap-8 text-sm">
            <div className="flex items-center gap-2 text-partrunner-black/80">
              <div className="w-8 h-8 bg-white/40 rounded-full flex items-center justify-center">
                <FileText size={16} />
              </div>
              <span className="hidden sm:inline">1. Sube archivos</span>
            </div>
            <div className="w-8 h-0.5 bg-partrunner-black/20"></div>
            <div className="flex items-center gap-2 text-partrunner-black/80">
              <div className="w-8 h-8 bg-white/40 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">AI</span>
              </div>
              <span className="hidden sm:inline">2. Extracción automática</span>
            </div>
            <div className="w-8 h-0.5 bg-partrunner-black/20"></div>
            <div className="flex items-center gap-2 text-partrunner-black/80">
              <div className="w-8 h-8 bg-white/40 rounded-full flex items-center justify-center">
                <CheckCircle size={16} />
              </div>
              <span className="hidden sm:inline">3. Confirma y envía</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
