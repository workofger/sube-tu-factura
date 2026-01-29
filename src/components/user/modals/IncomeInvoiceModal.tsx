import React, { useState } from 'react';
import {
  X,
  Receipt,
  User,
  Package,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  createIncomeInvoice,
  CreateInvoicePayload,
  CustomerData,
  InvoiceItemData,
  PAYMENT_FORMS,
  CFDI_USES,
  FISCAL_REGIMES,
} from '../../../services/invoicingService';

interface IncomeInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const IncomeInvoiceModal: React.FC<IncomeInvoiceModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Customer, 2: Items, 3: Review

  // Form state
  const [customer, setCustomer] = useState<CustomerData>({
    legalName: '',
    rfc: '',
    fiscalRegime: '612',
    zipCode: '',
    email: '',
  });

  const [items, setItems] = useState<InvoiceItemData[]>([
    {
      description: '',
      productKey: '78102200',
      unitKey: 'E48',
      unitName: 'Servicio',
      quantity: 1,
      price: 0,
      taxIncluded: true,
      taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
    },
  ]);

  const [paymentForm, setPaymentForm] = useState('03');
  const [paymentMethod, setPaymentMethod] = useState<'PUE' | 'PPD'>('PUE');
  const [cfdiUse, setCfdiUse] = useState('G03');

  // Handlers
  const handleCustomerChange = (field: keyof CustomerData, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemData, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        description: '',
        productKey: '78102200',
        unitKey: 'E48',
        unitName: 'Servicio',
        quantity: 1,
        price: 0,
        taxIncluded: true,
        taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const subtotal = item.quantity * item.price;
      return sum + subtotal;
    }, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: CreateInvoicePayload = {
        customer,
        items,
        paymentForm,
        paymentMethod,
        cfdiUse,
      };

      await createIncomeInvoice(payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la factura');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = customer.legalName && customer.rfc && customer.zipCode;
  const canProceedStep2 = items.every(item => item.description && item.price > 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Receipt className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Nueva Factura de Ingreso</h2>
              <p className="text-sm text-blue-100">Paso {step} de 3</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex bg-gray-100">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 ${s <= step ? 'bg-blue-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Customer */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User size={20} className="text-blue-500" />
                <h3 className="font-semibold text-partrunner-black">Datos del Receptor</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={customer.legalName}
                    onChange={(e) => handleCustomerChange('legalName', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="EMPRESA SA DE CV"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RFC *
                  </label>
                  <input
                    type="text"
                    value={customer.rfc}
                    onChange={(e) => handleCustomerChange('rfc', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="XAXX010101000"
                    maxLength={13}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    value={customer.zipCode}
                    onChange={(e) => handleCustomerChange('zipCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="06600"
                    maxLength={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Régimen Fiscal *
                  </label>
                  <select
                    value={customer.fiscalRegime}
                    onChange={(e) => handleCustomerChange('fiscalRegime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {FISCAL_REGIMES.map(regime => (
                      <option key={regime.code} value={regime.code}>
                        {regime.code} - {regime.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => handleCustomerChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="correo@empresa.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Items */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-blue-500" />
                  <h3 className="font-semibold text-partrunner-black">Conceptos</h3>
                </div>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Plus size={16} /> Agregar
                </button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Concepto {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Servicio de transporte de mercancías"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Precio Unitario *</label>
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Subtotal</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700">
                        ${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total (IVA incluido)</p>
                  <p className="text-2xl font-bold text-partrunner-black">
                    ${calculateTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Payment options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                  <select
                    value={paymentForm}
                    onChange={(e) => setPaymentForm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PAYMENT_FORMS.map(form => (
                      <option key={form.code} value={form.code}>
                        {form.code} - {form.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'PUE' | 'PPD')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PUE">PUE - Pago en una exhibición</option>
                    <option value="PPD">PPD - Pago en parcialidades</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uso CFDI</label>
                  <select
                    value={cfdiUse}
                    onChange={(e) => setCfdiUse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CFDI_USES.map(use => (
                      <option key={use.code} value={use.code}>
                        {use.code} - {use.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Check size={20} className="text-blue-500" />
                <h3 className="font-semibold text-partrunner-black">Confirmar Factura</h3>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <h4 className="font-medium text-gray-700">Receptor</h4>
                <p className="text-partrunner-black">{customer.legalName}</p>
                <p className="text-sm text-gray-600">RFC: {customer.rfc} | CP: {customer.zipCode}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <h4 className="font-medium text-gray-700">Conceptos ({items.length})</h4>
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.description}</span>
                    <span className="font-medium">
                      ${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-300 flex justify-between">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">
                    ${calculateTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700">
                  Al continuar, la factura será timbrada y enviada al SAT. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Anterior
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Timbrando...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Timbrar Factura
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomeInvoiceModal;
