import React from 'react';
import { AlertTriangle, Clock, Calendar, X, ChevronRight } from 'lucide-react';
import { LateReason } from '../../utils/dates';

interface LateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reason: LateReason;
  invoiceDate: string;
  validPeriod: string;
  deadline: string;
}

const LateInvoiceModal: React.FC<LateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  reason,
  invoiceDate,
  validPeriod,
  deadline,
}) => {
  if (!isOpen) return null;

  const isAfterDeadline = reason === 'after_deadline';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-800 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-amber-400 mb-1">
                Factura Extemporánea
              </h2>
              <p className="text-amber-300/70 text-sm">
                Esta factura será procesada en el siguiente ciclo de pago
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Reason explanation */}
          <div className="bg-slate-900/50 rounded-xl p-4">
            {isAfterDeadline ? (
              <>
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Fuera de tiempo</span>
                </div>
                <p className="text-slate-300 text-sm">
                  El plazo para subir facturas de esta semana ya venció.
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  El deadline era: <span className="text-amber-400">{deadline}</span>
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">Fecha de factura incorrecta</span>
                </div>
                <p className="text-slate-300 text-sm">
                  La fecha de tu factura no corresponde al período de facturación actual.
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-slate-400 text-xs">
                    Fecha de tu factura:{' '}
                    <span className="text-white">
                      {new Date(invoiceDate).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                  <p className="text-slate-400 text-xs">
                    Período válido:{' '}
                    <span className="text-amber-400">{validPeriod}</span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* What happens next */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              ¿Qué pasará con mi factura?
            </h3>
            <ul className="text-slate-300 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Se guardará en la carpeta de <strong>Extemporáneas</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>Se programará para el <strong>siguiente ciclo de pago</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>El pago se realizará el viernes de la próxima semana</span>
              </li>
            </ul>
          </div>

          {/* Warning */}
          <p className="text-slate-500 text-xs text-center">
            Para evitar esto en el futuro, sube tus facturas antes del{' '}
            <span className="text-slate-400">Jueves a las 10:00 AM</span>
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all"
          >
            Entendido, continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LateInvoiceModal;
