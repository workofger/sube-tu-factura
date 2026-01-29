import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../lib/supabase.js';
import { verifyUserJWT, extractUserToken } from '../../lib/userAuth.js';
import { downloadInvoiceXml, downloadInvoicePdf } from '../../lib/facturapi.js';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

/**
 * Invoice Download Endpoint
 * 
 * GET /api/user/invoices/download?id=xxx&format=xml - Download XML
 * GET /api/user/invoices/download?id=xxx&format=pdf - Download PDF
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Solo se permite el método GET',
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
    const format = req.query.format as string;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'ID de factura requerido',
      } as ApiResponse);
    }

    if (!format || !['xml', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Formato inválido. Use: xml o pdf',
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

    // Download from Facturapi
    let fileBuffer: Buffer;
    let contentType: string;
    let filename: string;

    const baseFilename = `${invoice.uuid || invoice.facturapi_invoice_id}`;

    if (format === 'xml') {
      fileBuffer = await downloadInvoiceXml(
        flotillero.facturapi_organization_id,
        invoice.facturapi_invoice_id
      );
      contentType = 'application/xml';
      filename = `${baseFilename}.xml`;
    } else {
      fileBuffer = await downloadInvoicePdf(
        flotillero.facturapi_organization_id,
        invoice.facturapi_invoice_id
      );
      contentType = 'application/pdf';
      filename = `${baseFilename}.pdf`;
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());

    return res.status(200).send(fileBuffer);

  } catch (error) {
    console.error('❌ Invoice download error:', error);
    return res.status(500).json({
      success: false,
      error: 'DOWNLOAD_ERROR',
      message: 'Error al descargar el archivo',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    } as ApiResponse);
  }
}
