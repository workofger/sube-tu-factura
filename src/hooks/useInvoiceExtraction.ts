import { useState, useCallback } from 'react';
import { InvoiceData } from '../types/invoice';
import { extractInvoiceData } from '../services/geminiService';
import { CONFIG } from '../constants/config';

interface UseInvoiceExtractionProps {
  formData: InvoiceData;
  setFormData: React.Dispatch<React.SetStateAction<InvoiceData>>;
}

export const useInvoiceExtraction = ({ formData, setFormData }: UseInvoiceExtractionProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);

  const handleExtraction = useCallback(async () => {
    if (!formData.xmlFile || !formData.pdfFile) return;
    
    setIsExtracting(true);
    setExtractError(null);

    try {
      const data = await extractInvoiceData(formData.xmlFile, formData.pdfFile);
      
      setFormData(prev => {
        let emailUser = prev.emailUser;
        let emailDomain = prev.emailDomain;

        if (data.email) {
          const parts = data.email.split('@');
          if (parts.length === 2) {
            emailUser = parts[0];
            const domainPart = `@${parts[1]}`;
            const knownDomain = CONFIG.EMAIL_DOMAINS.find(opt => opt.value === domainPart);
            emailDomain = knownDomain ? knownDomain.value : domainPart;
          }
        }

        return {
          ...prev,
          // Issuer
          rfc: data.rfc || prev.rfc,
          billerName: data.billerName || prev.billerName,
          issuerRegime: data.issuerRegime || prev.issuerRegime,
          issuerZipCode: data.issuerZipCode || prev.issuerZipCode,
          
          // Receiver
          receiverRfc: data.receiverRfc || prev.receiverRfc,
          receiverName: data.receiverName || prev.receiverName,
          receiverRegime: data.receiverRegime || prev.receiverRegime,
          receiverZipCode: data.receiverZipCode || prev.receiverZipCode,
          cfdiUse: data.cfdiUse || prev.cfdiUse,
          
          // Selection
          week: data.week ? data.week.toString() : prev.week,
          project: data.project || prev.project,
          
          // Invoice ID
          invoiceDate: data.invoiceDate || prev.invoiceDate,
          folio: data.folio || prev.folio,
          series: data.series || prev.series,
          uuid: data.uuid || prev.uuid,
          certificationDate: data.certificationDate || prev.certificationDate,
          satCertNumber: data.satCertNumber || prev.satCertNumber,
          
          // Payment
          paymentMethod: data.paymentMethod || prev.paymentMethod,
          paymentForm: data.paymentForm || prev.paymentForm,
          paymentConditions: data.paymentConditions || prev.paymentConditions,
          
          // Financial
          subtotal: data.subtotal ? data.subtotal.toString() : prev.subtotal,
          totalTax: data.totalTax ? data.totalTax.toString() : prev.totalTax,
          retentionIva: data.retentionIva ? data.retentionIva.toString() : prev.retentionIva,
          retentionIvaRate: data.retentionIvaRate || 0,
          retentionIsr: data.retentionIsr ? data.retentionIsr.toString() : prev.retentionIsr,
          retentionIsrRate: data.retentionIsrRate || 0,
          totalAmount: data.totalAmount ? data.totalAmount.toString() : prev.totalAmount,
          currency: data.currency || prev.currency,
          exchangeRate: data.exchangeRate || prev.exchangeRate,
          
          // Items
          items: data.items || [],
          
          // Contact
          emailUser,
          emailDomain
        };
      });
      
      setExtractSuccess(true);
    } catch (error) {
      console.error(error);
      setExtractError("No se pudieron extraer los datos automáticamente. Por favor llena los campos.");
    } finally {
      setIsExtracting(false);
    }
  }, [formData.xmlFile, formData.pdfFile, setFormData]);

  const resetExtraction = useCallback(() => {
    setExtractSuccess(false);
    setExtractError(null);
  }, []);

  return {
    isExtracting,
    extractError,
    extractSuccess,
    handleExtraction,
    resetExtraction,
  };
};
