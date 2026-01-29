import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth } from '../../../lib/userAuth.js';
import { getSupabaseClient } from '../../../lib/supabase.js';
import { ApiResponse } from '../../../lib/types.js';
import { sendInvoiceByEmail } from '../../../lib/facturapi.js';

interface SendEmailBody {
  email: string;
}

/**
 * /api/user/issued-invoices/[id]/send
 * POST - Send invoice by email
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use POST',
    } as ApiResponse);
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
  const body = req.body as SendEmailBody;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'ID de factura requerido',
    } as ApiResponse);
  }

  if (!body?.email) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Email requerido',
    } as ApiResponse);
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Email inválido',
    } as ApiResponse);
  }

  try {
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

    // Check invoice status
    if (invoice.status !== 'stamped') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: 'Solo se pueden enviar facturas timbradas',
      } as ApiResponse);
    }

    // Send email via Facturapi
    await sendInvoiceByEmail(organizationId, invoice.facturapi_invoice_id, body.email);

    console.log(`✅ Invoice ${invoice.uuid} sent to ${body.email}`);

    return res.status(200).json({
      success: true,
      message: `Factura enviada a ${body.email}`,
    } as ApiResponse);

  } catch (error: any) {
    console.error('❌ Error sending invoice:', error);
    return res.status(500).json({
      success: false,
      error: 'SEND_ERROR',
      message: error.message || 'Error al enviar factura',
    } as ApiResponse);
  }
}
