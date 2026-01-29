import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../lib/supabase.js';
import { verifyUserJWT, extractUserToken } from '../../lib/userAuth.js';
import {
  createIncomeInvoice,
  createCreditNote,
  createPaymentComplement,
  CreateInvoiceData,
  CreditNoteData as FacturapiCreditNoteData,
  PaymentComplementData,
} from '../../lib/facturapi.js';

// ============================================
// TYPES
// ============================================

interface CustomerData {
  legalName: string;
  rfc: string;
  fiscalRegime: string;
  zipCode: string;
  email?: string;
}

interface InvoiceItem {
  description: string;
  productKey: string;       // Clave SAT
  unitKey: string;          // Clave unidad SAT
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

interface CreateInvoicePayload {
  type: 'I' | 'E' | 'P';    // Ingreso, Egreso, Pago
  customer: CustomerData;
  items: InvoiceItem[];
  paymentForm: string;       // 01, 03, 04, etc.
  paymentMethod?: 'PUE' | 'PPD';
  cfdiUse: string;           // Uso CFDI (G03, etc.)
  series?: string;
  folioNumber?: number;
  currency?: string;
  exchange?: number;
  conditions?: string;
  relatedCfdis?: Array<{
    relationship: string;    // 01, 02, etc.
    uuids: string[];
  }>;
  externalId?: string;
}

interface CreateCreditNotePayload {
  customer: CustomerData;
  items: InvoiceItem[];
  paymentForm: string;
  cfdiUse: string;
  relatedUuids: string[];    // UUIDs of related invoices
  series?: string;
  externalId?: string;
}

interface PaymentDetail {
  uuid: string;              // UUID of invoice being paid
  series?: string;
  folio?: string;
  currency: string;
  exchange?: number;
  installment: number;       // Partiality number
  previousBalance: number;
  amountPaid: number;
}

interface CreatePaymentComplementPayload {
  customer: CustomerData;
  payments: Array<{
    paymentForm: string;
    currency?: string;
    exchange?: number;
    date: string;           // ISO date
    amount: number;
    operationNumber?: string;
    relatedDocuments: PaymentDetail[];
  }>;
  series?: string;
  externalId?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

// ============================================
// MAIN HANDLER
// ============================================

/**
 * Invoice Creation Endpoints
 * 
 * POST /api/user/invoices/create?type=ingreso  - Create income invoice
 * POST /api/user/invoices/create?type=egreso   - Create credit note
 * POST /api/user/invoices/create?type=pago     - Create payment complement
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Solo se permite el método POST',
    } as ApiResponse);
  }

  // Verify authentication
  const token = extractUserToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Token de autenticación requerido',
    } as ApiResponse);
  }

  const userPayload = verifyUserJWT(token);
  if (!userPayload) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token inválido o expirado',
    } as ApiResponse);
  }

  const user = { flotillero_id: userPayload.flotilleroId };

  const supabase = getSupabaseClient();

  // Get flotillero and verify invoicing is enabled
  const { data: flotillero, error: flotilleroError } = await supabase
    .from('flotilleros')
    .select('id, rfc, fiscal_name, facturapi_organization_id, invoicing_enabled')
    .eq('id', user.flotillero_id)
    .single();

  if (flotilleroError || !flotillero) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Flotillero no encontrado',
    } as ApiResponse);
  }

  if (!flotillero.invoicing_enabled || !flotillero.facturapi_organization_id) {
    return res.status(403).json({
      success: false,
      error: 'INVOICING_DISABLED',
      message: 'No tienes habilitada la emisión de facturas. Primero debes cargar tu CSD.',
    } as ApiResponse);
  }

  // Route based on invoice type
  const invoiceType = req.query.type as string;

  try {
    switch (invoiceType) {
      case 'ingreso':
        return await handleCreateIncomeInvoice(
          req, res, flotillero, supabase
        );
      
      case 'egreso':
        return await handleCreateCreditNote(
          req, res, flotillero, supabase
        );
      
      case 'pago':
        return await handleCreatePaymentComplement(
          req, res, flotillero, supabase
        );
      
      default:
        return res.status(400).json({
          success: false,
          error: 'INVALID_TYPE',
          message: 'Tipo de factura inválido. Use: ingreso, egreso, pago',
        } as ApiResponse);
    }
  } catch (error) {
    console.error('❌ Invoice creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al crear la factura',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    } as ApiResponse);
  }
}

// ============================================
// INCOME INVOICE (FACTURA DE INGRESO)
// ============================================

async function handleCreateIncomeInvoice(
  req: VercelRequest,
  res: VercelResponse,
  flotillero: { id: string; rfc: string; fiscal_name: string; facturapi_organization_id: string },
  supabase: ReturnType<typeof getSupabaseClient>
) {
  console.log('📝 Creating income invoice for:', flotillero.rfc);

  const payload = req.body as CreateInvoicePayload;

  // Validate required fields
  const validationErrors = validateInvoicePayload(payload);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Datos de factura incompletos',
      details: validationErrors,
    } as ApiResponse);
  }

  // Build Facturapi invoice data
  const invoiceData: CreateInvoiceData = {
    type: 'I',
    customer: {
      legal_name: payload.customer.legalName,
      tax_id: payload.customer.rfc,
      tax_system: payload.customer.fiscalRegime,
      address: {
        zip: payload.customer.zipCode,
      },
      email: payload.customer.email,
    },
    items: payload.items.map(item => ({
      product: {
        description: item.description,
        product_key: item.productKey,
        unit_key: item.unitKey,
        unit_name: item.unitName,
        price: item.price,
        tax_included: item.taxIncluded,
        taxes: item.taxes?.map(tax => ({
          type: tax.type,
          rate: tax.rate,
          factor: tax.factor,
          withholding: tax.withholding,
        })),
      },
      quantity: item.quantity,
    })),
    payment_form: payload.paymentForm,
    payment_method: payload.paymentMethod || 'PUE',
    use: payload.cfdiUse,
    series: payload.series,
    folio_number: payload.folioNumber,
    currency: payload.currency || 'MXN',
    exchange: payload.exchange,
    conditions: payload.conditions,
    external_id: payload.externalId,
  };

  // Add related CFDIs if any
  if (payload.relatedCfdis && payload.relatedCfdis.length > 0) {
    invoiceData.related = payload.relatedCfdis.map(rel => ({
      relationship: rel.relationship,
      uuid: rel.uuids,
    }));
  }

  // Create invoice in Facturapi
  const invoice = await createIncomeInvoice(
    flotillero.facturapi_organization_id,
    invoiceData
  );

  // Save to database
  const { data: savedInvoice, error: saveError } = await supabase
    .from('issued_invoices')
    .insert({
      flotillero_id: flotillero.id,
      facturapi_invoice_id: invoice.id,
      cfdi_type: 'I',
      uuid: invoice.uuid,
      folio: invoice.folio_number?.toString(),
      series: invoice.series,
      issue_date: invoice.created_at,
      issuer_rfc: flotillero.rfc,
      issuer_name: flotillero.fiscal_name,
      receiver_rfc: payload.customer.rfc,
      receiver_name: payload.customer.legalName,
      receiver_cfdi_use: payload.cfdiUse,
      receiver_fiscal_regime: payload.customer.fiscalRegime,
      receiver_zip_code: payload.customer.zipCode,
      payment_method: payload.paymentMethod || 'PUE',
      payment_form: payload.paymentForm,
      total: invoice.total,
      currency: payload.currency || 'MXN',
      status: 'stamped',
      concepts: payload.items,
    })
    .select()
    .single();

  if (saveError) {
    console.error('❌ Failed to save invoice to database:', saveError);
    // Continue anyway - invoice was created in Facturapi
  }

  return res.status(201).json({
    success: true,
    message: 'Factura de ingreso creada exitosamente',
    data: {
      id: savedInvoice?.id || invoice.id,
      facturapiId: invoice.id,
      uuid: invoice.uuid,
      folio: invoice.folio_number,
      series: invoice.series,
      total: invoice.total,
      status: 'stamped',
      verificationUrl: invoice.verification_url,
    },
  } as ApiResponse);
}

// ============================================
// CREDIT NOTE (NOTA DE CRÉDITO)
// ============================================

async function handleCreateCreditNote(
  req: VercelRequest,
  res: VercelResponse,
  flotillero: { id: string; rfc: string; fiscal_name: string; facturapi_organization_id: string },
  supabase: ReturnType<typeof getSupabaseClient>
) {
  console.log('📝 Creating credit note for:', flotillero.rfc);

  const payload = req.body as CreateCreditNotePayload;

  // Validate required fields
  if (!payload.customer || !payload.items || payload.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Datos de nota de crédito incompletos',
    } as ApiResponse);
  }

  if (!payload.relatedUuids || payload.relatedUuids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Se requiere al menos un UUID de factura relacionada',
    } as ApiResponse);
  }

  // Build Facturapi credit note data
  const creditNoteData: FacturapiCreditNoteData = {
    customer: {
      legal_name: payload.customer.legalName,
      tax_id: payload.customer.rfc,
      tax_system: payload.customer.fiscalRegime,
      address: {
        zip: payload.customer.zipCode,
      },
      email: payload.customer.email,
    },
    items: payload.items.map(item => ({
      product: {
        description: item.description,
        product_key: item.productKey,
        unit_key: item.unitKey,
        price: item.price,
        taxes: item.taxes?.map(tax => ({
          type: tax.type,
          rate: tax.rate,
          factor: tax.factor,
          withholding: tax.withholding,
        })),
      },
      quantity: item.quantity,
    })),
    payment_form: payload.paymentForm,
    use: payload.cfdiUse,
    related: [{
      relationship: '01',  // Nota de crédito de los documentos relacionados
      uuid: payload.relatedUuids,
    }],
    series: payload.series,
    external_id: payload.externalId,
  };

  // Create credit note in Facturapi
  const invoice = await createCreditNote(
    flotillero.facturapi_organization_id,
    creditNoteData
  );

  // Save to database
  const { data: savedInvoice, error: saveError } = await supabase
    .from('issued_invoices')
    .insert({
      flotillero_id: flotillero.id,
      facturapi_invoice_id: invoice.id,
      cfdi_type: 'E',
      uuid: invoice.uuid,
      folio: invoice.folio_number?.toString(),
      series: invoice.series,
      issue_date: invoice.created_at,
      issuer_rfc: flotillero.rfc,
      issuer_name: flotillero.fiscal_name,
      receiver_rfc: payload.customer.rfc,
      receiver_name: payload.customer.legalName,
      receiver_cfdi_use: payload.cfdiUse,
      receiver_fiscal_regime: payload.customer.fiscalRegime,
      receiver_zip_code: payload.customer.zipCode,
      payment_form: payload.paymentForm,
      total: invoice.total,
      status: 'stamped',
      related_cfdi_uuids: payload.relatedUuids,
      related_cfdi_type: '01',
      concepts: payload.items,
    })
    .select()
    .single();

  if (saveError) {
    console.error('❌ Failed to save credit note to database:', saveError);
  }

  return res.status(201).json({
    success: true,
    message: 'Nota de crédito creada exitosamente',
    data: {
      id: savedInvoice?.id || invoice.id,
      facturapiId: invoice.id,
      uuid: invoice.uuid,
      folio: invoice.folio_number,
      series: invoice.series,
      total: invoice.total,
      status: 'stamped',
      verificationUrl: invoice.verification_url,
    },
  } as ApiResponse);
}

// ============================================
// PAYMENT COMPLEMENT (COMPLEMENTO DE PAGO)
// ============================================

async function handleCreatePaymentComplement(
  req: VercelRequest,
  res: VercelResponse,
  flotillero: { id: string; rfc: string; fiscal_name: string; facturapi_organization_id: string },
  supabase: ReturnType<typeof getSupabaseClient>
) {
  console.log('📝 Creating payment complement for:', flotillero.rfc);

  const payload = req.body as CreatePaymentComplementPayload;

  // Validate required fields
  if (!payload.customer || !payload.payments || payload.payments.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Datos de complemento de pago incompletos',
    } as ApiResponse);
  }

  // Validate each payment has related documents
  for (const payment of payload.payments) {
    if (!payment.relatedDocuments || payment.relatedDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Cada pago debe tener al menos un documento relacionado',
      } as ApiResponse);
    }
  }

  // Build Facturapi payment complement data
  const paymentComplementData: PaymentComplementData = {
    customer: {
      legal_name: payload.customer.legalName,
      tax_id: payload.customer.rfc,
      tax_system: payload.customer.fiscalRegime,
      address: {
        zip: payload.customer.zipCode,
      },
      email: payload.customer.email,
    },
    complements: [{
      type: 'pago',
      data: payload.payments.map(pmt => ({
        payment_form: pmt.paymentForm,
        currency: pmt.currency || 'MXN',
        exchange: pmt.exchange,
        date: pmt.date,
        amount: pmt.amount,
        operation_number: pmt.operationNumber,
        related_documents: pmt.relatedDocuments.map(doc => ({
          uuid: doc.uuid,
          series: doc.series,
          folio: doc.folio,
          currency: doc.currency,
          exchange: doc.exchange,
          installment: doc.installment,
          last_balance: doc.previousBalance,
          amount: doc.amountPaid,
        })),
      })),
    }],
    series: payload.series,
    external_id: payload.externalId,
  };

  // Create payment complement in Facturapi
  const invoice = await createPaymentComplement(
    flotillero.facturapi_organization_id,
    paymentComplementData
  );

  // Collect all related UUIDs
  const relatedUuids = payload.payments.flatMap(p => 
    p.relatedDocuments.map(d => d.uuid)
  );

  // Calculate total amount
  const totalAmount = payload.payments.reduce((sum, p) => sum + p.amount, 0);

  // Save to database
  const { data: savedInvoice, error: saveError } = await supabase
    .from('issued_invoices')
    .insert({
      flotillero_id: flotillero.id,
      facturapi_invoice_id: invoice.id,
      cfdi_type: 'P',
      uuid: invoice.uuid,
      folio: invoice.folio_number?.toString(),
      series: invoice.series,
      issue_date: invoice.created_at,
      issuer_rfc: flotillero.rfc,
      issuer_name: flotillero.fiscal_name,
      receiver_rfc: payload.customer.rfc,
      receiver_name: payload.customer.legalName,
      receiver_fiscal_regime: payload.customer.fiscalRegime,
      receiver_zip_code: payload.customer.zipCode,
      total: totalAmount,
      status: 'stamped',
      related_cfdi_uuids: relatedUuids,
    })
    .select()
    .single();

  if (saveError) {
    console.error('❌ Failed to save payment complement to database:', saveError);
  }

  // Also save payment details
  if (savedInvoice) {
    for (const payment of payload.payments) {
      for (const doc of payment.relatedDocuments) {
        await supabase
          .from('payment_complement_details')
          .insert({
            issued_invoice_id: savedInvoice.id,
            payment_date: payment.date,
            payment_form: payment.paymentForm,
            currency: payment.currency || 'MXN',
            exchange_rate: payment.exchange || 1,
            amount: payment.amount,
            operation_number: payment.operationNumber,
            related_uuid: doc.uuid,
            related_series: doc.series,
            related_folio: doc.folio,
            payment_method: 'PPD',
            partiality_number: doc.installment,
            previous_balance: doc.previousBalance,
            amount_paid: doc.amountPaid,
            remaining_balance: doc.previousBalance - doc.amountPaid,
          });
      }
    }
  }

  return res.status(201).json({
    success: true,
    message: 'Complemento de pago creado exitosamente',
    data: {
      id: savedInvoice?.id || invoice.id,
      facturapiId: invoice.id,
      uuid: invoice.uuid,
      folio: invoice.folio_number,
      series: invoice.series,
      total: totalAmount,
      paymentsCount: payload.payments.length,
      status: 'stamped',
      verificationUrl: invoice.verification_url,
    },
  } as ApiResponse);
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateInvoicePayload(payload: CreateInvoicePayload): string[] {
  const errors: string[] = [];

  if (!payload.customer) {
    errors.push('Información del cliente requerida');
  } else {
    if (!payload.customer.legalName) errors.push('Nombre del cliente requerido');
    if (!payload.customer.rfc) errors.push('RFC del cliente requerido');
    if (!payload.customer.fiscalRegime) errors.push('Régimen fiscal del cliente requerido');
    if (!payload.customer.zipCode) errors.push('Código postal del cliente requerido');
  }

  if (!payload.items || payload.items.length === 0) {
    errors.push('Se requiere al menos un concepto');
  } else {
    payload.items.forEach((item, index) => {
      if (!item.description) errors.push(`Concepto ${index + 1}: Descripción requerida`);
      if (!item.productKey) errors.push(`Concepto ${index + 1}: Clave SAT requerida`);
      if (!item.unitKey) errors.push(`Concepto ${index + 1}: Clave de unidad requerida`);
      if (!item.quantity || item.quantity <= 0) errors.push(`Concepto ${index + 1}: Cantidad inválida`);
      if (!item.price || item.price <= 0) errors.push(`Concepto ${index + 1}: Precio inválido`);
    });
  }

  if (!payload.paymentForm) errors.push('Forma de pago requerida');
  if (!payload.cfdiUse) errors.push('Uso de CFDI requerido');

  return errors;
}
