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
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-500/10',
    borderLight: 'border-red-200',
    borderDark: 'dark:border-red-500/30',
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-300',
    messageColor: 'text-red-700 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  },
  warning: {
    icon: AlertTriangle,
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-500/10',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-500/30',
    iconColor: 'text-amber-500 dark:text-amber-400',
    titleColor: 'text-amber-800 dark:text-amber-300',
    messageColor: 'text-amber-700 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600',
  },
  success: {
    icon: CheckCircle,
    bgLight: 'bg-green-50',
    bgDark: 'dark:bg-green-500/10',
    borderLight: 'border-green-200',
    borderDark: 'dark:border-green-500/30',
    iconColor: 'text-green-500 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-300',
    messageColor: 'text-green-700 dark:text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
  },
  info: {
    icon: Info,
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-500/10',
    borderLight: 'border-blue-200',
    borderDark: 'dark:border-blue-500/30',
    iconColor: 'text-blue-500 dark:text-blue-400',
    titleColor: 'text-blue-800 dark:text-blue-300',
    messageColor: 'text-blue-700 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
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
          ${config.bgLight} ${config.bgDark} ${config.borderLight} ${config.borderDark} border-2
          rounded-2xl shadow-2xl dark:shadow-black/30
          transform transition-all duration-200 animate-scale-in
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
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
                <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-white/80 dark:border-white/10">
                  <code className="text-xs text-gray-600 dark:text-gray-400 break-all whitespace-pre-wrap">
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
