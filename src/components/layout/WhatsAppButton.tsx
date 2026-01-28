import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber = '5215644443529',
  message = '¡Hola! Necesito ayuda con mi factura.',
}) => {
  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        onClick={handleClick}
        className="group bg-green-500 hover:bg-green-600 text-white p-4 rounded-2xl shadow-xl shadow-green-500/30 dark:shadow-green-500/20 transition-all duration-200 hover:scale-105 hover:-translate-y-1 flex items-center justify-center"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={28} className="group-hover:scale-110 transition-transform duration-200" />
        
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg">
          ¿Necesitas ayuda?
        </span>
      </button>
      
      {/* Pulse animation */}
      <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
      </span>
    </div>
  );
};
