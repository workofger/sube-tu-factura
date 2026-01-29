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

// Payment Program Types
export type PaymentProgram = 'standard' | 'pronto_pago';

export interface PaymentProgramData {
  program: PaymentProgram;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
}

export const PRONTO_PAGO_FEE_RATE = 0.08; // 8%

export interface FileData {
  name: string;
  content: string; // Base64
  mimeType: string;
}

export interface FilesData {
  xml?: FileData | null;
  pdf?: FileData | null;
}

// Credit Note Data (CFDI tipo E - Egreso)
export interface CreditNotePayload {
  uuid: string;
  folio?: string;
  series?: string;
  relatedUuid: string;
  tipoRelacion: string;
  issuerRfc: string;
  issuerName?: string;
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  currency: string;
  issueDate: string;
  certificationDate?: string;
  files: {
    xml?: FileData | null;
    pdf?: FileData | null;
  };
}

// Late invoice types
export type LateInvoiceReason = 'after_deadline' | 'wrong_week';

// Main Invoice Payload (from frontend)
export interface InvoicePayload {
  submittedAt?: string;
  week: number;
  year?: number;
  project: string;
  // Late invoice fields
  isLate?: boolean;
  lateReason?: LateInvoiceReason;
  lateAcknowledgedAt?: string;
  // Entity data
  issuer: IssuerData;
  receiver: ReceiverData;
  invoice: InvoiceIdentification;
  payment: PaymentData;
  financial: FinancialData;
  paymentProgram: PaymentProgramData;
  items: InvoiceItem[];
  contact: ContactData;
  files: FilesData;
  // Credit note (required for pronto_pago)
  creditNote?: CreditNotePayload;
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
  creditNote?: {
    id: string;
    uuid: string;
    files: {
      xml?: string;
      pdf?: string;
    };
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

/**
 * Flotillero - Entity that issues invoices
 * Can be a fleet owner (flotillero) with multiple drivers
 * or an independent driver (independiente) who bills for themselves
 */
export interface DbFlotillero {
  id: string;
  rfc: string;
  fiscal_name: string;
  trade_name?: string;
  fiscal_regime_code?: string;
  fiscal_zip_code?: string;
  email?: string;
  phone?: string;
  address?: string;
  type: 'flotillero' | 'independiente';
  max_drivers: number;
  status: string;
  is_verified: boolean;
  notes?: string;
  // Auth fields
  password_hash?: string;
  temp_password_hash?: string;
  requires_password_change?: boolean;
  magic_link_token?: string;
  magic_link_expires_at?: string;
  invite_sent_at?: string;
  invite_method?: 'temp_password' | 'magic_link';
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Driver - Operator who performs deliveries
 * Can be independent (bills for themselves via flotillero with same RFC)
 * or associated with a flotillero (fleet owner bills on their behalf)
 */
export interface DbDriver {
  id: string;
  rfc: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  curp?: string;
  fiscal_name?: string;
  fiscal_regime_code?: string;
  fiscal_zip_code?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_clabe?: string;
  flotillero_id?: string; // Reference to flotillero
  status: string;
  is_verified: boolean;
  verification_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice - CFDI invoice record
 * biller_id: flotillero who issued the invoice
 * operated_by_driver_id: driver who performed the service (optional)
 */
export interface DbInvoice {
  id: string;
  driver_id: string;
  biller_id?: string; // New: flotillero who issues the invoice
  operated_by_driver_id?: string; // New: driver who performed the work
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
  // Pronto Pago fields
  payment_program?: PaymentProgram;
  pronto_pago_fee_rate?: number;
  pronto_pago_fee_amount?: number;
  net_payment_amount?: number;
  scheduled_payment_date?: string;
  // Late invoice fields
  is_late?: boolean;
  late_reason?: LateInvoiceReason;
  late_acknowledged_at?: string;
  needs_project_review?: boolean;
  project_match_confidence?: number;
  // Contact and status
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
  color?: string;
  icon?: string;
  sort_order?: number;
  is_active: boolean;
}

// OpenAI Extraction Result
export interface ExtractionResult {
  week?: number;
  project?: string;
  rfc?: string;
  billerName?: string;
  issuerRegime?: string;
  issuerZipCode?: string;
  receiverRfc?: string;
  receiverName?: string;
  receiverRegime?: string;
  receiverZipCode?: string;
  cfdiUse?: string;
  email?: string;
  invoiceDate?: string;
  folio?: string;
  series?: string;
  uuid?: string;
  certificationDate?: string;
  satCertNumber?: string;
  paymentMethod?: 'PUE' | 'PPD';
  paymentForm?: string;
  paymentConditions?: string;
  subtotal?: number;
  totalTax?: number;
  retentionIva?: number;
  retentionIvaRate?: number;
  retentionIsr?: number;
  retentionIsrRate?: number;
  totalAmount?: number;
  currency?: string;
  exchangeRate?: string;
  items?: InvoiceItem[];
}
