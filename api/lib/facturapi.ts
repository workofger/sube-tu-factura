/**
 * Facturapi Client Library
 * Handles all interactions with Facturapi API for electronic invoicing
 */

import Facturapi from 'facturapi';

// Types for Facturapi operations
export interface CSDUploadData {
  cerFile: string;      // Base64 encoded .cer file
  keyFile: string;      // Base64 encoded .key file
  password: string;     // Password for .key file
}

export interface OrganizationData {
  name: string;
  legal_name: string;
  tax_id: string;       // RFC
  tax_system: string;   // Regimen fiscal code
  address: {
    zip: string;
  };
  email?: string;
  phone?: string;
}

export interface CreateInvoiceData {
  type: 'I' | 'E' | 'P';  // Ingreso, Egreso, Pago
  customer: {
    legal_name: string;
    tax_id: string;
    tax_system: string;
    address: {
      zip: string;
    };
    email?: string;
  };
  items: Array<{
  product: {
    description: string;
      product_key: string;
      unit_key: string;
      unit_name?: string;
    price: number;
    tax_included?: boolean;
    taxes?: Array<{
      type: 'IVA' | 'ISR' | 'IEPS';
      rate?: number;
      factor?: 'Tasa' | 'Cuota' | 'Exento';
      withholding?: boolean;
    }>;
  };
    quantity: number;
  }>;
  payment_form: string;
  payment_method?: 'PUE' | 'PPD';
  use: string;            // Uso CFDI
  series?: string;
  folio_number?: number;
  currency?: string;
  exchange?: number;
  conditions?: string;
  related?: Array<{
    relationship: string;
    uuid: string[];
  }>;
  external_id?: string;
}

export interface CreditNoteData {
  customer: {
    legal_name: string;
    tax_id: string;
    tax_system: string;
    address: {
      zip: string;
    };
    email?: string;
  };
  items: Array<{
    product: {
      description: string;
      product_key: string;
      unit_key: string;
      price: number;
      taxes?: Array<{
        type: 'IVA' | 'ISR' | 'IEPS';
        rate?: number;
        factor?: 'Tasa' | 'Cuota' | 'Exento';
        withholding?: boolean;
      }>;
    };
    quantity: number;
  }>;
  payment_form: string;
  use: string;
  related: Array<{
    relationship: '01';  // Nota de credito de los documentos relacionados
    uuid: string[];
  }>;
  series?: string;
  external_id?: string;
}

export interface PaymentComplementData {
  customer: {
    legal_name: string;
    tax_id: string;
    tax_system: string;
    address: {
      zip: string;
    };
    email?: string;
  };
  complements: Array<{
    type: 'pago';
    data: Array<{
      payment_form: string;
      currency?: string;
      exchange?: number;
      date: string;       // ISO date
      amount: number;
      related_documents: Array<{
        uuid: string;
        series?: string;
        folio?: string;
        currency: string;
        exchange?: number;
        installment: number;
        last_balance: number;
        amount: number;
        tax_object?: string;
      }>;
    }>;
  }>;
  series?: string;
  external_id?: string;
}

export interface FacturapiInvoice {
  id: string;
  uuid?: string;
  folio_number?: number;
  series?: string;
  created_at: string;
  status: string;
  total: number;
  customer: {
    legal_name: string;
    tax_id: string;
  };
  verification_url?: string;
}

export interface CancellationData {
  motive: '01' | '02' | '03' | '04';  // SAT cancellation reason
  substitution?: string;              // UUID of replacement invoice (for motive 01)
}

// Initialize Facturapi client
let facturapi: Facturapi | null = null;

/**
 * Get Facturapi client instance
 * Uses test or live API key based on environment config
 */
export const getFacturapiClient = (): Facturapi => {
  if (!facturapi) {
    const useTestEnv = process.env.FACTURAPI_ENVIRONMENT !== 'live';
    const apiKey = useTestEnv 
      ? process.env.FACTURAPI_API_KEY_TEST 
      : process.env.FACTURAPI_API_KEY;
    
    if (!apiKey) {
      throw new Error(`Missing Facturapi API key for ${useTestEnv ? 'test' : 'live'} environment`);
    }
    
    facturapi = new Facturapi(apiKey);
  }
  
  return facturapi;
};

/**
 * Check if Facturapi connection is healthy
 */
export const checkFacturapiConnection = async (): Promise<boolean> => {
  try {
    const client = getFacturapiClient();
    // List organizations as a health check
    await client.organizations.list({ limit: 1 });
    return true;
  } catch (error) {
    console.error('❌ Facturapi connection failed:', error);
    return false;
  }
};

// ============================================
// ORGANIZATION MANAGEMENT (CSD)
// ============================================

/**
 * Create a new organization in Facturapi with CSD
 * This registers a new RFC that can issue invoices
 */
export const createOrganization = async (
  orgData: OrganizationData,
  csdData: CSDUploadData
): Promise<{ id: string; legal_name: string; tax_id: string; certificate?: { expires_at: string; serial_number: string } }> => {
  const client = getFacturapiClient();
  
  console.log('📝 Creating Facturapi organization for RFC:', orgData.tax_id);
  
  try {
    // Create organization
    const organization = await client.organizations.create({
      name: orgData.name,
      legal_name: orgData.legal_name,
      tax_id: orgData.tax_id,
      tax_system: orgData.tax_system,
      address: orgData.address,
      email: orgData.email,
      phone: orgData.phone,
    });
    
    console.log('✅ Organization created:', organization.id);
    
    // Upload CSD certificate - SDK requires separate parameters, not an object
    console.log('📤 Uploading CSD certificate...');
    const cerBuffer = Buffer.from(csdData.cerFile, 'base64');
    const keyBuffer = Buffer.from(csdData.keyFile, 'base64');
    
    const updatedOrg = await client.organizations.uploadCertificate(
      organization.id,
      cerBuffer,
      keyBuffer,
      csdData.password
    );
    
    console.log('✅ CSD uploaded successfully. Serial:', updatedOrg.certificate?.serial_number);
    
    return {
      id: organization.id,
      legal_name: updatedOrg.legal?.legal_name || orgData.legal_name,
      tax_id: updatedOrg.legal?.tax_id || orgData.tax_id,
      certificate: updatedOrg.certificate?.expires_at ? {
        expires_at: updatedOrg.certificate.expires_at.toString(),
        serial_number: updatedOrg.certificate.serial_number || '',
      } : undefined,
    };
  } catch (error) {
    console.error('❌ Failed to create organization:', error);
    throw error;
  }
};

/**
 * Get organization details
 */
export const getOrganization = async (organizationId: string) => {
  const client = getFacturapiClient();
  return client.organizations.retrieve(organizationId);
};

/**
 * Update organization CSD
 */
export const updateOrganizationCSD = async (
  organizationId: string,
  csdData: CSDUploadData
): Promise<{ expires_at: string; serial_number: string }> => {
  const client = getFacturapiClient();
  
  console.log('📤 Updating CSD for organization:', organizationId);
  
  // SDK requires separate parameters, not an object
  const cerBuffer = Buffer.from(csdData.cerFile, 'base64');
  const keyBuffer = Buffer.from(csdData.keyFile, 'base64');
  
  const updatedOrg = await client.organizations.uploadCertificate(
    organizationId,
    cerBuffer,
    keyBuffer,
    csdData.password
  );
  
  console.log('✅ CSD updated. New serial:', updatedOrg.certificate?.serial_number);
  
  return {
    expires_at: updatedOrg.certificate?.expires_at?.toString() || '',
    serial_number: updatedOrg.certificate?.serial_number || '',
  };
};

/**
 * Delete organization (revokes CSD)
 */
export const deleteOrganization = async (organizationId: string): Promise<void> => {
  const client = getFacturapiClient();
    await client.organizations.del(organizationId);
  console.log('🗑️ Organization deleted:', organizationId);
};

// ============================================
// INVOICE CREATION
// ============================================

/**
 * Create an income invoice (Factura de Ingreso - tipo I)
 */
export const createIncomeInvoice = async (
  organizationId: string,
  invoiceData: CreateInvoiceData
): Promise<FacturapiInvoice> => {
  const client = getFacturapiClient();
  
  console.log('📝 Creating income invoice for org:', organizationId);
  
  const invoice = await client.invoices.create(invoiceData, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
    
    console.log('✅ Invoice created:', invoice.id, 'UUID:', invoice.uuid);
    
    return {
      id: invoice.id,
      uuid: invoice.uuid,
    folio_number: invoice.folio_number,
    series: invoice.series,
    created_at: invoice.created_at,
      status: invoice.status,
      total: invoice.total,
    customer: {
      legal_name: invoice.customer.legal_name,
      tax_id: invoice.customer.tax_id,
    },
    verification_url: invoice.verification_url,
  };
};

/**
 * Create a credit note (Nota de Crédito - tipo E)
 */
export const createCreditNote = async (
  organizationId: string,
  creditNoteData: CreditNoteData
): Promise<FacturapiInvoice> => {
  const client = getFacturapiClient();
  
  console.log('📝 Creating credit note for org:', organizationId);
  
  // Credit notes are type 'E' (Egreso)
  const invoicePayload = {
    ...creditNoteData,
    type: 'E' as const,
  };
  
  const invoice = await client.invoices.create(invoicePayload, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
  
  console.log('✅ Credit note created:', invoice.id, 'UUID:', invoice.uuid);
  
  return {
    id: invoice.id,
    uuid: invoice.uuid,
    folio_number: invoice.folio_number,
    series: invoice.series,
    created_at: invoice.created_at,
    status: invoice.status,
    total: invoice.total,
    customer: {
      legal_name: invoice.customer.legal_name,
      tax_id: invoice.customer.tax_id,
    },
    verification_url: invoice.verification_url,
  };
};

/**
 * Create a payment complement (Complemento de Pago - tipo P)
 */
export const createPaymentComplement = async (
  organizationId: string,
  paymentData: PaymentComplementData
): Promise<FacturapiInvoice> => {
  const client = getFacturapiClient();
  
  console.log('📝 Creating payment complement for org:', organizationId);
  
  // Payment complements are type 'P'
  const invoicePayload = {
    ...paymentData,
    type: 'P' as const,
  };
  
  const invoice = await client.invoices.create(invoicePayload, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
  
  console.log('✅ Payment complement created:', invoice.id, 'UUID:', invoice.uuid);
  
  return {
    id: invoice.id,
    uuid: invoice.uuid,
    folio_number: invoice.folio_number,
    series: invoice.series,
    created_at: invoice.created_at,
    status: invoice.status,
    total: invoice.total,
    customer: {
      legal_name: invoice.customer.legal_name,
      tax_id: invoice.customer.tax_id,
    },
    verification_url: invoice.verification_url,
  };
};

// ============================================
// INVOICE MANAGEMENT
// ============================================

/**
 * Get invoice by ID
 */
export const getInvoice = async (
  organizationId: string,
  invoiceId: string
): Promise<FacturapiInvoice> => {
  const client = getFacturapiClient();
  
  const invoice = await client.invoices.retrieve(invoiceId, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
  
  return {
    id: invoice.id,
    uuid: invoice.uuid,
    folio_number: invoice.folio_number,
    series: invoice.series,
    created_at: invoice.created_at,
    status: invoice.status,
    total: invoice.total,
    customer: {
      legal_name: invoice.customer.legal_name,
      tax_id: invoice.customer.tax_id,
    },
    verification_url: invoice.verification_url,
  };
};

/**
 * List invoices for an organization
 */
export const listInvoices = async (
  organizationId: string,
  options?: { limit?: number; page?: number; status?: string }
): Promise<{ data: FacturapiInvoice[]; total: number; page: number }> => {
  const client = getFacturapiClient();
  
  const result = await client.invoices.list({
    limit: options?.limit || 25,
    page: options?.page || 1,
    status: options?.status,
  }, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
    
    return {
    data: result.data.map((invoice: any) => ({
      id: invoice.id,
      uuid: invoice.uuid,
      folio_number: invoice.folio_number,
      series: invoice.series,
      created_at: invoice.created_at,
      status: invoice.status,
      total: invoice.total,
      customer: {
        legal_name: invoice.customer.legal_name,
        tax_id: invoice.customer.tax_id,
      },
      verification_url: invoice.verification_url,
    })),
    total: result.total_pages * (options?.limit || 25),
    page: result.page,
  };
};

/**
 * Download invoice XML
 */
export const downloadInvoiceXml = async (
  organizationId: string,
  invoiceId: string
): Promise<Buffer> => {
  const client = getFacturapiClient();
  
  const response = await client.invoices.downloadXml(invoiceId, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
  
  return response;
};

/**
 * Download invoice PDF
 */
export const downloadInvoicePdf = async (
  organizationId: string,
  invoiceId: string
): Promise<Buffer> => {
  const client = getFacturapiClient();
  
  const response = await client.invoices.downloadPdf(invoiceId, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
  
  return response;
};

/**
 * Send invoice by email
 */
export const sendInvoiceEmail = async (
  organizationId: string,
  invoiceId: string,
  email: string
): Promise<void> => {
  const client = getFacturapiClient();
  
  await client.invoices.sendByEmail(invoiceId, { email }, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
  
  console.log('📧 Invoice sent to:', email);
};

/**
 * Cancel an invoice
 */
export const cancelInvoice = async (
  organizationId: string,
  invoiceId: string,
  cancellationData: CancellationData
): Promise<void> => {
  const client = getFacturapiClient();
  
  console.log('🚫 Cancelling invoice:', invoiceId, 'Motive:', cancellationData.motive);
  
  await client.invoices.cancel(invoiceId, {
      motive: cancellationData.motive,
      substitution: cancellationData.substitution,
  }, {
    headers: {
      'X-Facturapi-Organization': organizationId,
    },
  });
  
  console.log('✅ Invoice cancelled');
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate CSD certificate format
 */
export const validateCSDFormat = (cerBase64: string, keyBase64: string): boolean => {
  try {
    // Basic validation - check if base64 strings are valid
    const cerBuffer = Buffer.from(cerBase64, 'base64');
    const keyBuffer = Buffer.from(keyBase64, 'base64');
    
    // Check minimum size (certificates should be > 1KB)
    if (cerBuffer.length < 1024 || keyBuffer.length < 1024) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Get SAT cancellation reason description
 */
export const getCancellationReasonDescription = (motive: string): string => {
  const reasons: Record<string, string> = {
    '01': 'Comprobante emitido con errores con relación',
    '02': 'Comprobante emitido con errores sin relación',
    '03': 'No se llevó a cabo la operación',
    '04': 'Operación nominativa relacionada en una factura global',
  };
  return reasons[motive] || 'Motivo desconocido';
};

