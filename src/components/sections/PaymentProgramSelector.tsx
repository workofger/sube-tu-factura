import React from 'react';
import { Zap, Clock, DollarSign, Info, ArrowRight } from 'lucide-react';
import { PaymentProgram, PRONTO_PAGO_FEE_RATE, ProntoPagoPreview, CreditNoteData, CreditNoteValidation } from '../../types/invoice';
import { formatNumber } from '../../utils/formatters';
import { CreditNoteUpload } from './CreditNoteUpload';

interface PaymentProgramSelectorProps {
  selectedProgram: PaymentProgram;
  onProgramChange: (program: PaymentProgram) => void;
  totalAmount: number;
  prontoPagoPreview: ProntoPagoPreview | null;
  disabled?: boolean;
  // Credit note props (required for pronto_pago)
  invoiceUuid?: string;
  invoiceIssuerRfc?: string;
  creditNoteXmlFile?: File | null;
  creditNotePdfFile?: File | null;
  onCreditNoteXmlChange?: (file: File | null) => void;
  onCreditNotePdfChange?: (file: File | null) => void;
  onCreditNoteValidationChange?: (validation: CreditNoteValidation | null, data: CreditNoteData | null) => void;
}

export const PaymentProgramSelector: React.FC<PaymentProgramSelectorProps> = ({
  selectedProgram,
  onProgramChange,
  totalAmount,
  prontoPagoPreview,
  disabled = false,
  // Credit note props
  invoiceUuid = '',
  invoiceIssuerRfc = '',
  creditNoteXmlFile = null,
  creditNotePdfFile = null,
  onCreditNoteXmlChange,
  onCreditNotePdfChange,
  onCreditNoteValidationChange,
}) => {
  const feePercentage = (PRONTO_PAGO_FEE_RATE * 100).toFixed(0);
  const expectedFeeAmount = prontoPagoPreview?.feeAmount || 0;

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="section-header">
        <span className="section-icon">
          <DollarSign size={18} />
        </span>
        <h3 className="section-title">Programa de Pago</h3>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-partrunner-yellow/10 rounded-xl border border-partrunner-yellow/20">
        <Info size={18} className="text-partrunner-yellow-accent flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-medium">Elige cómo quieres recibir tu pago:</p>
          <p className="text-gray-500 mt-1">
            Puedes optar por pago estándar (viernes de la siguiente semana) o Pronto Pago (1 día hábil con {feePercentage}% de costo financiero).
          </p>
        </div>
      </div>

      {/* Program Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Standard Payment */}
        <button
          type="button"
          onClick={() => onProgramChange('standard')}
          disabled={disabled}
          className={`
            relative p-5 rounded-2xl border-2 text-left transition-all duration-200
            ${selectedProgram === 'standard'
              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Selected indicator */}
          {selectedProgram === 'standard' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              selectedProgram === 'standard' ? 'bg-blue-500' : 'bg-blue-100'
            }`}>
              <Clock size={24} className={selectedProgram === 'standard' ? 'text-white' : 'text-blue-500'} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Pago Estándar</h4>
              <p className="text-sm text-gray-500">Sin costo adicional</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowRight size={14} className="text-blue-500" />
              <span>Pago el viernes de la siguiente semana</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowRight size={14} className="text-blue-500" />
              <span>Recibes el 100% del monto facturado</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Monto a recibir:</p>
            <p className="text-xl font-bold text-gray-900">
              ${formatNumber(totalAmount)}
            </p>
          </div>
        </button>

        {/* Pronto Pago */}
        <button
          type="button"
          onClick={() => onProgramChange('pronto_pago')}
          disabled={disabled}
          className={`
            relative p-5 rounded-2xl border-2 text-left transition-all duration-200
            ${selectedProgram === 'pronto_pago'
              ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/10'
              : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Selected indicator */}
          {selectedProgram === 'pronto_pago' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
              RÁPIDO
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3 mt-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              selectedProgram === 'pronto_pago' ? 'bg-amber-500' : 'bg-amber-100'
            }`}>
              <Zap size={24} className={selectedProgram === 'pronto_pago' ? 'text-white' : 'text-amber-500'} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Pronto Pago</h4>
              <p className="text-sm text-amber-600">{feePercentage}% costo financiero</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowRight size={14} className="text-amber-500" />
              <span>Pago en 1 día hábil</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowRight size={14} className="text-amber-500" />
              <span>Se descuenta {feePercentage}% del total</span>
            </div>
          </div>

          {prontoPagoPreview && (
            <div className="mt-4 pt-4 border-t border-amber-200 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Total factura:</span>
                <span>${formatNumber(prontoPagoPreview.originalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-red-500">
                <span>Costo financiero ({feePercentage}%):</span>
                <span>-${formatNumber(prontoPagoPreview.feeAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-amber-200">
                <span className="text-xs text-gray-500">Monto a recibir:</span>
                <span className="text-xl font-bold text-amber-600">
                  ${formatNumber(prontoPagoPreview.netAmount)}
                </span>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Credit Note Upload - Only shown when Pronto Pago is selected */}
      {selectedProgram === 'pronto_pago' && onCreditNoteXmlChange && onCreditNotePdfChange && onCreditNoteValidationChange && (
        <CreditNoteUpload
          xmlFile={creditNoteXmlFile}
          pdfFile={creditNotePdfFile}
          onXmlChange={onCreditNoteXmlChange}
          onPdfChange={onCreditNotePdfChange}
          invoiceUuid={invoiceUuid}
          invoiceIssuerRfc={invoiceIssuerRfc}
          expectedFeeAmount={expectedFeeAmount}
          onValidationChange={onCreditNoteValidationChange}
        />
      )}
    </div>
  );
};
