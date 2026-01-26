import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminAuth, hasRole } from '../lib/adminAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface ExportInvoice {
  uuid: string;
  folio: string | null;
  invoice_date: string;
  issuer_rfc: string;
  issuer_name: string;
  total_amount: number;
  payment_program: string;
  pronto_pago_fee_amount: number | null;
  net_payment_amount: number | null;
  payment_week: number;
  payment_year: number;
  status: string;
  created_at: string;
  project_name: string | null;
}

/**
 * GET /api/admin/export
 * Export invoices as CSV or JSON
 * 
 * Query params:
 * - format: 'csv' | 'json' (default 'csv')
 * - weekFrom: number
 * - weekTo: number
 * - year: number
 * - project: string (project_id)
 * - paymentProgram: 'standard' | 'pronto_pago'
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
      message: 'Use GET request',
    } as ApiResponse);
  }

  try {
    // Verify authentication
    const admin = await verifyAdminAuth(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No autorizado',
      } as ApiResponse);
    }

    // Check role - only finance and super_admin can export
    if (!hasRole(admin, 'finance')) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'No tienes permisos para exportar',
      } as ApiResponse);
    }

    // Parse query params
    const {
      format = 'csv',
      weekFrom = '1',
      weekTo = '53',
      year,
      project,
      paymentProgram,
    } = req.query;

    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year as string, 10) || currentYear;
    const weekFromNum = parseInt(weekFrom as string, 10) || 1;
    const weekToNum = parseInt(weekTo as string, 10) || 53;

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        uuid,
        folio,
        invoice_date,
        issuer_rfc,
        issuer_name,
        total_amount,
        payment_program,
        pronto_pago_fee_amount,
        net_payment_amount,
        payment_week,
        payment_year,
        status,
        created_at,
        projects!left(name)
      `)
      .eq('payment_year', yearNum)
      .gte('payment_week', weekFromNum)
      .lte('payment_week', weekToNum);

    if (project) {
      query = query.eq('project_id', project);
    }

    if (paymentProgram) {
      query = query.eq('payment_program', paymentProgram);
    }

    const { data, error } = await query.order('payment_week', { ascending: true });

    if (error) {
      console.error('❌ Error fetching invoices for export:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NO_DATA',
        message: 'No hay datos para exportar con los filtros seleccionados',
      } as ApiResponse);
    }

    // Transform data
    const invoices: ExportInvoice[] = data.map((inv: Record<string, unknown>) => ({
      uuid: inv.uuid as string,
      folio: inv.folio as string | null,
      invoice_date: inv.invoice_date as string,
      issuer_rfc: inv.issuer_rfc as string,
      issuer_name: inv.issuer_name as string,
      total_amount: inv.total_amount as number,
      payment_program: (inv.payment_program as string) || 'standard',
      pronto_pago_fee_amount: inv.pronto_pago_fee_amount as number | null,
      net_payment_amount: inv.net_payment_amount as number | null,
      payment_week: inv.payment_week as number,
      payment_year: inv.payment_year as number,
      status: inv.status as string,
      created_at: inv.created_at as string,
      project_name: (inv.projects as Record<string, unknown>)?.name as string | null,
    }));

    // Return based on format
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        message: `Exportadas ${invoices.length} facturas`,
        data: {
          invoices,
          filters: {
            year: yearNum,
            weekFrom: weekFromNum,
            weekTo: weekToNum,
            project: project || null,
            paymentProgram: paymentProgram || null,
          },
          totals: {
            count: invoices.length,
            totalAmount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
            totalFees: invoices.reduce((sum, inv) => sum + (inv.pronto_pago_fee_amount || 0), 0),
            totalNet: invoices.reduce((sum, inv) => sum + (inv.net_payment_amount || inv.total_amount), 0),
          },
        },
      } as ApiResponse);
    }

    // Generate CSV
    const headers = [
      'UUID',
      'Folio',
      'Fecha Factura',
      'RFC Emisor',
      'Nombre Emisor',
      'Proyecto',
      'Semana',
      'Año',
      'Programa Pago',
      'Total',
      'Costo Financiero',
      'Neto a Pagar',
      'Estado',
      'Fecha Registro',
    ];

    const rows = invoices.map(inv => [
      inv.uuid,
      inv.folio || '',
      inv.invoice_date,
      inv.issuer_rfc,
      `"${inv.issuer_name}"`,
      inv.project_name || '',
      inv.payment_week,
      inv.payment_year,
      inv.payment_program === 'pronto_pago' ? 'Pronto Pago' : 'Estándar',
      inv.total_amount,
      inv.pronto_pago_fee_amount || 0,
      inv.net_payment_amount || inv.total_amount,
      inv.status,
      inv.created_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Set headers for CSV download
    const filename = `facturas_S${weekFromNum}-S${weekToNum}_${yearNum}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send('\ufeff' + csvContent); // BOM for Excel compatibility

  } catch (error) {
    console.error('❌ Error in export endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al exportar datos',
    } as ApiResponse);
  }
}
