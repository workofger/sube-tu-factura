/**
 * Invoicing Service
 * Frontend service for electronic invoicing operations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// ============================================
// TYPES
// ============================================

export interface CSDStatus {
  status: 'none' | 'active' | 'expired' | 'error';
  invoicingEnabled: boolean;
  certificate: {
    serialNumber: string;
    validUntil: string;
    daysUntilExpiry: number | null;
    uploadedAt: string;
  } | null;
  fiscalInfo: {
    rfc: string;
    name: string;
    regime: string;
    zipCode: string;
  };
}

export interface InvoiceListItem {
  id: string;
  facturapiId: string;
  cfdiType: 'I' | 'E' | 'P';
  cfdiTypeName: string;
  uuid: string | null;
  folio: string | null;
  series: string | null;
  issueDate: string;
  receiverRfc: string;
  receiverName: string | null;
  total: number;
  currency: string;
  status: string;
  statusName: string;
  createdAt: string;
}

export interface InvoiceListResponse {
  items: InvoiceListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CustomerData {
  legalName: string;
  rfc: string;
  fiscalRegime: string;
  zipCode: string;
  email?: string;
}

export interface InvoiceItemData {
  description: string;
  productKey: string;
  unitKey: string;
  unitName?: string;
  quantity: number;
  price: number;
  taxIncluded?: boolean;
  taxes?: Array<{
    type: 'IVA' | 'ISR' | 'IEPS';
    rate?: number;
    factor?: 'Tasa' | 'Cuota' | 'Exento';
    withholding?: boolean;
  }>;
}

export interface CreateInvoicePayload {
  customer: CustomerData;
  items: InvoiceItemData[];
  paymentForm: string;
  paymentMethod?: 'PUE' | 'PPD';
  cfdiUse: string;
  series?: string;
  folioNumber?: number;
  currency?: string;
  relatedCfdis?: Array<{
    relationship: string;
    uuids: string[];
  }>;
}

export interface CreateCreditNotePayload {
  customer: CustomerData;
  items: InvoiceItemData[];
  paymentForm: string;
  cfdiUse: string;
  relatedUuids: string[];
}

export interface PaymentDetail {
  uuid: string;
  series?: string;
  folio?: string;
  currency: string;
  exchange?: number;
  installment: number;
  previousBalance: number;
  amountPaid: number;
}

export interface CreatePaymentComplementPayload {
  customer: CustomerData;
  payments: Array<{
    paymentForm: string;
    currency?: string;
    exchange?: number;
    date: string;
    amount: number;
    operationNumber?: string;
    relatedDocuments: PaymentDetail[];
  }>;
}

export interface InvoiceCreatedResponse {
  id: string;
  facturapiId: string;
  uuid: string;
  folio: number | null;
  series: string | null;
  total: number;
  status: string;
  verificationUrl?: string;
}

export interface CancellationPayload {
  motive: '01' | '02' | '03' | '04';
  substitutionUuid?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('user_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Error en la solicitud');
  }
  
  return data.data as T;
}

// ============================================
// CSD MANAGEMENT
// ============================================

/**
 * Get current CSD status
 */
export async function getCSDStatus(): Promise<CSDStatus> {
  const response = await fetch(`${API_BASE_URL}/api/user/csd`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<CSDStatus>(response);
}

/**
 * Upload CSD files
 */
export async function uploadCSD(
  cerFile: File,
  keyFile: File,
  password: string
): Promise<CSDStatus> {
  // Convert files to Base64
  const cerBase64 = await fileToBase64(cerFile);
  const keyBase64 = await fileToBase64(keyFile);
  
  const response = await fetch(`${API_BASE_URL}/api/user/csd`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      cerFile: cerBase64,
      keyFile: keyBase64,
      password,
    }),
  });
  
  return handleResponse<CSDStatus>(response);
}

/**
 * Delete CSD
 */
export async function deleteCSD(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/user/csd`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Error al eliminar CSD');
  }
}

// ============================================
// INVOICE OPERATIONS
// ============================================

/**
 * List issued invoices
 */
export async function listInvoices(options?: {
  page?: number;
  limit?: number;
  type?: 'I' | 'E' | 'P';
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<InvoiceListResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.type) params.set('type', options.type);
  if (options?.status) params.set('status', options.status);
  if (options?.search) params.set('search', options.search);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  
  const url = `${API_BASE_URL}/api/user/invoices/list?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse<InvoiceListResponse>(response);
}

/**
 * Create income invoice
 */
export async function createIncomeInvoice(
  payload: CreateInvoicePayload
): Promise<InvoiceCreatedResponse> {
  const response = await fetch(`${API_BASE_URL}/api/user/invoices/create?type=ingreso`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  
  return handleResponse<InvoiceCreatedResponse>(response);
}

/**
 * Create credit note
 */
export async function createCreditNote(
  payload: CreateCreditNotePayload
): Promise<InvoiceCreatedResponse> {
  const response = await fetch(`${API_BASE_URL}/api/user/invoices/create?type=egreso`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  
  return handleResponse<InvoiceCreatedResponse>(response);
}

/**
 * Create payment complement
 */
export async function createPaymentComplement(
  payload: CreatePaymentComplementPayload
): Promise<InvoiceCreatedResponse> {
  const response = await fetch(`${API_BASE_URL}/api/user/invoices/create?type=pago`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  
  return handleResponse<InvoiceCreatedResponse>(response);
}

/**
 * Download invoice XML
 */
export async function downloadInvoiceXml(invoiceId: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/user/invoices/download?id=${invoiceId}&format=xml`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Error al descargar XML');
  }
  
  return response.blob();
}

/**
 * Download invoice PDF
 */
export async function downloadInvoicePdf(invoiceId: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/user/invoices/download?id=${invoiceId}&format=pdf`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Error al descargar PDF');
  }
  
  return response.blob();
}

/**
 * Cancel invoice
 */
export async function cancelInvoice(
  invoiceId: string,
  payload: CancellationPayload
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/user/invoices/cancel?id=${invoiceId}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Error al cancelar factura');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert File to Base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/octet-stream;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ============================================
// SAT CATALOGS (Common values)
// ============================================

export const PAYMENT_FORMS = [
  { code: '01', name: 'Efectivo' },
  { code: '02', name: 'Cheque nominativo' },
  { code: '03', name: 'Transferencia electrónica de fondos' },
  { code: '04', name: 'Tarjeta de crédito' },
  { code: '28', name: 'Tarjeta de débito' },
  { code: '99', name: 'Por definir' },
];

export const CFDI_USES = [
  { code: 'G01', name: 'Adquisición de mercancías' },
  { code: 'G02', name: 'Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', name: 'Gastos en general' },
  { code: 'I01', name: 'Construcciones' },
  { code: 'I02', name: 'Mobiliario y equipo de oficina' },
  { code: 'I03', name: 'Equipo de transporte' },
  { code: 'I04', name: 'Equipo de cómputo y accesorios' },
  { code: 'I08', name: 'Otra maquinaria y equipo' },
  { code: 'S01', name: 'Sin efectos fiscales' },
  { code: 'CP01', name: 'Pagos' },
];

export const FISCAL_REGIMES = [
  { code: '601', name: 'General de Ley Personas Morales' },
  { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
  { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', name: 'Arrendamiento' },
  { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes' },
  { code: '608', name: 'Demás ingresos' },
  { code: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { code: '611', name: 'Ingresos por Dividendos (socios y accionistas)' },
  { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '614', name: 'Ingresos por intereses' },
  { code: '615', name: 'Régimen de los ingresos por obtención de premios' },
  { code: '616', name: 'Sin obligaciones fiscales' },
  { code: '620', name: 'Sociedades Cooperativas de Producción' },
  { code: '621', name: 'Incorporación Fiscal' },
  { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { code: '623', name: 'Opcional para Grupos de Sociedades' },
  { code: '624', name: 'Coordinados' },
  { code: '625', name: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { code: '626', name: 'Régimen Simplificado de Confianza' },
];

export const CANCELLATION_REASONS = [
  { code: '01', name: 'Comprobante emitido con errores con relación', requiresSubstitution: true },
  { code: '02', name: 'Comprobante emitido con errores sin relación', requiresSubstitution: false },
  { code: '03', name: 'No se llevó a cabo la operación', requiresSubstitution: false },
  { code: '04', name: 'Operación nominativa relacionada en una factura global', requiresSubstitution: false },
];
