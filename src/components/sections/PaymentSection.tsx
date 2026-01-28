import React from 'react';
import { Calculator, FileKey, DollarSign, CheckSquare, AlertCircle, Info, Lock } from 'lucide-react';
import { InputField } from '../common';
import { InvoiceData } from '../../types/invoice';
import { CONFIG } from '../../constants/config';
import { formatRate } from '../../utils/formatters';

interface PaymentSectionProps {
  formData: InvoiceData;
  showRetentionIva: boolean;
  showRetentionIsr: boolean;
  onFieldChange: <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => void;
  readOnly?: boolean;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  formData,
  showRetentionIva,
  showRetentionIsr,
  onFieldChange,
  readOnly = false,
}) => {
  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="section-header">
        <span className="section-icon">
          <Calculator size={18} />
        </span>
        <h3 className="section-title">Desglose y Pago</h3>
        {readOnly && (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Lock size={12} />
            Solo lectura
          </span>
        )}
      </div>

      {/* UUID Display */}
      <div className="card p-4">
        <InputField
          label="Folio Fiscal (UUID)"
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={formData.uuid}
          onChange={(e) => onFieldChange('uuid', e.target.value)}
          icon={<FileKey size={18} />}
          readOnly={readOnly}
        />
        {formData.certificationDate && (
          <p className="text-xs text-partrunner-yellow-dark dark:text-partrunner-yellow mt-2 ml-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-partrunner-yellow rounded-full"></span>
            Timbrado: {formData.certificationDate}
          </p>
        )}
      </div>

      {/* Payment Method Section */}
      <div className={`card p-4 transition-colors ${
        formData.paymentMethod === 'PPD' 
          ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5' 
          : ''
      }`}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            Método de Pago (XML)
            {readOnly && <Lock size={12} className="text-gray-400" />}
          </label>
          <div className="flex gap-4 items-center">
            <label className={`flex items-center gap-2 cursor-pointer ${readOnly ? 'pointer-events-none' : ''}`}>
              <input 
                type="radio" 
                name="paymentMethod"
                checked={formData.paymentMethod === 'PUE'}
                onChange={() => onFieldChange('paymentMethod', 'PUE')}
                disabled={readOnly}
                className="w-4 h-4 text-partrunner-yellow accent-partrunner-yellow"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PUE (Pago Único)</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${readOnly ? 'pointer-events-none' : ''}`}>
              <input 
                type="radio" 
                name="paymentMethod"
                checked={formData.paymentMethod === 'PPD'}
                onChange={() => onFieldChange('paymentMethod', 'PPD')}
                disabled={readOnly}
                className="w-4 h-4 text-red-500 accent-red-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PPD (Parcial/Diferido)</span>
            </label>
          </div>
          
          <div className="mt-2 text-sm font-semibold p-3 rounded-xl bg-white/60 dark:bg-partrunner-black/30">
            {formData.paymentMethod === 'PUE' && (
              <span className="text-partrunner-yellow-dark dark:text-partrunner-yellow flex items-center gap-2">
                <CheckSquare size={16} /> Transferencia electrónica de fondos
              </span>
            )}
            {formData.paymentMethod === 'PPD' && (
              <div className="space-y-2">
                <span className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} /> Por definir
                </span>
                <div className="text-xs text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-500/20 px-3 py-2 rounded-lg">
                  ⚠️ ALERTA: Se requiere envío de complemento de pago.
                </div>
              </div>
            )}
            {!formData.paymentMethod && (
              <span className="text-gray-400 dark:text-gray-500">Selecciona método...</span>
            )}
          </div>

          {/* Payment Form */}
          {formData.paymentForm && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Forma de Pago: <span className="font-medium text-gray-700 dark:text-gray-300">{formData.paymentForm}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial Totals */}
      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Subtotal"
            type="number"
            placeholder="0.00"
            value={formData.subtotal}
            onChange={(e) => onFieldChange('subtotal', e.target.value)}
            readOnly={readOnly}
          />
          <InputField
            label="IVA Trasladado"
            type="number"
            placeholder="0.00"
            value={formData.totalTax}
            onChange={(e) => onFieldChange('totalTax', e.target.value)}
            readOnly={readOnly}
          />
        </div>

        {/* Retentions Section */}
        {(showRetentionIva || showRetentionIsr) && (
          <div className="border-t border-gray-100 dark:border-partrunner-gray-dark pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Retenciones
              </h5>
              <div className="flex items-center gap-1 text-[10px] bg-partrunner-yellow/10 text-partrunner-yellow-dark dark:text-partrunner-yellow px-2 py-1 rounded-full">
                <Info size={10} /> Extraídas del XML
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {showRetentionIva && (
                <InputField
                  label={`Ret. IVA (${formatRate(formData.retentionIvaRate)})`}
                  type="number"
                  placeholder="0.00"
                  value={formData.retentionIva}
                  onChange={(e) => onFieldChange('retentionIva', e.target.value)}
                  readOnly={readOnly}
                />
              )}
              {showRetentionIsr && (
                <InputField
                  label={`Ret. ISR (${formatRate(formData.retentionIsrRate)})`}
                  type="number"
                  placeholder="0.00"
                  value={formData.retentionIsr}
                  onChange={(e) => onFieldChange('retentionIsr', e.target.value)}
                  readOnly={readOnly}
                />
              )}
            </div>
          </div>
        )}

        {/* Total and Currency */}
        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-partrunner-gray-dark">
          <InputField
            label="Monto Total"
            type="number"
            placeholder="0.00"
            value={formData.totalAmount}
            onChange={(e) => onFieldChange('totalAmount', e.target.value)}
            icon={<DollarSign size={18} />}
            className="flex-grow"
            readOnly={readOnly}
          />
          <div className="w-28">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-0.5 block mb-1.5 flex items-center gap-1">
              Moneda
              {readOnly && <Lock size={12} className="text-gray-400" />}
            </label>
            <select 
              className={`w-full rounded-xl py-2.5 px-3 outline-none transition-all duration-200 border-2
                ${readOnly 
                  ? 'bg-gray-100 dark:bg-partrunner-black/50 border-gray-200 dark:border-partrunner-gray-dark text-gray-500 dark:text-gray-500 cursor-default'
                  : 'bg-white dark:bg-partrunner-charcoal border-gray-200 dark:border-partrunner-gray-dark text-gray-900 dark:text-white focus:border-partrunner-yellow'
                }
              `}
              value={formData.currency}
              onChange={(e) => onFieldChange('currency', e.target.value)}
              disabled={readOnly}
            >
              {CONFIG.CURRENCIES.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Exchange Rate (if not MXN) */}
        {formData.currency !== 'MXN' && (
          <InputField
            label="Tipo de Cambio"
            type="text"
            placeholder="1.00"
            value={formData.exchangeRate || ''}
            onChange={(e) => onFieldChange('exchangeRate', e.target.value)}
            className="w-1/2"
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
};
