import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Upload,
  Check,
  AlertTriangle,
  Trash2,
  RefreshCw,
  FileKey,
  Lock,
  Calendar,
  Info,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getCSDStatus, uploadCSD, deleteCSD, CSDStatus } from '../../services/invoicingService';

interface CSDUploadSectionProps {
  onStatusChange?: (status: CSDStatus) => void;
}

export const CSDUploadSection: React.FC<CSDUploadSectionProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<CSDStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch CSD status on mount
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCSDStatus();
      setStatus(data);
      onStatusChange?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener estado del CSD');
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle file upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cerFile || !keyFile || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await uploadCSD(cerFile, keyFile, password);
      setStatus(data);
      onStatusChange?.(data);
      setSuccess('CSD cargado exitosamente. Ya puedes emitir facturas.');
      
      // Clear form
      setCerFile(null);
      setKeyFile(null);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el CSD');
    } finally {
      setUploading(false);
    }
  };

  // Handle CSD deletion
  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar tu CSD? Ya no podrás emitir facturas.')) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteCSD();
      setStatus({
        status: 'none',
        invoicingEnabled: false,
        certificate: null,
        fiscalInfo: status?.fiscalInfo || { rfc: '', name: '', regime: '', zipCode: '' },
      });
      onStatusChange?.({
        status: 'none',
        invoicingEnabled: false,
        certificate: null,
        fiscalInfo: status?.fiscalInfo || { rfc: '', name: '', regime: '', zipCode: '' },
      });
      setSuccess('CSD eliminado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el CSD');
    } finally {
      setDeleting(false);
    }
  };

  // Handle file input change
  const handleFileChange = (type: 'cer' | 'key') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'cer') {
        setCerFile(file);
      } else {
        setKeyFile(file);
      }
    }
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (!status) return null;

    const badges = {
      none: {
        icon: <AlertTriangle size={16} />,
        text: 'Sin CSD',
        className: 'bg-gray-100 text-gray-600',
      },
      active: {
        icon: <Check size={16} />,
        text: 'CSD Activo',
        className: 'bg-partrunner-green/10 text-partrunner-green',
      },
      expired: {
        icon: <AlertTriangle size={16} />,
        text: 'CSD Vencido',
        className: 'bg-red-100 text-red-600',
      },
      error: {
        icon: <AlertTriangle size={16} />,
        text: 'Error',
        className: 'bg-red-100 text-red-600',
      },
    };

    const badge = badges[status.status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-partrunner-yellow-accent" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-partrunner-black to-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-partrunner-yellow/20 rounded-lg">
            <Shield className="text-partrunner-yellow" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Sello Digital (CSD)</h2>
            <p className="text-sm text-gray-300">Configura tu certificado para emitir facturas</p>
          </div>
        </div>
        {renderStatusBadge()}
      </div>

      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 p-4 bg-partrunner-green/10 rounded-xl border border-partrunner-green/30">
            <Check className="text-partrunner-green flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-partrunner-green">{success}</p>
          </div>
        )}

        {/* Active CSD Info */}
        {status?.status === 'active' && status.certificate && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <FileKey size={16} />
                  <span className="text-sm font-medium">No. Serie</span>
                </div>
                <p className="font-mono text-sm text-partrunner-black">{status.certificate.serialNumber}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Calendar size={16} />
                  <span className="text-sm font-medium">Vigencia</span>
                </div>
                <p className="text-sm text-partrunner-black">
                  {new Date(status.certificate.validUntil).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {status.certificate.daysUntilExpiry !== null && (
                  <p className={`text-xs mt-1 ${
                    status.certificate.daysUntilExpiry <= 30 ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    {status.certificate.daysUntilExpiry} días restantes
                  </p>
                )}
              </div>
            </div>

            {/* Warning if expiring soon */}
            {status.certificate.daysUntilExpiry !== null && status.certificate.daysUntilExpiry <= 30 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-medium text-amber-700">Tu CSD está por vencer</p>
                  <p className="text-sm text-amber-600">
                    Renueva tu certificado antes del vencimiento para continuar emitiendo facturas.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchStatus}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw size={16} />
                Actualizar Estado
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Eliminar CSD
              </button>
            </div>
          </div>
        )}

        {/* Expired CSD Info */}
        {status?.status === 'expired' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-700">Tu CSD ha expirado</p>
                <p className="text-sm text-red-600">
                  No puedes emitir facturas. Carga un nuevo certificado vigente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Form (show when no CSD or expired) */}
        {(status?.status === 'none' || status?.status === 'expired') && (
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-700">
                <p className="font-medium">¿Cómo obtener tu CSD?</p>
                <p>
                  El Certificado de Sello Digital (CSD) se obtiene en el portal del SAT.
                  Necesitas tu e.firma vigente para solicitarlo.
                </p>
              </div>
            </div>

            {/* File inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo .cer (Certificado)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".cer"
                    onChange={handleFileChange('cer')}
                    className="hidden"
                    id="cer-upload"
                  />
                  <label
                    htmlFor="cer-upload"
                    className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      cerFile
                        ? 'border-partrunner-green bg-partrunner-green/5 text-partrunner-green'
                        : 'border-gray-300 hover:border-partrunner-yellow text-gray-500 hover:text-partrunner-yellow-accent'
                    }`}
                  >
                    {cerFile ? (
                      <>
                        <Check size={20} />
                        <span className="truncate max-w-[200px]">{cerFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        <span>Seleccionar .cer</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo .key (Llave privada)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".key"
                    onChange={handleFileChange('key')}
                    className="hidden"
                    id="key-upload"
                  />
                  <label
                    htmlFor="key-upload"
                    className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      keyFile
                        ? 'border-partrunner-green bg-partrunner-green/5 text-partrunner-green'
                        : 'border-gray-300 hover:border-partrunner-yellow text-gray-500 hover:text-partrunner-yellow-accent'
                    }`}
                  >
                    {keyFile ? (
                      <>
                        <Check size={20} />
                        <span className="truncate max-w-[200px]">{keyFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        <span>Seleccionar .key</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña del archivo .key
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-partrunner-yellow focus:border-partrunner-yellow"
                  placeholder="Ingresa la contraseña de tu CSD"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Esta contraseña solo se usa para procesar tu certificado y no se almacena.
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={uploading || !cerFile || !keyFile || !password}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-partrunner-yellow text-partrunner-black font-semibold rounded-xl hover:bg-partrunner-yellow-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Shield size={20} />
                  Cargar CSD y Habilitar Facturación
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CSDUploadSection;
