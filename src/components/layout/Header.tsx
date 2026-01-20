import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-[#EAB308] text-white pt-10 pb-20 px-6 relative overflow-hidden shadow-lg">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none"></div>
      <div className="max-w-6xl mx-auto flex justify-between items-center relative z-10">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-md">
            SUBE TU <br />
            <span className="text-white">FACTURA</span>
          </h1>
          <p className="mt-4 text-yellow-100 font-medium text-lg max-w-md">
            Valida y procesa tus facturas CFDI con inteligencia artificial.
          </p>
        </div>
        <div className="hidden md:block">
          <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-sm border border-white/30">
            <ShieldCheck size={80} className="text-white" />
          </div>
        </div>
      </div>
    </header>
  );
};
