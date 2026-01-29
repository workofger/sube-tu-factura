import React from 'react';
import { AlertTriangle, Clock, Calendar, X, ChevronRight, FolderClock, CalendarCheck } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border border-amber-200 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-amber-800 mb-1">
                Factura Extemporánea
              </h2>
              <p className="text-amber-700/70 text-sm">
                Esta factura será procesada en el siguiente ciclo de pago
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-amber-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Reason explanation */}
          <div className="bg-gray-50 rounded-xl p-4">
            {reason === 'after_deadline' ? (
              <>
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Fuera de tiempo</span>
                </div>
                <p className="text-gray-700 text-sm">
                  El plazo para subir facturas de esta semana ya venció.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  El deadline era: <span className="text-amber-600 font-medium">{deadline}</span>
                </p>
              </>
            ) : reason === 'wrong_invoice_date' ? (
              <>
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">Fecha de factura incorrecta</span>
                </div>
                <p className="text-gray-700 text-sm">
                  La fecha de tu factura debe ser entre <strong>Martes y Jueves</strong> de esta semana.
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-gray-500 text-xs">
                    Fecha de tu factura:{' '}
                    <span className="text-gray-700 font-medium">
                      {new Date(invoiceDate).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                  <p className="text-gray-500 text-xs">
                    Período válido:{' '}
                    <span className="text-amber-600 font-medium">{validPeriod}</span>
                  </p>
                </div>
              </>
            ) : reason === 'wrong_week_in_description' ? (
              <>
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">Semana incorrecta en la descripción</span>
                </div>
                <p className="text-gray-700 text-sm">
                  La semana indicada en la descripción de la factura no corresponde a la semana que debes facturar.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Verifica que tu factura indique la semana correcta en el concepto.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Factura extemporánea</span>
                </div>
                <p className="text-gray-700 text-sm">
                  Esta factura no cumple con los requisitos del período de facturación actual.
                </p>
              </>
            )}
          </div>

          {/* What happens next */}
          <div className="bg-partrunner-yellow/10 border border-partrunner-yellow/30 rounded-xl p-4">
            <h3 className="text-partrunner-black font-semibold mb-3 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-partrunner-yellow-accent" />
              ¿Qué pasará con mi factura?
            </h3>
            <ul className="text-gray-700 text-sm space-y-2.5">
              <li className="flex items-start gap-3">
                <FolderClock size={16} className="text-partrunner-yellow-accent mt-0.5 flex-shrink-0" />
                <span>Se guardará en la carpeta de <strong>Extemporáneas</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <CalendarCheck size={16} className="text-partrunner-yellow-accent mt-0.5 flex-shrink-0" />
                <span>Se programará para el <strong>siguiente ciclo de pago</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={16} className="text-partrunner-yellow-accent mt-0.5 flex-shrink-0" />
                <span>El pago se realizará el viernes de la próxima semana</span>
              </li>
            </ul>
          </div>

          {/* Warning */}
          <p className="text-gray-400 text-xs text-center">
            Para evitar esto en el futuro, sube tus facturas antes del{' '}
            <span className="text-gray-600 font-medium">Jueves a las 10:00 AM</span>
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-bold rounded-xl shadow-lg shadow-partrunner-yellow/25 hover:shadow-partrunner-yellow/40 transition-all"
          >
            Entendido, continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LateInvoiceModal;
