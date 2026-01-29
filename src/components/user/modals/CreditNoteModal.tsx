import React, { useState } from 'react';
import {
  X,
  CreditCard,
  User,
  Link2,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  createCreditNote,
  CreateCreditNotePayload,
  CustomerData,
  InvoiceItemData,
} from '../../../services/invoicingService';

interface CreditNoteModalProps {
  onClose: () => void;
  onSuccess: () => void;
  prefillData?: {
    customer?: Partial<CustomerData>;
    relatedUuid?: string;
  };
}

export const CreditNoteModal: React.FC<CreditNoteModalProps> = ({ onClose, onSuccess, prefillData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customer, setCustomer] = useState<CustomerData>({
    legalName: prefillData?.customer?.legalName || '',
    rfc: prefillData?.customer?.rfc || '',
    fiscalRegime: prefillData?.customer?.fiscalRegime || '612',
    zipCode: prefillData?.customer?.zipCode || '',
    email: prefillData?.customer?.email || '',
  });

  const [relatedUuids, setRelatedUuids] = useState<string[]>(
    prefillData?.relatedUuid ? [prefillData.relatedUuid] : ['']
  );

  const [items, setItems] = useState<InvoiceItemData[]>([
    {
      description: '',
      productKey: '84111506',
      unitKey: 'ACT',
      quantity: 1,
      price: 0,
      taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
    },
  ]);

  const [paymentForm] = useState('03');
  const [cfdiUse] = useState('G02');

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
        productKey: '84111506',
        unitKey: 'ACT',
        quantity: 1,
        price: 0,
        taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleUuidChange = (index: number, value: string) => {
    setRelatedUuids(prev => {
      const newUuids = [...prev];
      newUuids[index] = value.toUpperCase();
      return newUuids;
    });
  };

  const addUuid = () => {
    setRelatedUuids(prev => [...prev, '']);
  };

  const removeUuid = (index: number) => {
    if (relatedUuids.length > 1) {
      setRelatedUuids(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // Validate UUIDs
    const validUuids = relatedUuids.filter(uuid => uuid.trim().length === 36);
    if (validUuids.length === 0) {
      setError('Ingresa al menos un UUID de factura relacionada válido');
      setLoading(false);
      return;
    }

    try {
      const payload: CreateCreditNotePayload = {
        customer,
        items,
        paymentForm,
        cfdiUse,
        relatedUuids: validUuids,
      };

      await createCreditNote(payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la nota de crédito');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = customer.legalName && customer.rfc && customer.zipCode &&
    items.every(item => item.description && item.price > 0) &&
    relatedUuids.some(uuid => uuid.trim().length === 36);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CreditCard className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Nueva Nota de Crédito</h2>
              <p className="text-sm text-amber-100">CFDI tipo Egreso</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Related UUIDs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={18} className="text-amber-500" />
                <h3 className="font-medium text-partrunner-black">Facturas Relacionadas</h3>
              </div>
              <button
                onClick={addUuid}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"
              >
                <Plus size={16} /> Agregar
              </button>
            </div>
            
            {relatedUuids.map((uuid, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={uuid}
                  onChange={(e) => handleUuidChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  maxLength={36}
                />
                {relatedUuids.length > 1 && (
                  <button
                    onClick={() => removeUuid(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Customer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User size={18} className="text-amber-500" />
              <h3 className="font-medium text-partrunner-black">Datos del Receptor</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Razón Social *</label>
                <input
                  type="text"
                  value={customer.legalName}
                  onChange={(e) => handleCustomerChange('legalName', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RFC *</label>
                <input
                  type="text"
                  value={customer.rfc}
                  onChange={(e) => handleCustomerChange('rfc', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  maxLength={13}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Código Postal *</label>
                <input
                  type="text"
                  value={customer.zipCode}
                  onChange={(e) => handleCustomerChange('zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-partrunner-black">Conceptos</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"
              >
                <Plus size={16} /> Agregar
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-gray-500">Concepto {index + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Descripción del descuento o devolución"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    min={1}
                  />
                  <input
                    type="number"
                    value={item.price || ''}
                    onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Monto"
                    step="0.01"
                  />
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm">
                    ${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-3 border-t border-gray-200">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Nota de Crédito</p>
                <p className="text-xl font-bold text-partrunner-black">
                  ${calculateTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Timbrando...
              </>
            ) : (
              <>
                <Check size={16} />
                Timbrar Nota de Crédito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditNoteModal;
