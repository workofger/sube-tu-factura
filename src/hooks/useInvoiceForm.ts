import { useState, useCallback, useMemo } from 'react';
import { InvoiceData, InvoiceItem, ProjectType, PaymentProgram, PRONTO_PAGO_FEE_RATE, LateInvoiceReason, CreditNoteData, CreditNoteValidation } from '../types/invoice';

const initialFormData: InvoiceData = {
  week: '',
  year: new Date().getFullYear(),
  expectedWeek: 0,
  weekFromDescription: undefined,
  project: ProjectType.MERCADO_LIBRE,
  needsProjectReview: false,
  // Late invoice fields
  isLate: false,
  lateReasons: [],
  lateAcknowledged: false,
  issuerRfc: '',
  issuerName: '',
  issuerRegime: '',
  issuerZipCode: '',
  receiverRfc: '',
  receiverName: '',
  receiverRegime: '',
  receiverZipCode: '',
  cfdiUse: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  folio: '',
  series: '',
  uuid: '',
  certificationDate: '',
  satCertNumber: '',
  paymentMethod: '',
  paymentForm: '',
  paymentConditions: '',
  subtotal: '',
  totalTax: '',
  retentionIva: '',
  retentionIvaRate: 0,
  retentionIsr: '',
  retentionIsrRate: 0,
  totalAmount: '',
  currency: 'MXN',
  exchangeRate: '',
  // Pronto Pago fields
  paymentProgram: 'standard',
  prontoPagoFeeRate: 0,
  prontoPagoFeeAmount: 0,
  netPaymentAmount: 0,
  // Other fields
  items: [],
  emailUser: '',
  emailDomain: '@gmail.com',
  phoneNumber: '',
  xmlFile: null,
  pdfFile: null,
  // Credit note fields (for Pronto Pago)
  creditNoteXmlFile: null,
  creditNotePdfFile: null,
  creditNoteData: null,
  creditNoteValidation: null,
};

export const useInvoiceForm = () => {
  const [formData, setFormData] = useState<InvoiceData>(initialFormData);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const updateField = useCallback(<K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  }, []);

  const deleteItem = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }, []);

  const addItem = useCallback((item: InvoiceItem) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setIsConfirmed(false);
  }, []);

  const setWeek = useCallback((week: string, year?: number, expectedWeek?: number) => {
    setFormData(prev => ({ 
      ...prev, 
      week,
      year: year ?? prev.year,
      expectedWeek: expectedWeek ?? prev.expectedWeek,
    }));
  }, []);

  // Set week extracted from description
  const setWeekFromDescription = useCallback((weekFromDescription?: number) => {
    setFormData(prev => ({
      ...prev,
      weekFromDescription,
    }));
  }, []);

  // Set late invoice info (with multiple reasons)
  const setLateInvoiceInfo = useCallback((isLate: boolean, reasons: LateInvoiceReason[] = []) => {
    setFormData(prev => ({
      ...prev,
      isLate,
      lateReasons: reasons,
      lateAcknowledged: false, // Reset acknowledgment when late status changes
    }));
  }, []);

  // Acknowledge late invoice
  const acknowledgeLateInvoice = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      lateAcknowledged: true,
    }));
  }, []);

  const toggleConfirmation = useCallback(() => {
    setIsConfirmed(prev => !prev);
  }, []);

  // Set payment program and recalculate amounts
  const setPaymentProgram = useCallback((program: PaymentProgram) => {
    setFormData(prev => {
      const total = parseFloat(prev.totalAmount) || 0;
      const feeRate = program === 'pronto_pago' ? PRONTO_PAGO_FEE_RATE : 0;
      const feeAmount = total * feeRate;
      const netAmount = total - feeAmount;
      
      return {
        ...prev,
        paymentProgram: program,
        prontoPagoFeeRate: feeRate,
        prontoPagoFeeAmount: Math.round(feeAmount * 100) / 100,
        netPaymentAmount: Math.round(netAmount * 100) / 100,
      };
    });
  }, []);

  // Recalculate pronto pago amounts when total changes
  const recalculateProntoPago = useCallback(() => {
    setFormData(prev => {
      const total = parseFloat(prev.totalAmount) || 0;
      const feeRate = prev.paymentProgram === 'pronto_pago' ? PRONTO_PAGO_FEE_RATE : 0;
      const feeAmount = total * feeRate;
      const netAmount = total - feeAmount;
      
      return {
        ...prev,
        prontoPagoFeeRate: feeRate,
        prontoPagoFeeAmount: Math.round(feeAmount * 100) / 100,
        netPaymentAmount: Math.round(netAmount * 100) / 100,
      };
    });
  }, []);

  // Calculate items total
  const itemsTotal = formData.items.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Calculate pronto pago preview amounts (for UI display)
  const prontoPagoPreview = useMemo(() => {
    const total = parseFloat(formData.totalAmount) || 0;
    const feeAmount = total * PRONTO_PAGO_FEE_RATE;
    const netAmount = total - feeAmount;
    return {
      originalAmount: total,
      feeAmount: Math.round(feeAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
    };
  }, [formData.totalAmount]);

  // Check if retentions should be shown
  const showRetentionIva = Boolean(
    (formData.retentionIva && parseFloat(formData.retentionIva) > 0) || 
    (formData.retentionIvaRate && formData.retentionIvaRate > 0)
  );
  const showRetentionIsr = Boolean(
    (formData.retentionIsr && parseFloat(formData.retentionIsr) > 0) || 
    (formData.retentionIsrRate && formData.retentionIsrRate > 0)
  );

  // Credit note handlers
  const setCreditNoteXmlFile = useCallback((file: File | null) => {
    setFormData(prev => ({
      ...prev,
      creditNoteXmlFile: file,
      // Reset validation when file changes
      creditNoteValidation: file ? prev.creditNoteValidation : null,
      creditNoteData: file ? prev.creditNoteData : null,
    }));
  }, []);

  const setCreditNotePdfFile = useCallback((file: File | null) => {
    setFormData(prev => ({
      ...prev,
      creditNotePdfFile: file,
    }));
  }, []);

  const setCreditNoteValidation = useCallback((
    validation: CreditNoteValidation | null, 
    data: CreditNoteData | null
  ) => {
    setFormData(prev => ({
      ...prev,
      creditNoteValidation: validation,
      creditNoteData: data,
    }));
  }, []);

  // Clear credit note when switching away from pronto_pago
  const clearCreditNote = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      creditNoteXmlFile: null,
      creditNotePdfFile: null,
      creditNoteData: null,
      creditNoteValidation: null,
    }));
  }, []);

  // Check if credit note is required and valid
  const creditNoteRequired = formData.paymentProgram === 'pronto_pago';
  const creditNoteValid = formData.creditNoteValidation?.isValid ?? false;
  const creditNoteComplete = creditNoteRequired 
    ? (formData.creditNoteXmlFile && formData.creditNotePdfFile && creditNoteValid)
    : true;

  return {
    formData,
    setFormData,
    updateField,
    updateItem,
    deleteItem,
    addItem,
    resetForm,
    setWeek,
    isConfirmed,
    setIsConfirmed,
    toggleConfirmation,
    itemsTotal,
    showRetentionIva,
    showRetentionIsr,
    // Pronto Pago
    setPaymentProgram,
    recalculateProntoPago,
    prontoPagoPreview,
    // Late invoice
    setLateInvoiceInfo,
    acknowledgeLateInvoice,
    setWeekFromDescription,
    // Credit note (for Pronto Pago)
    setCreditNoteXmlFile,
    setCreditNotePdfFile,
    setCreditNoteValidation,
    clearCreditNote,
    creditNoteRequired,
    creditNoteValid,
    creditNoteComplete,
  };
};
