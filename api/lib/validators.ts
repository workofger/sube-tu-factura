import { InvoicePayload } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Expected receiver RFC from environment
const EXPECTED_RECEIVER_RFC = process.env.EXPECTED_RECEIVER_RFC || 'BLI180227F23';

/**
 * Validate RFC format (basic validation)
 */
const isValidRfc = (rfc: string): boolean => {
  if (!rfc) return false;
  // RFC can be 12 chars (persona moral) or 13 chars (persona fisica)
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
  return rfcRegex.test(rfc);
};

/**
 * Validate UUID format
 */
const isValidUuid = (uuid: string): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
const isValidDate = (date: string): boolean => {
  if (!date) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate invoice payload before processing
 */
export const validateInvoicePayload = (payload: InvoicePayload): ValidationResult => {
  const errors: string[] = [];

  // Required fields validation
  if (!payload) {
    return { valid: false, errors: ['Payload es requerido'] };
  }

  // Week validation
  if (!payload.week || payload.week < 1 || payload.week > 53) {
    errors.push('Semana debe ser un número entre 1 y 53');
  }

  // Project validation
  if (!payload.project || payload.project.trim() === '') {
    errors.push('Proyecto es requerido');
  }

  // Issuer validation
  if (!payload.issuer) {
    errors.push('Datos del emisor son requeridos');
  } else {
    if (!payload.issuer.rfc) {
      errors.push('RFC del emisor es requerido');
    } else if (!isValidRfc(payload.issuer.rfc)) {
      errors.push('RFC del emisor tiene formato inválido');
    }
    
    if (!payload.issuer.name || payload.issuer.name.trim() === '') {
      errors.push('Nombre del emisor es requerido');
    }
  }

  // Receiver validation
  if (!payload.receiver) {
    errors.push('Datos del receptor son requeridos');
  } else {
    if (!payload.receiver.rfc) {
      errors.push('RFC del receptor es requerido');
    } else if (!isValidRfc(payload.receiver.rfc)) {
      errors.push('RFC del receptor tiene formato inválido');
    } else if (payload.receiver.rfc.toUpperCase() !== EXPECTED_RECEIVER_RFC.toUpperCase()) {
      errors.push(`RFC del receptor debe ser ${EXPECTED_RECEIVER_RFC}`);
    }
  }

  // Invoice identification validation
  if (!payload.invoice) {
    errors.push('Datos de identificación de factura son requeridos');
  } else {
    if (!payload.invoice.uuid) {
      errors.push('UUID (Folio Fiscal) es requerido');
    } else if (!isValidUuid(payload.invoice.uuid)) {
      errors.push('UUID tiene formato inválido');
    }
    
    if (!payload.invoice.date) {
      errors.push('Fecha de factura es requerida');
    } else if (!isValidDate(payload.invoice.date)) {
      errors.push('Fecha de factura tiene formato inválido (usar YYYY-MM-DD)');
    }
  }

  // Payment validation
  if (!payload.payment) {
    errors.push('Datos de pago son requeridos');
  } else {
    if (!payload.payment.method) {
      errors.push('Método de pago es requerido');
    } else if (!['PUE', 'PPD'].includes(payload.payment.method)) {
      errors.push('Método de pago debe ser PUE o PPD');
    }
  }

  // Financial validation
  if (!payload.financial) {
    errors.push('Datos financieros son requeridos');
  } else {
    if (payload.financial.totalAmount === undefined || payload.financial.totalAmount === null) {
      errors.push('Monto total es requerido');
    } else if (typeof payload.financial.totalAmount !== 'number' || payload.financial.totalAmount <= 0) {
      errors.push('Monto total debe ser un número positivo');
    }
    
    if (payload.financial.subtotal !== undefined && typeof payload.financial.subtotal !== 'number') {
      errors.push('Subtotal debe ser un número');
    }
  }

  // Contact validation (optional but if provided, must be valid)
  if (payload.contact?.email && !isValidEmail(payload.contact.email)) {
    errors.push('Formato de correo electrónico inválido');
  }

  // Files validation
  if (!payload.files) {
    errors.push('Sección de archivos es requerida');
  } else {
    // At least XML is required
    if (!payload.files.xml || !payload.files.xml.content) {
      errors.push('Archivo XML es requerido');
    }
    // PDF is recommended but not strictly required
    if (!payload.files.pdf || !payload.files.pdf.content) {
      // Just a warning, not an error
      console.warn('PDF file not provided');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate UUID-only request
 */
export const validateUuidRequest = (body: { uuid?: string }): ValidationResult => {
  const errors: string[] = [];
  
  if (!body || !body.uuid) {
    errors.push('UUID es requerido');
  } else if (!isValidUuid(body.uuid)) {
    errors.push('UUID tiene formato inválido');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string for safe database insertion
 */
export const sanitizeString = (str: string | undefined | null): string | null => {
  if (!str) return null;
  // Remove potential SQL injection characters
  return str.replace(/['";\\]/g, '').trim();
};
