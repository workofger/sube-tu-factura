import React, { useState } from 'react';
import {
  X,
  DollarSign,
  User,
  Link2,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
  Calendar,
} from 'lucide-react';
import {
  createPaymentComplement,
  CreatePaymentComplementPayload,
  CustomerData,
  PaymentDetail,
  PAYMENT_FORMS,
  FISCAL_REGIMES,
} from '../../../services/invoicingService';

interface PaymentComplementModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentComplementModal: React.FC<PaymentComplementModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customer, setCustomer] = useState<CustomerData>({
    legalName: '',
    rfc: '',
    fiscalRegime: '612',
    zipCode: '',
    email: '',
  });

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentForm, setPaymentForm] = useState('03');
  const [operationNumber, setOperationNumber] = useState('');

  const [relatedDocuments, setRelatedDocuments] = useState<PaymentDetail[]>([
    {
      uuid: '',
      currency: 'MXN',
      installment: 1,
      previousBalance: 0,
      amountPaid: 0,
    },
  ]);

  // Handlers
  const handleCustomerChange = (field: keyof CustomerData, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const handleDocChange = (index: number, field: keyof PaymentDetail, value: any) => {
    setRelatedDocuments(prev => {
      const newDocs = [...prev];
      newDocs[index] = { ...newDocs[index], [field]: value };
      return newDocs;
    });
  };

  const addDocument = () => {
    setRelatedDocuments(prev => [
      ...prev,
      {
        uuid: '',
        currency: 'MXN',
        installment: 1,
        previousBalance: 0,
        amountPaid: 0,
      },
    ]);
  };

  const removeDocument = (index: number) => {
    if (relatedDocuments.length > 1) {
      setRelatedDocuments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotalPaid = () => {
    return relatedDocuments.reduce((sum, doc) => sum + doc.amountPaid, 0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // Validate documents
    const validDocs = relatedDocuments.filter(doc => doc.uuid.trim().length === 36 && doc.amountPaid > 0);
    if (validDocs.length === 0) {
      setError('Ingresa al menos un documento relacionado válido con monto pagado');
      setLoading(false);
      return;
    }

    try {
      const payload: CreatePaymentComplementPayload = {
        customer,
        payments: [{
          paymentForm,
          currency: 'MXN',
          date: new Date(paymentDate).toISOString(),
          amount: calculateTotalPaid(),
          operationNumber: operationNumber || undefined,
          relatedDocuments: validDocs,
        }],
      };

      await createPaymentComplement(payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el complemento de pago');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = customer.legalName && customer.rfc && customer.zipCode &&
    relatedDocuments.some(doc => doc.uuid.trim().length === 36 && doc.amountPaid > 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Complemento de Pago</h2>
              <p className="text-sm text-green-100">CFDI tipo Pago</p>
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

          {/* Customer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User size={18} className="text-green-500" />
              <h3 className="font-medium text-partrunner-black">Datos del Receptor</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Razón Social *</label>
                <input
                  type="text"
                  value={customer.legalName}
                  onChange={(e) => handleCustomerChange('legalName', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RFC *</label>
                <input
                  type="text"
                  value={customer.rfc}
                  onChange={(e) => handleCustomerChange('rfc', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  maxLength={13}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Código Postal *</label>
                <input
                  type="text"
                  value={customer.zipCode}
                  onChange={(e) => handleCustomerChange('zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Régimen Fiscal</label>
                <select
                  value={customer.fiscalRegime}
                  onChange={(e) => handleCustomerChange('fiscalRegime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {FISCAL_REGIMES.map(regime => (
                    <option key={regime.code} value={regime.code}>
                      {regime.code} - {regime.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-partrunner-black">Datos del Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Pago *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pago *</label>
                <select
                  value={paymentForm}
                  onChange={(e) => setPaymentForm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {PAYMENT_FORMS.filter(f => f.code !== '99').map(form => (
                    <option key={form.code} value={form.code}>
                      {form.code} - {form.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">No. Operación</label>
                <input
                  type="text"
                  value={operationNumber}
                  onChange={(e) => setOperationNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Referencia"
                />
              </div>
            </div>
          </div>

          {/* Related Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={18} className="text-green-500" />
                <h3 className="font-medium text-partrunner-black">Documentos Relacionados</h3>
              </div>
              <button
                onClick={addDocument}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
              >
                <Plus size={16} /> Agregar
              </button>
            </div>

            {relatedDocuments.map((doc, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-500">Documento {index + 1}</span>
                  {relatedDocuments.length > 1 && (
                    <button onClick={() => removeDocument(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">UUID de la Factura *</label>
                  <input
                    type="text"
                    value={doc.uuid}
                    onChange={(e) => handleDocChange(index, 'uuid', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                    placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                    maxLength={36}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">No. Parcialidad</label>
                    <input
                      type="number"
                      value={doc.installment}
                      onChange={(e) => handleDocChange(index, 'installment', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Saldo Anterior</label>
                    <input
                      type="number"
                      value={doc.previousBalance || ''}
                      onChange={(e) => handleDocChange(index, 'previousBalance', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monto Pagado *</label>
                    <input
                      type="number"
                      value={doc.amountPaid || ''}
                      onChange={(e) => handleDocChange(index, 'amountPaid', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Saldo Insoluto</label>
                    <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm">
                      ${(doc.previousBalance - doc.amountPaid).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-3 border-t border-gray-200">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total del Pago</p>
                <p className="text-xl font-bold text-partrunner-black">
                  ${calculateTotalPaid().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Timbrando...
              </>
            ) : (
              <>
                <Check size={16} />
                Timbrar Complemento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentComplementModal;
