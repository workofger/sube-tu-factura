import React from 'react';
import { Clock, Zap, DollarSign, AlertCircle } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-slate-800">
          Programa de Pago
        </h3>
      </div>

      <p className="text-sm text-slate-600 mb-5">
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
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            ${
              selectedProgram === 'standard'
                ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }
          `}
        >
          {/* Selection Indicator */}
          <div
            className={`
              absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${
                selectedProgram === 'standard'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-slate-300 bg-white'
              }
            `}
          >
            {selectedProgram === 'standard' && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>

          {/* Icon and Title */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`
                p-2 rounded-lg
                ${selectedProgram === 'standard' ? 'bg-blue-100' : 'bg-slate-100'}
              `}
            >
              <Clock
                className={`w-5 h-5 ${
                  selectedProgram === 'standard' ? 'text-blue-600' : 'text-slate-500'
                }`}
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Pago Estándar</h4>
              <p className="text-xs text-slate-500">Semana siguiente</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 mb-4">
            Tu pago se programará para el lunes de la próxima semana.
          </p>

          {/* Amount Display */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Recibirás</p>
            <p className="text-xl font-bold text-slate-800">
              {formatMoney(prontoPagoPreview.standardAmount)}
            </p>
            <p className="text-xs text-emerald-600 font-medium">100% del total</p>
          </div>
        </button>

        {/* Pronto Pago Option */}
        <button
          type="button"
          onClick={() => onProgramChange('pronto_pago')}
          disabled={disabled}
          className={`
            relative p-5 rounded-xl border-2 transition-all duration-200 text-left
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            ${
              selectedProgram === 'pronto_pago'
                ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }
          `}
        >
          {/* Selection Indicator */}
          <div
            className={`
              absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${
                selectedProgram === 'pronto_pago'
                  ? 'border-amber-500 bg-amber-500'
                  : 'border-slate-300 bg-white'
              }
            `}
          >
            {selectedProgram === 'pronto_pago' && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>

          {/* Badge */}
          <div className="absolute -top-2 left-4">
            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-sm">
              RÁPIDO
            </span>
          </div>

          {/* Icon and Title */}
          <div className="flex items-center gap-3 mb-3 mt-1">
            <div
              className={`
                p-2 rounded-lg
                ${selectedProgram === 'pronto_pago' ? 'bg-amber-100' : 'bg-slate-100'}
              `}
            >
              <Zap
                className={`w-5 h-5 ${
                  selectedProgram === 'pronto_pago' ? 'text-amber-600' : 'text-slate-500'
                }`}
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Pronto Pago</h4>
              <p className="text-xs text-slate-500">1 día hábil</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 mb-4">
            Recibe tu pago al siguiente día hábil con un costo financiero.
          </p>

          {/* Amount Display */}
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Recibirás</p>
            <p className="text-xl font-bold text-slate-800">
              {formatMoney(prontoPagoPreview.netAmount)}
            </p>
            <p className="text-xs text-amber-600 font-medium">
              {netPercentage}% del total
            </p>
          </div>

          {/* Fee Warning */}
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Costo financiero: {formatMoney(prontoPagoPreview.feeAmount)} ({feePercentage}%)
            </span>
          </div>
        </button>
      </div>

      {/* Summary when Pronto Pago is selected */}
      {selectedProgram === 'pronto_pago' && totalAmount > 0 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
            <Zap className="w-4 h-4" />
            <span>Resumen de Pronto Pago</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Total Factura</p>
              <p className="font-semibold text-slate-800">
                {formatMoney(prontoPagoPreview.standardAmount)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Costo Financiero</p>
              <p className="font-semibold text-red-600">
                -{formatMoney(prontoPagoPreview.feeAmount)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">A Recibir</p>
              <p className="font-bold text-emerald-600">
                {formatMoney(prontoPagoPreview.netAmount)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProgramSelector;
