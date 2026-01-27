import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Banknote,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw
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

const Settings: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Payment source account state
  const [sourceAccount, setSourceAccount] = useState<PaymentSourceAccount>({
    account_number: '',
    institution_id: '',
    institution_name: '',
    account_type: 'clabe',
  });

  // Load configurations
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      const response = await getSystemConfig('payment_source_account');
      
      if (response.success && response.data) {
        const config = response.data as SystemConfig;
        const value = config.value as unknown as PaymentSourceAccount;
        setSourceAccount(value);
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
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
          <p className="text-slate-400">
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
        <p className="text-slate-400">
          Administra las configuraciones globales de la plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Source Account */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Cuenta Origen de Pagos</h2>
              <p className="text-slate-400 text-sm">Cuenta desde la que se dispersan los pagos</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo de Cuenta
              </label>
              <select
                value={sourceAccount.account_type}
                onChange={(e) => setSourceAccount(prev => ({ 
                  ...prev, 
                  account_type: e.target.value 
                }))}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={result.success ? 'text-emerald-300' : 'text-red-300'}>
                  {result.message}
                </span>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveSourceAccount}
              disabled={isSaving}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* Other Settings Card (placeholder) */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-500/20 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Otras Configuraciones</h2>
              <p className="text-slate-400 text-sm">Próximamente disponibles</p>
            </div>
          </div>

          <div className="space-y-4 opacity-50">
            <div className="p-4 bg-slate-900/30 rounded-xl">
              <h3 className="text-slate-300 font-medium mb-1">Pronto Pago</h3>
              <p className="text-slate-500 text-sm">Configurar tasa y días de procesamiento</p>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-xl">
              <h3 className="text-slate-300 font-medium mb-1">Notificaciones</h3>
              <p className="text-slate-500 text-sm">Email y WhatsApp para drivers</p>
            </div>
            <div className="p-4 bg-slate-900/30 rounded-xl">
              <h3 className="text-slate-300 font-medium mb-1">Semanas de Pago</h3>
              <p className="text-slate-500 text-sm">Configurar ventanas de facturación</p>
            </div>
          </div>

          <button
            disabled
            className="w-full mt-6 py-3 bg-slate-700/50 text-slate-500 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <RefreshCw className="w-5 h-5" />
            Próximamente
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
