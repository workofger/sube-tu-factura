import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Banknote,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getSystemConfig, updateSystemConfig, SystemConfig } from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface PaymentSourceAccount {
  account_number: string;
  institution_id: string;
  institution_name: string;
  account_type: string;
}

interface ProntoPagoConfig {
  fee_rate: number;
  processing_days: number;
  enabled: boolean;
}

const Settings: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProntoPago, setIsSavingProntoPago] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [prontoPagoResult, setProntoPagoResult] = useState<{ success: boolean; message: string } | null>(null);

  // Payment source account state
  const [sourceAccount, setSourceAccount] = useState<PaymentSourceAccount>({
    account_number: '',
    institution_id: '',
    institution_name: '',
    account_type: 'clabe',
  });

  // Pronto Pago config state
  const [prontoPagoConfig, setProntoPagoConfig] = useState<ProntoPagoConfig>({
    fee_rate: 0.08,
    processing_days: 1,
    enabled: true,
  });

  // Load configurations
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      
      // Load payment source account
      const sourceResponse = await getSystemConfig('payment_source_account');
      if (sourceResponse.success && sourceResponse.data) {
        const config = sourceResponse.data as SystemConfig;
        const value = config.value as unknown as PaymentSourceAccount;
        setSourceAccount(value);
      }
      
      // Load pronto pago config
      const prontoPagoResponse = await getSystemConfig('pronto_pago_config');
      if (prontoPagoResponse.success && prontoPagoResponse.data) {
        const config = prontoPagoResponse.data as SystemConfig;
        const value = config.value as unknown as ProntoPagoConfig;
        setProntoPagoConfig(value);
      }
      
      setIsLoading(false);
    };

    loadConfig();
  }, []);

  const handleSaveSourceAccount = async () => {
    setIsSaving(true);
    setResult(null);

    const response = await updateSystemConfig('payment_source_account', sourceAccount as unknown as Record<string, unknown>);
    
    setResult({
      success: response.success,
      message: response.success 
        ? 'Configuración guardada correctamente' 
        : response.message || 'Error al guardar',
    });
    setIsSaving(false);
  };

  const handleToggleProntoPago = async () => {
    setIsSavingProntoPago(true);
    setProntoPagoResult(null);

    const newConfig = {
      ...prontoPagoConfig,
      enabled: !prontoPagoConfig.enabled,
    };

    const response = await updateSystemConfig('pronto_pago_config', newConfig as unknown as Record<string, unknown>);
    
    if (response.success) {
      setProntoPagoConfig(newConfig);
    }
    
    setProntoPagoResult({
      success: response.success,
      message: response.success 
        ? `Pronto Pago ${newConfig.enabled ? 'activado' : 'desactivado'} correctamente` 
        : response.message || 'Error al actualizar',
    });
    setIsSavingProntoPago(false);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Acceso Restringido</h2>
          <p className="text-gray-400">
            Solo los administradores con rol super_admin pueden acceder a la configuración.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Configuración del Sistema</h1>
        <p className="text-gray-400">
          Administra las configuraciones globales de la plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Source Account */}
        <div className="bg-partrunner-charcoal/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Cuenta Origen de Pagos</h2>
              <p className="text-gray-400 text-sm">Cuenta desde la que se dispersan los pagos</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número de Cuenta / CLABE
              </label>
              <input
                type="text"
                value={sourceAccount.account_number}
                onChange={(e) => setSourceAccount(prev => ({ 
                  ...prev, 
                  account_number: e.target.value 
                }))}
                placeholder="012180001182078281"
                maxLength={18}
                className="w-full px-4 py-3 bg-partrunner-black/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la Institución
              </label>
              <input
                type="text"
                value={sourceAccount.institution_name}
                onChange={(e) => setSourceAccount(prev => ({ 
                  ...prev, 
                  institution_name: e.target.value 
                }))}
                placeholder="BBVA Mexico"
                className="w-full px-4 py-3 bg-partrunner-black/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ID de Institución (para API)
              </label>
              <input
                type="text"
                value={sourceAccount.institution_id}
                onChange={(e) => setSourceAccount(prev => ({ 
                  ...prev, 
                  institution_id: e.target.value 
                }))}
                placeholder="BBVA_MEXICO_MX"
                className="w-full px-4 py-3 bg-partrunner-black/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Cuenta
              </label>
              <select
                value={sourceAccount.account_type}
                onChange={(e) => setSourceAccount(prev => ({ 
                  ...prev, 
                  account_type: e.target.value 
                }))}
                className="w-full px-4 py-3 bg-partrunner-black/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50"
              >
                <option value="clabe">CLABE</option>
                <option value="cuenta">Número de Cuenta</option>
                <option value="tarjeta">Tarjeta de Débito</option>
              </select>
            </div>

            {/* Result Message */}
            {result && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                result.success 
                  ? 'bg-partrunner-green/10 border border-partrunner-green/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-partrunner-green" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={result.success ? 'text-partrunner-green' : 'text-red-300'}>
                  {result.message}
                </span>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveSourceAccount}
              disabled={isSaving}
              className="w-full py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-lg shadow-partrunner-yellow/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pronto Pago Configuration */}
        <div className="bg-partrunner-charcoal/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Pronto Pago</h2>
              <p className="text-gray-400 text-sm">Controla el programa de pago anticipado</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Toggle Switch */}
            <div className="p-4 bg-partrunner-black/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium mb-1">Estado del módulo</h3>
                  <p className="text-gray-400 text-sm">
                    {prontoPagoConfig.enabled 
                      ? 'Los usuarios pueden elegir Pronto Pago al subir facturas' 
                      : 'Pronto Pago está desactivado para todos los usuarios'}
                  </p>
                </div>
                <button
                  onClick={handleToggleProntoPago}
                  disabled={isSavingProntoPago}
                  className="flex-shrink-0 ml-4"
                >
                  {isSavingProntoPago ? (
                    <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                  ) : prontoPagoConfig.enabled ? (
                    <ToggleRight className="w-10 h-10 text-partrunner-green cursor-pointer hover:opacity-80 transition-opacity" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-500 cursor-pointer hover:opacity-80 transition-opacity" />
                  )}
                </button>
              </div>
            </div>

            {/* Config Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-partrunner-black/30 rounded-xl">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Tasa de costo</p>
                <p className="text-white font-semibold text-lg">{(prontoPagoConfig.fee_rate * 100).toFixed(0)}%</p>
              </div>
              <div className="p-4 bg-partrunner-black/30 rounded-xl">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Días de proceso</p>
                <p className="text-white font-semibold text-lg">{prontoPagoConfig.processing_days} día{prontoPagoConfig.processing_days > 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Result Message */}
            {prontoPagoResult && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                prontoPagoResult.success 
                  ? 'bg-partrunner-green/10 border border-partrunner-green/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {prontoPagoResult.success ? (
                  <CheckCircle className="w-5 h-5 text-partrunner-green" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={prontoPagoResult.success ? 'text-partrunner-green' : 'text-red-300'}>
                  {prontoPagoResult.message}
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div className={`p-4 rounded-xl text-center ${
              prontoPagoConfig.enabled 
                ? 'bg-partrunner-green/10 border border-partrunner-green/30' 
                : 'bg-gray-700/30 border border-gray-600/30'
            }`}>
              <span className={`font-semibold ${
                prontoPagoConfig.enabled ? 'text-partrunner-green' : 'text-gray-400'
              }`}>
                {prontoPagoConfig.enabled ? '✓ Módulo Activo' : '○ Módulo Desactivado'}
              </span>
            </div>
          </div>
        </div>

        {/* Other Settings Card (placeholder) */}
        <div className="bg-partrunner-charcoal/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-500/20 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Otras Configuraciones</h2>
              <p className="text-gray-400 text-sm">Próximamente disponibles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
            <div className="p-4 bg-partrunner-black/30 rounded-xl">
              <h3 className="text-gray-300 font-medium mb-1">Notificaciones</h3>
              <p className="text-gray-500 text-sm">Email y WhatsApp para drivers</p>
            </div>
            <div className="p-4 bg-partrunner-black/30 rounded-xl">
              <h3 className="text-gray-300 font-medium mb-1">Semanas de Pago</h3>
              <p className="text-gray-500 text-sm">Configurar ventanas de facturación</p>
            </div>
            <div className="p-4 bg-partrunner-black/30 rounded-xl">
              <h3 className="text-gray-300 font-medium mb-1">Integraciones</h3>
              <p className="text-gray-500 text-sm">Conectar servicios externos</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
