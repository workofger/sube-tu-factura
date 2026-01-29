import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SystemConfig {
  prontoPagoEnabled: boolean;
  prontoPagoFeeRate: number;
  isLoading: boolean;
}

const defaultConfig: SystemConfig = {
  prontoPagoEnabled: true,
  prontoPagoFeeRate: 0.08,
  isLoading: true,
};

const SystemConfigContext = createContext<SystemConfig>(defaultConfig);

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

export const SystemConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/config`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setConfig({
            prontoPagoEnabled: data.data.prontoPagoEnabled ?? true,
            prontoPagoFeeRate: data.data.prontoPagoFeeRate ?? 0.08,
            isLoading: false,
          });
        } else {
          setConfig(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to load system config:', error);
        setConfig(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchConfig();
  }, []);

  return (
    <SystemConfigContext.Provider value={config}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
};

export default SystemConfigContext;
