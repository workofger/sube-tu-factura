import React from 'react';
import { AlertTriangle, XCircle, CheckCircle, Info, X } from 'lucide-react';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

interface AlertPopupProps {
  isOpen: boolean;
  onClose: () => void;
  type: AlertType;
  title: string;
  message: string;
  details?: string;
  buttonText?: string;
}

const alertConfig = {
  error: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    messageColor: 'text-red-700',
    buttonBg: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800',
    messageColor: 'text-amber-700',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    messageColor: 'text-green-700',
    buttonBg: 'bg-green-600 hover:bg-green-700',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-700',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
  },
};

export const AlertPopup: React.FC<AlertPopupProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  buttonText = 'Entendido',
}) => {
  if (!isOpen) return null;

  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`
          relative z-10 w-full max-w-md
          ${config.bg} ${config.border} border-2
          rounded-2xl shadow-2xl
          transform transition-all duration-200 animate-scale-in
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-black/5"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Content */}
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${config.iconColor}`}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <h3 className={`text-lg font-bold ${config.titleColor}`}>
                {title}
              </h3>
              <p className={`mt-2 text-sm ${config.messageColor}`}>
                {message}
              </p>
              {details && (
                <div className="mt-3 p-3 bg-white/70 rounded-xl border border-white/80">
                  <code className="text-xs text-gray-600 break-all whitespace-pre-wrap">
                    {details}
                  </code>
                </div>
              )}
            </div>
          </div>
          
          {/* Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className={`
                px-6 py-2.5 rounded-xl
                text-white font-semibold text-sm
                ${config.buttonBg}
                transition-all duration-200
                shadow-lg hover:shadow-xl
              `}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertPopup;
