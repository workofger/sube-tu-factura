import React from 'react';
import { Clock, Zap, DollarSign, AlertCircle, Check } from 'lucide-react';
import { PaymentProgram, PRONTO_PAGO_FEE_RATE } from '../../types/invoice';
import { formatMoney } from '../../utils/formatters';

interface PaymentProgramSelectorProps {
  selectedProgram: PaymentProgram;
  onProgramChange: (program: PaymentProgram) => void;
  totalAmount: number;
  prontoPagoPreview: {
    feeAmount: number;
    netAmount: number;
    standardAmount: number;
  };
  disabled?: boolean;
}

export const PaymentProgramSelector: React.FC<PaymentProgramSelectorProps> = ({
  selectedProgram,
  onProgramChange,
  totalAmount,
  prontoPagoPreview,
  disabled = false,
}) => {
  const feePercentage = Math.round(PRONTO_PAGO_FEE_RATE * 100);
  const netPercentage = 100 - feePercentage;

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="section-header">
        <span className="section-icon">
          <DollarSign size={18} />
        </span>
        <h3 className="section-title">Programa de Pago</h3>
      </div>

      <div className="card p-5">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Selecciona cómo deseas recibir el pago de tu factura
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Standard Payment Option */}
          <button
            type="button"
            onClick={() => onProgramChange('standard')}
            disabled={disabled}
            className={`
              relative p-5 rounded-xl border-2 transition-all duration-200 text-left
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md dark:hover:shadow-black/20'}
              ${
                selectedProgram === 'standard'
                  ? 'border-partrunner-yellow bg-partrunner-yellow/5 dark:bg-partrunner-yellow/10'
                  : 'border-gray-200 dark:border-partrunner-gray-dark bg-white dark:bg-partrunner-black/30 hover:border-gray-300 dark:hover:border-partrunner-yellow/30'
              }
            `}
          >
            {/* Selection Indicator */}
            <div
              className={`
                absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                ${
                  selectedProgram === 'standard'
                    ? 'border-partrunner-yellow bg-partrunner-yellow'
                    : 'border-gray-300 dark:border-partrunner-gray-dark bg-white dark:bg-partrunner-charcoal'
                }
              `}
            >
              {selectedProgram === 'standard' && (
                <Check size={12} className="text-partrunner-black" strokeWidth={3} />
              )}
            </div>

            {/* Icon and Title */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`
                  p-2.5 rounded-xl transition-colors
                  ${selectedProgram === 'standard' ? 'bg-partrunner-yellow/20' : 'bg-gray-100 dark:bg-partrunner-gray-dark'}
                `}
              >
                <Clock
                  className={`w-5 h-5 ${
                    selectedProgram === 'standard' ? 'text-partrunner-yellow' : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Pago Estándar</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Semana siguiente</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Tu pago se programará para el lunes de la próxima semana.
            </p>

            {/* Amount Display */}
            <div className="bg-gray-50 dark:bg-partrunner-black/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recibirás</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatMoney(prontoPagoPreview.standardAmount)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">100% del total</p>
            </div>
          </button>

          {/* Pronto Pago Option */}
          <button
            type="button"
            onClick={() => onProgramChange('pronto_pago')}
            disabled={disabled}
            className={`
              relative p-5 rounded-xl border-2 transition-all duration-200 text-left
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md dark:hover:shadow-black/20'}
              ${
                selectedProgram === 'pronto_pago'
                  ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                  : 'border-gray-200 dark:border-partrunner-gray-dark bg-white dark:bg-partrunner-black/30 hover:border-gray-300 dark:hover:border-amber-500/30'
              }
            `}
          >
            {/* Selection Indicator */}
            <div
              className={`
                absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                ${
                  selectedProgram === 'pronto_pago'
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-gray-300 dark:border-partrunner-gray-dark bg-white dark:bg-partrunner-charcoal'
                }
              `}
            >
              {selectedProgram === 'pronto_pago' && (
                <Check size={12} className="text-white" strokeWidth={3} />
              )}
            </div>

            {/* Badge */}
            <div className="absolute -top-2.5 left-4">
              <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg shadow-amber-500/20">
                ⚡ RÁPIDO
              </span>
            </div>

            {/* Icon and Title */}
            <div className="flex items-center gap-3 mb-3 mt-1">
              <div
                className={`
                  p-2.5 rounded-xl transition-colors
                  ${selectedProgram === 'pronto_pago' ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-gray-100 dark:bg-partrunner-gray-dark'}
                `}
              >
                <Zap
                  className={`w-5 h-5 ${
                    selectedProgram === 'pronto_pago' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Pronto Pago</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">1 día hábil</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Recibe tu pago al siguiente día hábil con un costo financiero.
            </p>

            {/* Amount Display */}
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recibirás</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatMoney(prontoPagoPreview.netAmount)}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                {netPercentage}% del total
              </p>
            </div>

            {/* Fee Warning */}
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Costo financiero: {formatMoney(prontoPagoPreview.feeAmount)} ({feePercentage}%)
              </span>
            </div>
          </button>
        </div>

        {/* Summary when Pronto Pago is selected */}
        {selectedProgram === 'pronto_pago' && totalAmount > 0 && (
          <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-3">
              <Zap className="w-4 h-4" />
              <span>Resumen de Pronto Pago</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Total Factura</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {formatMoney(prontoPagoPreview.standardAmount)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Costo Financiero</p>
                <p className="font-bold text-red-600 dark:text-red-400">
                  -{formatMoney(prontoPagoPreview.feeAmount)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">A Recibir</p>
                <p className="font-bold text-green-600 dark:text-green-400">
                  {formatMoney(prontoPagoPreview.netAmount)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentProgramSelector;
