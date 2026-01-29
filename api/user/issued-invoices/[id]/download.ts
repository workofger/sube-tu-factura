import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth } from '../../../lib/userAuth.js';
import { getSupabaseClient } from '../../../lib/supabase.js';
import { ApiResponse } from '../../../lib/types.js';
import {
  downloadInvoicePdf,
  downloadInvoiceXml,
} from '../../../lib/facturapi.js';

/**
 * /api/user/issued-invoices/[id]/download
 * GET - Download invoice PDF or XML
 * Query params:
 *   - format: 'pdf' | 'xml' (default: pdf)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use GET',
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
  const { id, format = 'pdf' } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'ID de factura requerido',
    } as ApiResponse);
  }

  if (format !== 'pdf' && format !== 'xml') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Formato inválido. Use pdf o xml.',
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

    // Download from Facturapi
    const fileName = `${invoice.uuid || invoice.id}.${format}`;
    
    if (format === 'pdf') {
      const pdfStream = await downloadInvoicePdf(organizationId, invoice.facturapi_invoice_id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Handle both stream and Blob responses
      if (pdfStream instanceof Blob) {
        const buffer = Buffer.from(await pdfStream.arrayBuffer());
        return res.send(buffer);
      } else {
        // Node.js ReadableStream
        pdfStream.pipe(res);
        return;
      }
    } else {
      const xmlStream = await downloadInvoiceXml(organizationId, invoice.facturapi_invoice_id);
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Handle both stream and Blob responses
      if (xmlStream instanceof Blob) {
        const text = await xmlStream.text();
        return res.send(text);
      } else {
        // Node.js ReadableStream
        xmlStream.pipe(res);
        return;
      }
    }

  } catch (error: any) {
    console.error('❌ Error downloading invoice:', error);
    return res.status(500).json({
      success: false,
      error: 'DOWNLOAD_ERROR',
      message: error.message || 'Error al descargar factura',
    } as ApiResponse);
  }
}
