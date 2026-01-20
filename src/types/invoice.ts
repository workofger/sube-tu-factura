export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  unit?: string;
  productKey?: string; // ClaveProdServ
  taxObject?: string; // ObjetoImp
}

export interface InvoiceData {
  // Selection fields
  week: string;
  project: string;
  
  // Issuer (Emisor) fields
  rfc: string;
  billerName: string;
  issuerRegime: string;
  issuerZipCode?: string; // CP del emisor
  
  // Receiver (Receptor) fields
  receiverRfc: string;
  receiverName?: string;
  receiverRegime: string;
  receiverZipCode?: string; // CP del receptor
  cfdiUse?: string; // UsoCFDI
  
  // Invoice identification
  invoiceDate: string;
  folio: string;
  series?: string; // Serie
  uuid: string;
  certificationDate?: string; // FechaTimbrado
  satCertNumber?: string; // NoCertificadoSAT
  
  // Payment info
  paymentMethod: 'PUE' | 'PPD' | '';
  paymentForm?: string; // FormaPago (03 = Transferencia)
  paymentConditions?: string; // CondicionesDePago
  
  // Financial fields
  subtotal: string;
  totalTax: string;
  retentionIva: string;
  retentionIvaRate: number;
  retentionIsr: string;
  retentionIsrRate: number;
  totalAmount: string;
  currency: string;
  exchangeRate?: string; // TipoCambio
  
  // Items
  items: InvoiceItem[];
  
  // Contact info
  emailUser: string;
  emailDomain: string;
  phoneNumber: string;
  
  // Files
  xmlFile: File | null;
  pdfFile: File | null;
}

export enum ProjectType {
  MERCADO_LIBRE = 'MERCADO LIBRE',
  AMAZON = 'AMAZON',
  WALMART = 'WALMART',
  SHOPIFY = 'SHOPIFY',
  OTHER = 'OTRO'
}

export interface ExtractionResult {
  week?: number;
  project?: string;
  
  // Issuer
  rfc?: string;
  billerName?: string;
  issuerRegime?: string;
  issuerZipCode?: string;
  
  // Receiver
  receiverRfc?: string;
  receiverName?: string;
  receiverRegime?: string;
  receiverZipCode?: string;
  cfdiUse?: string;
  
  // Contact
  email?: string;
  
  // Invoice ID
  invoiceDate?: string;
  folio?: string;
  series?: string;
  uuid?: string;
  certificationDate?: string;
  satCertNumber?: string;
  
  // Payment
  paymentMethod?: 'PUE' | 'PPD';
  paymentForm?: string;
  paymentConditions?: string;
  
  // Financial
  subtotal?: number;
  totalTax?: number;
  retentionIva?: number;
  retentionIvaRate?: number;
  retentionIsr?: number;
  retentionIsrRate?: number;
  totalAmount?: number;
  currency?: string;
  exchangeRate?: string;
  
  // Items
  items?: InvoiceItem[];
}

// Payload to send to webhook
export interface WebhookPayload {
  // Metadata
  submittedAt: string;
  week: number;
  project: string;
  
  // Issuer (Emisor)
  issuer: {
    rfc: string;
    name: string;
    regime: string;
    zipCode?: string;
  };
  
  // Receiver (Receptor)
  receiver: {
    rfc: string;
    name?: string;
    regime: string;
    zipCode?: string;
    cfdiUse?: string;
  };
  
  // Invoice identification
  invoice: {
    uuid: string;
    folio: string;
    series?: string;
    date: string;
    certificationDate?: string;
    satCertNumber?: string;
  };
  
  // Payment details
  payment: {
    method: string;
    form?: string;
    conditions?: string;
  };
  
  // Financial summary
  financial: {
    subtotal: number;
    totalTax: number;
    retentionIva: number;
    retentionIvaRate: number;
    retentionIsr: number;
    retentionIsrRate: number;
    totalAmount: number;
    currency: string;
    exchangeRate?: string;
  };
  
  // Line items
  items: InvoiceItem[];
  
  // Contact
  contact: {
    email: string;
    phone: string;
  };
  
  // Files in Base64
  files: {
    xml: {
      name: string;
      content: string; // Base64
      mimeType: string;
    } | null;
    pdf: {
      name: string;
      content: string; // Base64
      mimeType: string;
    } | null;
  };
}
