import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth } from '../lib/userAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';
import {
  createInvoice,
  createCreditNote,
  createPaymentComplement,
  listInvoices,
  getInvoice,
  cancelInvoice,
  sendInvoiceByEmail,
  InvoiceCreateData,
  InvoiceItemData,
  CancellationData,
} from '../lib/facturapi.js';
import { CancellationMotive } from 'facturapi';

// ============================================
// Request/Response Types
// ============================================

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  product_key: string;     // Clave SAT
  unit_key?: string;       // Clave unidad SAT
  unit_name?: string;
  tax_rate?: number;       // Default 0.16 for IVA
  tax_included?: boolean;
}

interface CreateInvoiceBody {
  type: 'I' | 'E' | 'P';   // Ingreso, Egreso, Pago
  receiver: {
    rfc: string;
    name: string;
    tax_system: string;    // Regimen fiscal
    postal_code: string;
    cfdi_use?: string;     // Uso CFDI
    email?: string;
  };
  items: InvoiceItemInput[];
  payment_form?: string;   // Forma de pago
  payment_method?: 'PUE' | 'PPD';
  currency?: string;
  exchange_rate?: number;
  series?: string;
  
  // For credit notes (type E)
  related_uuid?: string;
  
  // For payment complements (type P)
  payment_data?: {
    payment_form: string;
    date: string;          // ISO date
    related_documents: Array<{
      uuid: string;
      amount: number;
      installment: number;
      last_balance: number;
    }>;
  };
}

interface CancelInvoiceBody {
  motive: '01' | '02' | '03' | '04';
  substitution_uuid?: string;  // Required for motive 01
}

/**
 * /api/user/issued-invoices
 * GET - List issued invoices
 * POST - Create new invoice
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication
  const user = await verifyUserAuth(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'No autorizado. Inicia sesión.',
    } as ApiResponse);
  }

  const supabase = getSupabaseClient();

  // Get flotillero data and verify invoicing is enabled
  const { data: flotillero, error: flotilleroError } = await supabase
    .from('flotilleros')
    .select('id, rfc, fiscal_name, facturapi_organization_id, invoicing_enabled')
    .eq('id', user.id)
    .single();

  if (flotilleroError || !flotillero) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Flotillero no encontrado',
    } as ApiResponse);
  }

  // ============================================
  // GET - List issued invoices
  // ============================================
  if (req.method === 'GET') {
    try {
      const { 
        page = '1', 
        limit = '20', 
        status, 
        type,
        date_from,
        date_to,
      } = req.query;

      // Build query
      let query = supabase
        .from('issued_invoices')
        .select('*')
        .eq('flotillero_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status as string);
      }
      if (type) {
        query = query.eq('cfdi_type', type as string);
      }
      if (date_from) {
        query = query.gte('issue_date', date_from as string);
      }
      if (date_to) {
        query = query.lte('issue_date', date_to as string);
      }

      // Pagination
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const offset = (pageNum - 1) * limitNum;

      query = query.range(offset, offset + limitNum - 1);

      const { data: invoices, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get total count
      const { count: totalCount } = await supabase
        .from('issued_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('flotillero_id', user.id);

      return res.status(200).json({
        success: true,
        data: {
          invoices: invoices || [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount || 0,
            total_pages: Math.ceil((totalCount || 0) / limitNum),
          },
        },
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error listing invoices:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al listar facturas',
      } as ApiResponse);
    }
  }

  // ============================================
  // POST - Create invoice
  // ============================================
  if (req.method === 'POST') {
    // Check if invoicing is enabled
    if (!flotillero.invoicing_enabled || !flotillero.facturapi_organization_id) {
      return res.status(400).json({
        success: false,
        error: 'INVOICING_DISABLED',
        message: 'La facturación no está habilitada. Carga tu CSD primero.',
      } as ApiResponse);
    }

    try {
      const body = req.body as CreateInvoiceBody;

      // Validate type
      if (!['I', 'E', 'P'].includes(body.type)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Tipo de comprobante inválido. Use I, E o P.',
        } as ApiResponse);
      }

      // Validate receiver
      if (!body.receiver?.rfc || !body.receiver?.name || !body.receiver?.tax_system || !body.receiver?.postal_code) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Datos del receptor incompletos',
        } as ApiResponse);
      }

      let result;

      // Handle different invoice types
      if (body.type === 'I') {
        // Standard invoice (Ingreso)
        if (!body.items || body.items.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Se requiere al menos un concepto',
          } as ApiResponse);
        }

        const invoiceData: InvoiceCreateData = {
          type: 'I',
          customer: {
            legal_name: body.receiver.name,
            tax_id: body.receiver.rfc,
            tax_system: body.receiver.tax_system,
            address: { zip: body.receiver.postal_code },
            use: body.receiver.cfdi_use || 'G03',
            email: body.receiver.email,
          },
          items: body.items.map(item => ({
            quantity: item.quantity,
            product: {
              description: item.description,
              product_key: item.product_key,
              unit_key: item.unit_key || 'E48',
              unit_name: item.unit_name || 'Servicio',
              price: item.unit_price,
              tax_included: item.tax_included || false,
              taxes: [{
                type: 'IVA' as const,
                rate: item.tax_rate ?? 0.16,
                factor: 'Tasa' as const,
              }],
            },
          })),
          payment_form: body.payment_form || '03',
          payment_method: body.payment_method || 'PUE',
          currency: body.currency || 'MXN',
          exchange: body.exchange_rate,
          series: body.series,
        };

        result = await createInvoice(flotillero.facturapi_organization_id, invoiceData);

      } else if (body.type === 'E') {
        // Credit Note (Egreso)
        if (!body.related_uuid) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Se requiere el UUID del CFDI relacionado para nota de crédito',
          } as ApiResponse);
        }

        if (!body.items || body.items.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Se requiere al menos un concepto',
          } as ApiResponse);
        }

        const items: InvoiceItemData[] = body.items.map(item => ({
          quantity: item.quantity,
          product: {
            description: item.description,
            product_key: item.product_key,
            unit_key: item.unit_key || 'E48',
            unit_name: item.unit_name || 'Servicio',
            price: item.unit_price,
            tax_included: item.tax_included || false,
            taxes: [{
              type: 'IVA' as const,
              rate: item.tax_rate ?? 0.16,
              factor: 'Tasa' as const,
            }],
          },
        }));

        result = await createCreditNote(
          flotillero.facturapi_organization_id,
          {
            legal_name: body.receiver.name,
            tax_id: body.receiver.rfc,
            tax_system: body.receiver.tax_system,
            address: { zip: body.receiver.postal_code },
            use: body.receiver.cfdi_use || 'G02',
            email: body.receiver.email,
          },
          items,
          body.related_uuid,
          {
            series: body.series,
            payment_form: body.payment_form,
          }
        );

      } else if (body.type === 'P') {
        // Payment Complement (Pago)
        if (!body.payment_data) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Se requieren datos del pago para complemento de pago',
          } as ApiResponse);
        }

        if (!body.payment_data.related_documents || body.payment_data.related_documents.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Se requiere al menos un documento relacionado',
          } as ApiResponse);
        }

        result = await createPaymentComplement(
          flotillero.facturapi_organization_id,
          {
            legal_name: body.receiver.name,
            tax_id: body.receiver.rfc,
            tax_system: body.receiver.tax_system,
            address: { zip: body.receiver.postal_code },
          },
          {
            payment_form: body.payment_data.payment_form,
            date: body.payment_data.date,
            related_documents: body.payment_data.related_documents,
          },
          { series: body.series }
        );
      }

      if (!result) {
        throw new Error('No se pudo crear la factura');
      }

      // Calculate totals for database
      let subtotal = 0;
      let totalTax = 0;
      if (body.items) {
        subtotal = body.items.reduce((sum, item) => {
          const itemSubtotal = item.quantity * item.unit_price;
          return sum + (item.tax_included ? itemSubtotal / (1 + (item.tax_rate || 0.16)) : itemSubtotal);
        }, 0);
        totalTax = body.items.reduce((sum, item) => {
          const itemSubtotal = item.quantity * item.unit_price;
          const baseAmount = item.tax_included ? itemSubtotal / (1 + (item.tax_rate || 0.16)) : itemSubtotal;
          return sum + (baseAmount * (item.tax_rate || 0.16));
        }, 0);
      }

      // Save to database
      const { data: savedInvoice, error: saveError } = await supabase
        .from('issued_invoices')
        .insert({
          flotillero_id: user.id,
          facturapi_invoice_id: result.id,
          cfdi_type: body.type,
          uuid: result.uuid,
          folio: result.folio_number?.toString(),
          series: result.series,
          issue_date: new Date().toISOString(),
          issuer_rfc: flotillero.rfc,
          issuer_name: flotillero.fiscal_name,
          receiver_rfc: body.receiver.rfc,
          receiver_name: body.receiver.name,
          receiver_cfdi_use: body.receiver.cfdi_use,
          payment_method: body.payment_method,
          payment_form: body.payment_form,
          subtotal: subtotal,
          total_tax: totalTax,
          total: result.total,
          currency: body.currency || 'MXN',
          exchange_rate: body.exchange_rate || 1,
          status: result.status === 'valid' ? 'stamped' : 'pending',
          items: body.items || [],
          cfdi_relations: body.related_uuid ? [{ tipoRelacion: '01', uuids: [body.related_uuid] }] : null,
        })
        .select()
        .single();

      if (saveError) {
        console.error('❌ Error saving invoice to database:', saveError);
        // Don't fail - invoice was created in Facturapi
      }

      console.log(`✅ Invoice created: ${result.uuid} (${body.type})`);

      return res.status(201).json({
        success: true,
        message: 'Factura creada exitosamente',
        data: {
          id: savedInvoice?.id || result.id,
          facturapi_id: result.id,
          uuid: result.uuid,
          type: body.type,
          status: result.status === 'valid' ? 'stamped' : 'pending',
          total: result.total,
          folio: result.folio_number,
          series: result.series,
        },
      } as ApiResponse);

    } catch (error: any) {
      console.error('❌ Error creating invoice:', error);
      return res.status(400).json({
        success: false,
        error: 'INVOICE_ERROR',
        message: error.message || 'Error al crear factura',
      } as ApiResponse);
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use GET o POST',
  } as ApiResponse);
}
