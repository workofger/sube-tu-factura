import React, { useState } from 'react';
import {
  X,
  Ban,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  cancelInvoice,
  CancellationPayload,
  InvoiceListItem,
  CANCELLATION_REASONS,
} from '../../../services/invoicingService';

interface CancellationModalProps {
  invoice: InvoiceListItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({ invoice, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motive, setMotive] = useState<'01' | '02' | '03' | '04'>('02');
  const [substitutionUuid, setSubstitutionUuid] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // Validate substitution UUID if motive 01
    if (motive === '01' && substitutionUuid.trim().length !== 36) {
      setError('El UUID de sustitución es requerido para el motivo 01');
      setLoading(false);
      return;
    }

    try {
      const payload: CancellationPayload = {
        motive,
        substitutionUuid: motive === '01' ? substitutionUuid : undefined,
      };

      await cancelInvoice(invoice.id, payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la factura');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = confirmed && (motive !== '01' || substitutionUuid.trim().length === 36);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Ban className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Cancelar Factura</h2>
              <p className="text-sm text-red-100">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Invoice Info */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Factura a cancelar:</p>
            <p className="font-mono text-sm font-medium mt-1">{invoice.uuid}</p>
            <p className="text-sm text-gray-600 mt-2">
              {invoice.receiverName} - ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Motive Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Motivo de Cancelación *
            </label>
            <select
              value={motive}
              onChange={(e) => setMotive(e.target.value as '01' | '02' | '03' | '04')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {CANCELLATION_REASONS.map(reason => (
                <option key={reason.code} value={reason.code}>
                  {reason.code} - {reason.name}
                </option>
              ))}
            </select>
          </div>

          {/* Substitution UUID (for motive 01) */}
          {motive === '01' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                UUID de la Factura de Sustitución *
              </label>
              <input
                type="text"
                value={substitutionUuid}
                onChange={(e) => setSubstitutionUuid(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                maxLength={36}
              />
              <p className="text-xs text-gray-500">
                Ingresa el UUID de la factura que sustituye a esta.
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Importante</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>La cancelación se enviará al SAT inmediatamente</li>
                  <li>Si la factura tiene más de 24 horas, el receptor deberá aceptar la cancelación</li>
                  <li>Las facturas canceladas no se pueden reactivar</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              Entiendo que esta acción es irreversible y confirmo que deseo cancelar esta factura
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <Ban size={16} />
                Cancelar Factura
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancellationModal;
