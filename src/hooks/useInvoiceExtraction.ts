import { useState, useCallback } from 'react';
import { InvoiceData } from '../types/invoice';
import { extractInvoiceData } from '../services/openaiService';
import { CONFIG } from '../constants/config';
import { extractUuidFromXml, validateMatchingFilenames } from '../utils/xmlParser';
import { validateInvoiceWeek } from '../utils/weekValidation';

export interface ValidationAlert {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
}

interface UseInvoiceExtractionProps {
  formData: InvoiceData;
  setFormData: React.Dispatch<React.SetStateAction<InvoiceData>>;
  projects: Array<{ code: string; name: string }>;
  onValidationAlert?: (alert: ValidationAlert) => void;
}

export const useInvoiceExtraction = ({ 
  formData, 
  setFormData, 
  projects,
  onValidationAlert 
}: UseInvoiceExtractionProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Check if UUID already exists in database
  const checkUuidExists = useCallback(async (uuid: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid })
      });
      const data = await response.json();
      return data.exists === true;
    } catch (error) {
      console.error('Error checking UUID:', error);
      return false; // Assume doesn't exist on error, will catch at submission
    }
  }, []);

  // Validate project exists in database
  const validateProject = useCallback((projectName: string): boolean => {
    if (!projectName || projects.length === 0) return true; // Skip if no data
    
    const normalizedName = projectName.toUpperCase().replace(/ /g, '_');
    return projects.some(p => 
      p.code.toUpperCase() === normalizedName || 
      p.name.toUpperCase() === projectName.toUpperCase()
    );
  }, [projects]);

  const handleExtraction = useCallback(async () => {
    if (!formData.xmlFile || !formData.pdfFile) return;
    
    // Step 1: Validate filenames match
    const filenameValidation = validateMatchingFilenames(formData.xmlFile, formData.pdfFile);
    if (!filenameValidation.valid) {
      onValidationAlert?.({
        type: 'error',
        title: 'Nombres de archivo no coinciden',
        message: filenameValidation.error || 'Los archivos XML y PDF deben tener el mismo nombre.'
      });
      return;
    }

    setIsValidating(true);
    setExtractError(null);

    try {
      // Step 2: Extract UUID from XML (quick, no AI)
      const uuid = await extractUuidFromXml(formData.xmlFile);
      
      if (uuid) {
        // Step 3: Check if UUID exists in database
        const exists = await checkUuidExists(uuid);
        if (exists) {
          setIsValidating(false);
          onValidationAlert?.({
            type: 'error',
            title: 'Factura ya registrada',
            message: 'Esta factura ya fue cargada anteriormente en el sistema.',
            details: `UUID: ${uuid}`
          });
          return;
        }
      }
    } catch (error) {
      console.error('Pre-validation error:', error);
      // Continue with extraction even if pre-validation fails
    }

    setIsValidating(false);
    setIsExtracting(true);

    try {
      const data = await extractInvoiceData(formData.xmlFile, formData.pdfFile);
      
      // Step 4: Validate project exists
      if (data.project && !validateProject(data.project)) {
        onValidationAlert?.({
          type: 'error',
          title: 'Proyecto no reconocido',
          message: `El proyecto "${data.project}" no está registrado en el sistema. Contacta al administrador.`,
        });
        setIsExtracting(false);
        return;
      }

      // Step 5: Validate invoice week is still active
      if (data.invoiceDate) {
        const weekValidation = validateInvoiceWeek(data.invoiceDate);
        if (!weekValidation.valid) {
          onValidationAlert?.({
            type: 'error',
            title: 'Período de carga vencido',
            message: weekValidation.error || 'La fecha de factura corresponde a una semana que ya no está activa.',
          });
          setIsExtracting(false);
          return;
        }
      }

      // All validations passed - update form data
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
  }, [formData.xmlFile, formData.pdfFile, setFormData, checkUuidExists, validateProject, onValidationAlert]);

  const resetExtraction = useCallback(() => {
    setExtractSuccess(false);
    setExtractError(null);
  }, []);

  return {
    isExtracting,
    isValidating,
    extractError,
    extractSuccess,
    handleExtraction,
    resetExtraction,
  };
};
