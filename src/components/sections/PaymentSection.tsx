import React from 'react';
import { Calculator, FileKey, DollarSign, Mail, Phone, CheckSquare, AlertCircle, Info } from 'lucide-react';
import { InputField, SelectField } from '../common';
import { InvoiceData } from '../../types/invoice';
import { CONFIG } from '../../constants/config';
import { formatRate } from '../../utils/formatters';

interface PaymentSectionProps {
  formData: InvoiceData;
  showRetentionIva: boolean;
  showRetentionIsr: boolean;
  onFieldChange: <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  formData,
  showRetentionIva,
  showRetentionIsr,
  onFieldChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <span className="bg-yellow-100 text-yellow-700 p-1.5 rounded-lg">
          <Calculator size={18} />
        </span>
        <h3 className="font-bold text-gray-800 text-lg">3. Desglose y Pago</h3>
      </div>

      {/* UUID Display */}
      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
        <InputField
          label="Folio Fiscal (UUID)"
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          value={formData.uuid}
          onChange={(e) => onFieldChange('uuid', e.target.value)}
          icon={<FileKey size={18} />}
        />
        {formData.certificationDate && (
          <p className="text-xs text-blue-600 mt-2 ml-1">
            Timbrado: {formData.certificationDate}
          </p>
        )}
      </div>

      {/* Payment Method Section with Alert */}
      <div className={`p-4 rounded-xl border-2 transition-colors ${
        formData.paymentMethod === 'PPD' 
          ? 'bg-red-50 border-red-200' 
          : 'bg-blue-50 border-blue-100'
      }`}>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-gray-700 ml-1">Método de Pago (XML)</label>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <input 
                type="radio" 
                name="paymentMethod"
                checked={formData.paymentMethod === 'PUE'}
                onChange={() => onFieldChange('paymentMethod', 'PUE')}
                className="w-4 h-4 text-yellow-600"
              />
              <span className="text-sm font-medium">PUE (Pago Único)</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="radio" 
                name="paymentMethod"
                checked={formData.paymentMethod === 'PPD'}
                onChange={() => onFieldChange('paymentMethod', 'PPD')}
                className="w-4 h-4 text-red-600"
              />
              <span className="text-sm font-medium">PPD (Parcial/Diferido)</span>
            </div>
          </div>
          
          <div className="mt-2 text-sm font-semibold p-2 rounded bg-white/60">
            {formData.paymentMethod === 'PUE' && (
              <span className="text-blue-700 flex items-center gap-2">
                <CheckSquare size={16} /> Transferencia electrónica de fondos
              </span>
            )}
            {formData.paymentMethod === 'PPD' && (
              <div className="space-y-1">
                <span className="text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} /> Por definir
                </span>
                <div className="text-xs text-red-600 font-bold bg-red-100 px-2 py-1 rounded">
                  ⚠️ ALERTA: Se requiere envío de complemento de pago.
                </div>
              </div>
            )}
            {!formData.paymentMethod && <span className="text-gray-400">Selecciona método...</span>}
          </div>

          {/* Payment Form */}
          {formData.paymentForm && (
            <div className="mt-2 text-xs text-gray-600">
              Forma de Pago: <span className="font-medium">{formData.paymentForm}</span>
            </div>
          )}
        </div>
      </div>

      {/* Financial Totals */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Subtotal"
            type="number"
            placeholder="0.00"
            value={formData.subtotal}
            onChange={(e) => onFieldChange('subtotal', e.target.value)}
          />
          <InputField
            label="IVA Trasladado"
            type="number"
            placeholder="0.00"
            value={formData.totalTax}
            onChange={(e) => onFieldChange('totalTax', e.target.value)}
          />
        </div>

        {/* Retentions Section with Dynamic Fields */}
        {(showRetentionIva || showRetentionIsr) && (
          <div className="border-t border-gray-200 pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-gray-500 uppercase">Retenciones (Extraídas)</h5>
              <div className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                <Info size={10} /> Campos dinámicos
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
                  className="bg-yellow-50"
                />
              )}
              {showRetentionIsr && (
                <InputField
                  label={`Ret. ISR (${formatRate(formData.retentionIsrRate)})`}
                  type="number"
                  placeholder="0.00"
                  value={formData.retentionIsr}
                  onChange={(e) => onFieldChange('retentionIsr', e.target.value)}
                  className="bg-yellow-50"
                />
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-gray-200 mt-2">
          <InputField
            label="Monto Total"
            type="number"
            placeholder="0.00"
            value={formData.totalAmount}
            onChange={(e) => onFieldChange('totalAmount', e.target.value)}
            icon={<DollarSign size={18} />}
            className="flex-grow font-bold text-lg"
          />
          <div className="w-1/3">
            <label className="text-sm font-bold text-gray-700 ml-1 block mb-1">Moneda</label>
            <select 
              className="w-full bg-white border-2 border-gray-200 rounded-lg py-2.5 px-3 outline-none focus:border-yellow-400"
              value={formData.currency}
              onChange={(e) => onFieldChange('currency', e.target.value)}
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
          />
        )}
      </div>

      {/* Contact Info */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
        <h4 className="font-bold text-gray-600 text-sm">Información de Contacto</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-grow">
            <InputField
              label="Correo"
              placeholder="usuario"
              value={formData.emailUser}
              onChange={(e) => onFieldChange('emailUser', e.target.value)}
              icon={<Mail size={18} />}
            />
          </div>
          <div className="w-1/3 min-w-[110px]">
            <SelectField
              label="Dominio"
              options={CONFIG.EMAIL_DOMAINS}
              value={formData.emailDomain}
              onChange={(e) => onFieldChange('emailDomain', e.target.value)}
            />
          </div>
        </div>
        <InputField
          label="Teléfono"
          type="tel"
          placeholder="55 1234 5678"
          value={formData.phoneNumber}
          onChange={(e) => onFieldChange('phoneNumber', e.target.value)}
          icon={<Phone size={18} />}
        />
      </div>
    </div>
  );
};
