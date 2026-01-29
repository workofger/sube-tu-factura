import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../lib/supabase.js';
import { verifyUserJWT, extractUserToken } from '../../lib/userAuth.js';
import { cancelInvoice, CancellationData, getCancellationReasonDescription } from '../../lib/facturapi.js';

interface CancelInvoicePayload {
  motive: '01' | '02' | '03' | '04';
  substitutionUuid?: string;  // Required when motive is '01'
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

/**
 * Invoice Cancellation Endpoint
 * 
 * POST /api/user/invoices/cancel?id=xxx - Cancel an invoice
 * 
 * Body:
 * - motive: '01' | '02' | '03' | '04' (SAT cancellation reason)
 *   - '01': Comprobante emitido con errores con relación (requires substitutionUuid)
 *   - '02': Comprobante emitido con errores sin relación
 *   - '03': No se llevó a cabo la operación
 *   - '04': Operación nominativa relacionada en una factura global
 * - substitutionUuid: string (required when motive is '01')
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

  try {
    const invoiceId = req.query.id as string;
    const payload = req.body as CancelInvoicePayload;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'ID de factura requerido',
      } as ApiResponse);
    }

    // Validate cancellation payload
    if (!payload.motive || !['01', '02', '03', '04'].includes(payload.motive)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Motivo de cancelación inválido',
        details: [
          'Motivos válidos:',
          '01 - Comprobante emitido con errores con relación',
          '02 - Comprobante emitido con errores sin relación',
          '03 - No se llevó a cabo la operación',
          '04 - Operación nominativa relacionada en una factura global',
        ],
      } as ApiResponse);
    }

    // Motive '01' requires substitution UUID
    if (payload.motive === '01' && !payload.substitutionUuid) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'El motivo 01 requiere el UUID de la factura de sustitución',
      } as ApiResponse);
    }

    // Get the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('issued_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('flotillero_id', user.flotillero_id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Factura no encontrada',
      } as ApiResponse);
    }

    // Check if already cancelled
    if (invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_CANCELLED',
        message: 'Esta factura ya está cancelada',
      } as ApiResponse);
    }

    // Get flotillero for organization ID
    const { data: flotillero, error: flotilleroError } = await supabase
      .from('flotilleros')
      .select('facturapi_organization_id')
      .eq('id', user.flotillero_id)
      .single();

    if (flotilleroError || !flotillero?.facturapi_organization_id) {
      return res.status(400).json({
        success: false,
        error: 'INVOICING_NOT_CONFIGURED',
        message: 'Facturación no configurada',
      } as ApiResponse);
    }

    // Cancel in Facturapi
    const cancellationData: CancellationData = {
      motive: payload.motive,
      substitution: payload.substitutionUuid,
    };

    await cancelInvoice(
      flotillero.facturapi_organization_id,
      invoice.facturapi_invoice_id,
      cancellationData
    );

    // Update in database
    const { error: updateError } = await supabase
      .from('issued_invoices')
      .update({
        status: 'cancelled',
        cancellation_date: new Date().toISOString(),
        cancellation_reason: payload.motive,
        cancellation_uuid: payload.substitutionUuid || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('❌ Failed to update cancelled invoice in database:', updateError);
      // Continue anyway - cancellation succeeded in Facturapi
    }

    const motiveDescription = getCancellationReasonDescription(payload.motive);

    return res.status(200).json({
      success: true,
      message: 'Factura cancelada exitosamente',
      data: {
        id: invoiceId,
        uuid: invoice.uuid,
        status: 'cancelled',
        cancellationDate: new Date().toISOString(),
        cancellationMotive: payload.motive,
        cancellationMotiveDescription: motiveDescription,
        substitutionUuid: payload.substitutionUuid || null,
      },
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Invoice cancellation error:', error);
    
    // Parse Facturapi error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = 'Error al cancelar la factura';
    
    if (errorMessage.includes('already cancelled') || errorMessage.includes('cancelada')) {
      userMessage = 'Esta factura ya está cancelada';
    } else if (errorMessage.includes('pending') || errorMessage.includes('pendiente')) {
      userMessage = 'La cancelación está pendiente de aceptación por el receptor';
    } else if (errorMessage.includes('72 hours') || errorMessage.includes('72 horas')) {
      userMessage = 'No se puede cancelar directamente. Requiere aceptación del receptor después de 72 horas.';
    }

    return res.status(500).json({
      success: false,
      error: 'CANCELLATION_FAILED',
      message: userMessage,
      details: [errorMessage],
    } as ApiResponse);
  }
}
