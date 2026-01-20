import { InvoiceData, WebhookPayload } from '../types/invoice';
import { CONFIG } from '../constants/config';
import { fileToBase64 } from '../utils/files';
import { parseNumber } from '../utils/formatters';

// API base URL - uses relative path for same-origin requests in production
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

/**
 * Build the complete payload with all invoice data and files in Base64
 */
export const buildWebhookPayload = async (formData: InvoiceData): Promise<WebhookPayload> => {
  // Convert files to Base64
  let xmlFileData = null;
  let pdfFileData = null;

  if (formData.xmlFile) {
    const xmlBase64 = await fileToBase64(formData.xmlFile);
    xmlFileData = {
      name: formData.xmlFile.name,
      content: xmlBase64,
      mimeType: formData.xmlFile.type || 'application/xml',
    };
  }

  if (formData.pdfFile) {
    const pdfBase64 = await fileToBase64(formData.pdfFile);
    pdfFileData = {
      name: formData.pdfFile.name,
      content: pdfBase64,
      mimeType: formData.pdfFile.type || 'application/pdf',
    };
  }

  // Build full email
  const fullEmail = formData.emailUser 
    ? `${formData.emailUser}${formData.emailDomain}` 
    : '';

  // Build structured payload
  const payload: WebhookPayload = {
    // Metadata
    submittedAt: new Date().toISOString(),
    week: parseInt(formData.week, 10) || 1,
    project: formData.project,

    // Issuer (Emisor)
    issuer: {
      rfc: formData.rfc,
      name: formData.billerName,
      regime: formData.issuerRegime,
      zipCode: formData.issuerZipCode,
    },

    // Receiver (Receptor)
    receiver: {
      rfc: formData.receiverRfc,
      name: formData.receiverName,
      regime: formData.receiverRegime,
      zipCode: formData.receiverZipCode,
      cfdiUse: formData.cfdiUse,
    },

    // Invoice identification
    invoice: {
      uuid: formData.uuid,
      folio: formData.folio,
      series: formData.series,
      date: formData.invoiceDate,
      certificationDate: formData.certificationDate,
      satCertNumber: formData.satCertNumber,
    },

    // Payment details
    payment: {
      method: formData.paymentMethod,
      form: formData.paymentForm,
      conditions: formData.paymentConditions,
    },

    // Financial summary
    financial: {
      subtotal: parseNumber(formData.subtotal),
      totalTax: parseNumber(formData.totalTax),
      retentionIva: parseNumber(formData.retentionIva),
      retentionIvaRate: formData.retentionIvaRate || 0,
      retentionIsr: parseNumber(formData.retentionIsr),
      retentionIsrRate: formData.retentionIsrRate || 0,
      totalAmount: parseNumber(formData.totalAmount),
      currency: formData.currency,
      exchangeRate: formData.exchangeRate,
    },

    // Line items
    items: formData.items,

    // Contact
    contact: {
      email: fullEmail,
      phone: formData.phoneNumber,
    },

    // Files in Base64
    files: {
      xml: xmlFileData,
      pdf: pdfFileData,
    },
  };

  return payload;
};

/**
 * API Response interface
 */
interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: string[];
  data?: {
    invoiceId?: string;
    uuid?: string;
    driveFolderPath?: string;
    files?: {
      xml?: string;
      pdf?: string;
    };
    existingInvoiceId?: string;
  };
}

/**
 * Check if a UUID already exists in the system
 */
export const checkUuidExists = async (uuid: string): Promise<{ exists: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uuid }),
    });

    const data = await response.json();
    return {
      exists: data.exists,
      message: data.message,
    };
  } catch (error) {
    console.error('UUID check error:', error);
    return {
      exists: false,
      message: 'Error al verificar UUID',
    };
  }
};

/**
 * Submit invoice to the backend API
 */
export const submitInvoice = async (formData: InvoiceData): Promise<{ 
  success: boolean; 
  message: string;
  data?: ApiResponse['data'];
}> => {
  try {
    // Build the complete payload
    const payload = await buildWebhookPayload(formData);

    // Send to backend API
    const response = await fetch(`${API_BASE_URL}/api/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: ApiResponse = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || '¡Factura enviada correctamente!',
        data: data.data,
      };
    } else if (response.status === 409) {
      // Duplicate invoice
      return {
        success: false,
        message: data.message || 'Esta factura ya fue registrada anteriormente',
        data: data.data,
      };
    } else if (response.status === 400) {
      // Validation error
      const errorDetails = data.details?.join(', ') || 'Datos inválidos';
      return {
        success: false,
        message: `Error de validación: ${errorDetails}`,
      };
    } else {
      console.error('API error:', response.status, data);
      return {
        success: false,
        message: data.message || `Error al enviar la factura: Servidor respondió ${response.status}`,
      };
    }
  } catch (error) {
    console.error('Submission error:', error);
    return {
      success: false,
      message: 'Error de conexión: No se pudo conectar con el servidor. Verifique su conexión.',
    };
  }
};

/**
 * Check API health status
 */
export const checkApiHealth = async (): Promise<{
  healthy: boolean;
  services: { supabase: string; googleDrive: string };
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    
    return {
      healthy: data.status === 'healthy',
      services: data.services,
    };
  } catch {
    return {
      healthy: false,
      services: { supabase: 'error', googleDrive: 'error' },
    };
  }
};

/**
 * Validate form data before submission (client-side)
 */
export const validateFormData = (formData: InvoiceData): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required files
  if (!formData.xmlFile) {
    errors.push('El archivo XML es requerido');
  }
  if (!formData.pdfFile) {
    errors.push('El archivo PDF es requerido');
  }

  // Required fields
  if (!formData.rfc) {
    errors.push('El RFC del emisor es requerido');
  }
  if (!formData.billerName) {
    errors.push('El nombre del emisor es requerido');
  }
  if (!formData.uuid) {
    errors.push('El UUID (Folio Fiscal) es requerido');
  }
  if (!formData.totalAmount) {
    errors.push('El monto total es requerido');
  }

  // RFC validation
  if (formData.receiverRfc && formData.receiverRfc !== CONFIG.EXPECTED_RECEIVER_RFC) {
    errors.push(`El RFC del receptor no coincide con ${CONFIG.EXPECTED_RECEIVER_RFC}`);
  }

  // Contact info
  if (!formData.emailUser) {
    errors.push('El correo electrónico es requerido');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
