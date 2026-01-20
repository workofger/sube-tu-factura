import { useState, useCallback } from 'react';
import { InvoiceData, InvoiceItem, ProjectType } from '../types/invoice';

const initialFormData: InvoiceData = {
  week: '',
  project: ProjectType.MERCADO_LIBRE,
  rfc: '',
  billerName: '',
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
  items: [],
  emailUser: '',
  emailDomain: '@gmail.com',
  phoneNumber: '',
  xmlFile: null,
  pdfFile: null,
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

  const setWeek = useCallback((week: string) => {
    setFormData(prev => ({ ...prev, week }));
  }, []);

  const toggleConfirmation = useCallback(() => {
    setIsConfirmed(prev => !prev);
  }, []);

  // Calculate items total
  const itemsTotal = formData.items.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Check if retentions should be shown
  const showRetentionIva = (formData.retentionIva && parseFloat(formData.retentionIva) > 0) || 
                          (formData.retentionIvaRate && formData.retentionIvaRate > 0);
  const showRetentionIsr = (formData.retentionIsr && parseFloat(formData.retentionIsr) > 0) || 
                          (formData.retentionIsrRate && formData.retentionIsrRate > 0);

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
  };
};
