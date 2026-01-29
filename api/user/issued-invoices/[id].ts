import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth } from '../../lib/userAuth.js';
import { getSupabaseClient } from '../../lib/supabase.js';
import { ApiResponse } from '../../lib/types.js';
import {
  getInvoice,
  cancelInvoice,
  sendInvoiceByEmail,
  downloadInvoicePdf,
  downloadInvoiceXml,
  CancellationData,
} from '../../lib/facturapi.js';
import { CancellationMotive } from 'facturapi';

interface CancelInvoiceBody {
  motive: '01' | '02' | '03' | '04';
  substitution_uuid?: string;
}

/**
 * /api/user/issued-invoices/[id]
 * GET - Get invoice details
 * DELETE - Cancel invoice
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'ID de factura requerido',
    } as ApiResponse);
  }

  // Get the invoice from database
  const { data: invoice, error: invoiceError } = await supabase
    .from('issued_invoices')
    .select('*, flotilleros!inner(facturapi_organization_id)')
    .eq('id', id)
    .eq('flotillero_id', user.id)
    .single();

  if (invoiceError || !invoice) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Factura no encontrada',
    } as ApiResponse);
  }

  const organizationId = invoice.flotilleros?.facturapi_organization_id;
  if (!organizationId) {
    return res.status(400).json({
      success: false,
      error: 'NO_ORGANIZATION',
      message: 'Organización de Facturapi no configurada',
    } as ApiResponse);
  }

  // ============================================
  // GET - Get invoice details
  // ============================================
  if (req.method === 'GET') {
    try {
      // Get fresh data from Facturapi
      let facturApiData = null;
      try {
        facturApiData = await getInvoice(organizationId, invoice.facturapi_invoice_id);
      } catch (facturApiError) {
        console.warn('⚠️ Could not fetch from Facturapi:', facturApiError);
      }

      return res.status(200).json({
        success: true,
        data: {
          ...invoice,
          flotilleros: undefined, // Remove nested flotilleros data
          facturapi: facturApiData ? {
            status: facturApiData.status,
            cancellation_status: facturApiData.cancellation_status,
            verification_url: facturApiData.verification_url,
          } : null,
        },
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error fetching invoice:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al obtener factura',
      } as ApiResponse);
    }
  }

  // ============================================
  // DELETE - Cancel invoice
  // ============================================
  if (req.method === 'DELETE') {
    try {
      // Check if invoice can be cancelled
      if (invoice.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: 'ALREADY_CANCELLED',
          message: 'Esta factura ya está cancelada',
        } as ApiResponse);
      }

      const body = req.body as CancelInvoiceBody;

      if (!body?.motive) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Se requiere el motivo de cancelación',
        } as ApiResponse);
      }

      // Map string motive to enum
      const motiveMap: Record<string, CancellationMotive> = {
        '01': CancellationMotive.ERRORES_CON_RELACION,
        '02': CancellationMotive.ERRORES_SIN_RELACION,
        '03': CancellationMotive.NO_SE_CONCRETO,
        '04': CancellationMotive.FACTURA_GLOBAL,
      };

      const cancellationData: CancellationData = {
        motive: motiveMap[body.motive],
        substitution: body.substitution_uuid,
      };

      // Validate motive 01 requires substitution UUID
      if (body.motive === '01' && !body.substitution_uuid) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'El motivo 01 requiere el UUID de la factura de sustitución',
        } as ApiResponse);
      }

      // Cancel in Facturapi
      const result = await cancelInvoice(
        organizationId,
        invoice.facturapi_invoice_id,
        cancellationData
      );

      // Update in database
      const { error: updateError } = await supabase
        .from('issued_invoices')
        .update({
          status: result.status === 'canceled' ? 'cancelled' : 'pending_cancellation',
          cancellation_date: new Date().toISOString(),
          cancellation_motive: body.motive,
          cancellation_uuid: body.substitution_uuid,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('❌ Error updating cancelled invoice:', updateError);
      }

      console.log(`✅ Invoice cancelled: ${invoice.uuid}`);

      return res.status(200).json({
        success: true,
        message: result.cancellation_status === 'accepted' 
          ? 'Factura cancelada exitosamente'
          : 'Solicitud de cancelación enviada. Pendiente de respuesta del SAT.',
        data: {
          id: invoice.id,
          uuid: invoice.uuid,
          status: result.status,
          cancellation_status: result.cancellation_status,
        },
      } as ApiResponse);

    } catch (error: any) {
      console.error('❌ Error cancelling invoice:', error);
      return res.status(400).json({
        success: false,
        error: 'CANCELLATION_ERROR',
        message: error.message || 'Error al cancelar factura',
      } as ApiResponse);
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use GET o DELETE',
  } as ApiResponse);
}
