// API Types for FacturaFlow Backend

export interface IssuerData {
  rfc: string;
  name: string;
  regime?: string;
  zipCode?: string;
}

export interface ReceiverData {
  rfc: string;
  name?: string;
  regime?: string;
  zipCode?: string;
  cfdiUse?: string;
}

export interface InvoiceIdentification {
  uuid: string;
  folio?: string;
  series?: string;
  date: string;
  certificationDate?: string;
  satCertNumber?: string;
}

export interface PaymentData {
  method: 'PUE' | 'PPD';
  form?: string;
  conditions?: string;
}

export interface FinancialData {
  subtotal: number;
  totalTax: number;
  retentionIva?: number;
  retentionIvaRate?: number;
  retentionIsr?: number;
  retentionIsrRate?: number;
  totalAmount: number;
  currency: string;
  exchangeRate?: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
  productKey?: string;
  taxObject?: string;
}

export interface ContactData {
  email?: string;
  phone?: string;
}

export interface FileData {
  name: string;
  content: string; // Base64
  mimeType: string;
}

export interface FilesData {
  xml?: FileData | null;
  pdf?: FileData | null;
}

// Main Invoice Payload (from frontend)
export interface InvoicePayload {
  submittedAt?: string;
  week: number;
  project: string;
  issuer: IssuerData;
  receiver: ReceiverData;
  invoice: InvoiceIdentification;
  payment: PaymentData;
  financial: FinancialData;
  items: InvoiceItem[];
  contact: ContactData;
  files: FilesData;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

export interface InvoiceSuccessData {
  invoiceId: string;
  uuid: string;
  driveFolderPath: string;
  files: {
    xml?: string;
    pdf?: string;
  };
}

export interface ValidateResponse {
  exists: boolean;
  message: string;
  existingInvoiceId?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    supabase: 'connected' | 'disconnected' | 'error';
    googleDrive: 'connected' | 'disconnected' | 'error';
  };
}

// Database Types
export interface DbDriver {
  id: string;
  rfc: string;
  fiscal_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  fiscal_regime_code?: string;
  fiscal_zip_code?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbInvoice {
  id: string;
  driver_id: string;
  project_id?: string;
  uuid: string;
  folio?: string;
  series?: string;
  invoice_date: string;
  certification_date?: string;
  sat_cert_number?: string;
  issuer_rfc: string;
  issuer_name: string;
  issuer_regime?: string;
  issuer_zip_code?: string;
  receiver_rfc: string;
  receiver_name?: string;
  receiver_regime?: string;
  receiver_zip_code?: string;
  cfdi_use?: string;
  payment_method: string;
  payment_form?: string;
  payment_conditions?: string;
  subtotal: number;
  total_tax: number;
  retention_iva?: number;
  retention_iva_rate?: number;
  retention_isr?: number;
  retention_isr_rate?: number;
  total_amount: number;
  currency: string;
  exchange_rate?: number;
  payment_week?: number;
  payment_year?: number;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}
