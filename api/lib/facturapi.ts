/**
 * Facturapi Client Library
 * Handles all interactions with Facturapi for electronic invoicing
 * 
 * Note: Facturapi uses organization-specific API keys. Each flotillero's
 * organization will have its own test/live API key for invoice operations.
 */

import Facturapi, { CancellationMotive } from 'facturapi';

// Types for Facturapi operations
export interface CSDUploadData {
  cerFile: Buffer;      // Certificate file buffer
  keyFile: Buffer;      // Key file buffer
  password: string;     // Password for the .key file
}

export interface OrganizationData {
  name: string;
  legal_name: string;
  tax_id: string;       // RFC
  tax_system: string;   // Regimen fiscal code (e.g., "601")
  address: {
    zip: string;        // Codigo postal
  };
}

export interface InvoiceItemData {
  quantity: number;
  product: {
    description: string;
    product_key: string;    // Clave SAT (e.g., "78101800")
    unit_key?: string;      // Clave unidad SAT (e.g., "E48")
    unit_name?: string;     // Nombre unidad
    price: number;
    tax_included?: boolean;
    taxes?: Array<{
      type: 'IVA' | 'ISR' | 'IEPS';
      rate?: number;
      factor?: 'Tasa' | 'Cuota' | 'Exento';
      withholding?: boolean;
    }>;
  };
}

export interface InvoiceCreateData {
  type: 'I' | 'E' | 'P';  // Ingreso, Egreso, Pago
  customer: {
    legal_name: string;
    tax_id: string;         // RFC del receptor
    tax_system: string;     // Regimen fiscal receptor
    address: {
      zip: string;
    };
    email?: string;
    use?: string;           // Uso CFDI (e.g., "G03")
  };
  items: InvoiceItemData[];
  payment_form?: string;    // Forma de pago (e.g., "03" = Transferencia)
  payment_method?: 'PUE' | 'PPD';
  currency?: string;
  exchange?: number;
  series?: string;
  folio_number?: number;
  related?: Array<{
    relationship: string;   // Tipo de relacion (e.g., "01", "04")
    uuid: string[];         // UUIDs relacionados
  }>;
  // For payment complements (type P)
  complements?: Array<{
    type: 'pago';
    data: {
      payment_form: string;
      currency?: string;
      exchange?: number;
      date: string;
      related_documents: Array<{
        uuid: string;
        amount: number;
        installment: number;
        last_balance: number;
        currency?: string;
        exchange?: number;
        taxes?: any;
      }>;
    };
  }>;
}

export interface CancellationData {
  motive: CancellationMotive;
  substitution?: string;    // UUID of replacement invoice (required for motive 01)
}

// Get master API key for organization management
const getMasterApiKey = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isTest = env !== 'production';
  
  const testKey = process.env.FACTURAPI_API_KEY_TEST;
  const liveKey = process.env.FACTURAPI_API_KEY;
  
  if (isTest) {
    if (!testKey) {
      console.warn('⚠️ FACTURAPI_API_KEY_TEST not set, falling back to live key');
      if (!liveKey) {
        throw new Error('No Facturapi API key configured');
      }
      return liveKey;
    }
    return testKey;
  }
  
  if (!liveKey) {
    throw new Error('FACTURAPI_API_KEY not configured for production');
  }
  return liveKey;
};

// Master client for organization management
let masterClient: Facturapi | null = null;

/**
 * Get the master Facturapi client for organization management
 */
export const getMasterClient = (): Facturapi => {
  if (!masterClient) {
    const apiKey = getMasterApiKey();
    masterClient = new Facturapi(apiKey);
    const env = process.env.NODE_ENV || 'development';
    console.log(`📋 Facturapi master client initialized (${env !== 'production' ? 'TEST' : 'LIVE'} environment)`);
  }
  return masterClient;
};

/**
 * Get a Facturapi client for a specific organization
 * Uses the organization's own API key for operations
 */
export const getOrganizationClient = async (organizationId: string): Promise<Facturapi> => {
  const master = getMasterClient();
  const env = process.env.NODE_ENV || 'development';
  const isTest = env !== 'production';
  
  // Get the organization's API key
  let apiKey: string;
  if (isTest) {
    apiKey = await master.organizations.getTestApiKey(organizationId);
  } else {
    const liveKeys = await master.organizations.listLiveApiKeys(organizationId);
    if (!liveKeys || liveKeys.length === 0) {
      throw new Error('Organization has no live API keys');
    }
    // Need to renew to get the actual key (listLiveApiKeys only returns metadata)
    apiKey = await master.organizations.renewLiveApiKey(organizationId);
  }
  
  return new Facturapi(apiKey);
};

/**
 * Check if Facturapi connection is working
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    const client = getMasterClient();
    await client.organizations.list({ limit: 1 });
    return true;
  } catch (error) {
    console.error('❌ Facturapi connection error:', error);
    return false;
  }
};

// ============================================
// ORGANIZATION (CSD) MANAGEMENT
// ============================================

/**
 * Create a new organization in Facturapi
 */
export const createOrganization = async (
  orgData: OrganizationData
): Promise<{
  id: string;
  legal_name: string;
  tax_id: string;
}> => {
  const client = getMasterClient();
  
  console.log('📋 Creating Facturapi organization for RFC:', orgData.tax_id);
  
  try {
    const organization = await client.organizations.create({
      name: orgData.name,
      legal_name: orgData.legal_name,
      tax_id: orgData.tax_id,
      tax_system: orgData.tax_system,
      address: orgData.address,
    });
    
    console.log('✅ Organization created:', organization.id);
    
    return {
      id: organization.id,
      legal_name: organization.legal.legal_name,
      tax_id: organization.legal.tax_id,
    };
  } catch (error: any) {
    console.error('❌ Error creating organization:', error.message);
    throw new Error(`Error al crear organización en Facturapi: ${error.message}`);
  }
};

/**
 * Upload CSD certificate to an organization
 */
export const uploadCertificate = async (
  organizationId: string,
  csdData: CSDUploadData
): Promise<{
  serial_number: string;
  expires_at: string;
}> => {
  const client = getMasterClient();
  
  console.log('📤 Uploading CSD for organization:', organizationId);
  
  try {
    const result = await client.organizations.uploadCertificate(
      organizationId,
      csdData.cerFile,
      csdData.keyFile,
      csdData.password
    );
    
    console.log('✅ CSD uploaded successfully');
    
    return {
      serial_number: result.certificate?.serial_number || '',
      expires_at: result.certificate?.expires_at?.toISOString() || '',
    };
  } catch (error: any) {
    console.error('❌ Error uploading certificate:', error.message);
    throw new Error(`Error al subir CSD: ${error.message}`);
  }
};

/**
 * Get organization details from Facturapi
 */
export const getOrganization = async (organizationId: string): Promise<{
  id: string;
  legal_name: string;
  tax_id: string;
  is_production_ready: boolean;
  has_certificate: boolean;
  certificate_serial_number: string | null;
  certificate_expires_at: string | null;
}> => {
  const client = getMasterClient();
  
  try {
    const org = await client.organizations.retrieve(organizationId);
    return {
      id: org.id,
      legal_name: org.legal.legal_name,
      tax_id: org.legal.tax_id,
      is_production_ready: org.is_production_ready,
      has_certificate: org.certificate.has_certificate,
      certificate_serial_number: org.certificate.serial_number || null,
      certificate_expires_at: org.certificate.expires_at?.toISOString() || null,
    };
  } catch (error: any) {
    console.error('❌ Error retrieving organization:', error.message);
    throw new Error(`Error al obtener organización: ${error.message}`);
  }
};

/**
 * Delete CSD certificate from an organization
 */
export const deleteCertificate = async (organizationId: string): Promise<void> => {
  const client = getMasterClient();
  
  console.log('🗑️ Deleting certificate from organization:', organizationId);
  
  try {
    await client.organizations.deleteCertificate(organizationId);
    console.log('✅ Certificate deleted');
  } catch (error: any) {
    console.error('❌ Error deleting certificate:', error.message);
    throw new Error(`Error al eliminar certificado: ${error.message}`);
  }
};

/**
 * Delete an organization from Facturapi
 */
export const deleteOrganization = async (organizationId: string): Promise<void> => {
  const client = getMasterClient();
  
  console.log('🗑️ Deleting organization:', organizationId);
  
  try {
    await client.organizations.del(organizationId);
    console.log('✅ Organization deleted');
  } catch (error: any) {
    console.error('❌ Error deleting organization:', error.message);
    throw new Error(`Error al eliminar organización: ${error.message}`);
  }
};

// ============================================
// INVOICE MANAGEMENT
// ============================================

/**
 * Create an invoice (Ingreso, Egreso, or Pago)
 * Uses the organization's own API key
 */
export const createInvoice = async (
  organizationId: string,
  invoiceData: InvoiceCreateData
): Promise<{
  id: string;
  uuid: string;
  status: string;
  total: number;
  folio_number: number | string;
  series: string;
  stamp: {
    date: string;
    sat_cert_number: string;
  } | null;
}> => {
  // Get organization-specific client
  const client = await getOrganizationClient(organizationId);
  
  console.log(`📋 Creating invoice type ${invoiceData.type}`);
  
  try {
    const invoice = await client.invoices.create(invoiceData);
    
    console.log('✅ Invoice created:', invoice.id, 'UUID:', invoice.uuid);
    
    return {
      id: invoice.id,
      uuid: invoice.uuid,
      status: invoice.status,
      total: invoice.total,
      folio_number: invoice.folio_number,
      series: invoice.series,
      stamp: invoice.stamp ? {
        date: invoice.stamp.date,
        sat_cert_number: invoice.stamp.sat_cert_number,
      } : null,
    };
  } catch (error: any) {
    console.error('❌ Error creating invoice:', error.message);
    throw new Error(`Error al crear factura: ${error.message}`);
  }
};

/**
 * Create a credit note (Nota de Crédito - Egreso)
 */
export const createCreditNote = async (
  organizationId: string,
  customerData: InvoiceCreateData['customer'],
  items: InvoiceItemData[],
  relatedUuid: string,
  options?: {
    series?: string;
    folio_number?: number;
    payment_form?: string;
  }
): Promise<{
  id: string;
  uuid: string;
  status: string;
  total: number;
}> => {
  const invoiceData: InvoiceCreateData = {
    type: 'E',
    customer: customerData,
    items,
    payment_form: options?.payment_form || '03',
    payment_method: 'PUE',
    series: options?.series,
    folio_number: options?.folio_number,
    related: [{
      relationship: '01', // Nota de crédito de los documentos relacionados
      uuid: [relatedUuid],
    }],
  };
  
  const result = await createInvoice(organizationId, invoiceData);
  return {
    id: result.id,
    uuid: result.uuid,
    status: result.status,
    total: result.total,
  };
};

/**
 * Create a payment complement (Complemento de Pago)
 */
export const createPaymentComplement = async (
  organizationId: string,
  customerData: InvoiceCreateData['customer'],
  paymentData: {
    payment_form: string;
    date: string;
    currency?: string;
    exchange?: number;
    related_documents: Array<{
      uuid: string;
      amount: number;
      installment: number;
      last_balance: number;
      currency?: string;
      exchange?: number;
    }>;
  },
  options?: {
    series?: string;
    folio_number?: number;
  }
): Promise<{
  id: string;
  uuid: string;
  status: string;
}> => {
  const invoiceData: InvoiceCreateData = {
    type: 'P',
    customer: customerData,
    items: [], // Payment complements have no items
    series: options?.series,
    folio_number: options?.folio_number,
    complements: [{
      type: 'pago',
      data: paymentData,
    }],
  };
  
  const result = await createInvoice(organizationId, invoiceData);
  return {
    id: result.id,
    uuid: result.uuid,
    status: result.status,
  };
};

/**
 * Get invoice details
 */
export const getInvoice = async (
  organizationId: string,
  invoiceId: string
): Promise<any> => {
  const client = await getOrganizationClient(organizationId);
  
  try {
    const invoice = await client.invoices.retrieve(invoiceId);
    return invoice;
  } catch (error: any) {
    console.error('❌ Error retrieving invoice:', error.message);
    throw new Error(`Error al obtener factura: ${error.message}`);
  }
};

/**
 * List invoices for an organization
 */
export const listInvoices = async (
  organizationId: string,
  options?: {
    limit?: number;
    page?: number;
    status?: string;
    type?: string;
    date_from?: string;
    date_to?: string;
  }
): Promise<{
  data: any[];
  total_pages: number;
  total_results: number;
}> => {
  const client = await getOrganizationClient(organizationId);
  
  try {
    const result = await client.invoices.list(options || null);
    
    return {
      data: result.data || [],
      total_pages: result.total_pages || 1,
      total_results: result.total_results || 0,
    };
  } catch (error: any) {
    console.error('❌ Error listing invoices:', error.message);
    throw new Error(`Error al listar facturas: ${error.message}`);
  }
};

/**
 * Download invoice PDF
 * Returns a stream that can be piped to response
 */
export const downloadInvoicePdf = async (
  organizationId: string,
  invoiceId: string
): Promise<NodeJS.ReadableStream | Blob> => {
  const client = await getOrganizationClient(organizationId);
  
  try {
    const pdf = await client.invoices.downloadPdf(invoiceId);
    return pdf;
  } catch (error: any) {
    console.error('❌ Error downloading PDF:', error.message);
    throw new Error(`Error al descargar PDF: ${error.message}`);
  }
};

/**
 * Download invoice XML
 * Returns a stream that can be piped to response
 */
export const downloadInvoiceXml = async (
  organizationId: string,
  invoiceId: string
): Promise<NodeJS.ReadableStream | Blob> => {
  const client = await getOrganizationClient(organizationId);
  
  try {
    const xml = await client.invoices.downloadXml(invoiceId);
    return xml;
  } catch (error: any) {
    console.error('❌ Error downloading XML:', error.message);
    throw new Error(`Error al descargar XML: ${error.message}`);
  }
};

/**
 * Cancel an invoice
 */
export const cancelInvoice = async (
  organizationId: string,
  invoiceId: string,
  cancellationData: CancellationData
): Promise<{
  id: string;
  status: string;
  cancellation_status: string;
}> => {
  const client = await getOrganizationClient(organizationId);
  
  console.log('🗑️ Cancelling invoice:', invoiceId, 'motive:', cancellationData.motive);
  
  try {
    const result = await client.invoices.cancel(invoiceId, {
      motive: cancellationData.motive,
      substitution: cancellationData.substitution,
    });
    
    console.log('✅ Invoice cancellation requested, status:', result.cancellation_status);
    
    return {
      id: result.id,
      status: result.status,
      cancellation_status: result.cancellation_status,
    };
  } catch (error: any) {
    console.error('❌ Error cancelling invoice:', error.message);
    throw new Error(`Error al cancelar factura: ${error.message}`);
  }
};

/**
 * Send invoice by email
 */
export const sendInvoiceByEmail = async (
  organizationId: string,
  invoiceId: string,
  email: string
): Promise<void> => {
  const client = await getOrganizationClient(organizationId);
  
  try {
    await client.invoices.sendByEmail(invoiceId, { email });
    console.log('✅ Invoice sent to:', email);
  } catch (error: any) {
    console.error('❌ Error sending invoice:', error.message);
    throw new Error(`Error al enviar factura: ${error.message}`);
  }
};
