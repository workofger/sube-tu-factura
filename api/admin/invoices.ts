import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminAuth } from '../lib/adminAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface InvoiceListItem {
  id: string;
  uuid: string;
  folio: string | null;
  issuer_rfc: string;
  issuer_name: string;
  total_amount: number;
  net_payment_amount: number | null;
  payment_program: string;
  pronto_pago_fee_amount: number | null;
  payment_week: number;
  payment_year: number;
  invoice_date: string;
  status: string;
  created_at: string;
  project_name: string | null;
  project_code: string | null;
}

interface InvoicesResponse {
  invoices: InvoiceListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * GET /api/admin/invoices
 * Get paginated list of invoices with filters
 * 
 * Query params:
 * - page: number (default 1)
 * - pageSize: number (default 10, max 100)
 * - search: string (searches UUID, RFC, name)
 * - week: number
 * - year: number
 * - project: string (project_id)
 * - paymentProgram: 'standard' | 'pronto_pago'
 * - status: string
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

    // Parse query params
    const {
      page = '1',
      pageSize = '10',
      search,
      week,
      year,
      project,
      paymentProgram,
      status,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 10));
    const offset = (pageNum - 1) * pageSizeNum;

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        id,
        uuid,
        folio,
        issuer_rfc,
        issuer_name,
        total_amount,
        net_payment_amount,
        payment_program,
        pronto_pago_fee_amount,
        payment_week,
        payment_year,
        invoice_date,
        status,
        created_at,
        projects!left(name, code)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`uuid.ilike.${searchTerm},issuer_name.ilike.${searchTerm},issuer_rfc.ilike.${searchTerm}`);
    }

    if (week) {
      query = query.eq('payment_week', parseInt(week as string, 10));
    }

    if (year) {
      query = query.eq('payment_year', parseInt(year as string, 10));
    }

    if (project) {
      query = query.eq('project_id', project);
    }

    if (paymentProgram) {
      query = query.eq('payment_program', paymentProgram);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSizeNum - 1);

    if (error) {
      console.error('❌ Error fetching invoices:', error);
      throw error;
    }

    // Transform data with proper null handling
    const invoices: InvoiceListItem[] = (data || []).map((inv: Record<string, unknown>) => {
      const totalAmount = (inv.total_amount as number) ?? 0;
      const netAmount = (inv.net_payment_amount as number | null) ?? totalAmount;
      const feeAmount = (inv.pronto_pago_fee_amount as number | null) ?? 0;
      const projects = inv.projects as Record<string, unknown> | null;
      
      return {
        id: inv.id as string,
        uuid: inv.uuid as string,
        folio: (inv.folio as string) || null,
        issuer_rfc: inv.issuer_rfc as string,
        issuer_name: inv.issuer_name as string,
        total_amount: totalAmount,
        net_payment_amount: netAmount,
        payment_program: (inv.payment_program as string) || 'standard',
        pronto_pago_fee_amount: feeAmount,
        payment_week: (inv.payment_week as number) ?? 0,
        payment_year: (inv.payment_year as number) ?? new Date().getFullYear(),
        invoice_date: inv.invoice_date as string,
        status: (inv.status as string) || 'pending_review',
        created_at: inv.created_at as string,
        project_name: projects?.name as string | null ?? null,
        project_code: projects?.code as string | null ?? null,
      };
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSizeNum);

    return res.status(200).json({
      success: true,
      message: 'Facturas obtenidas',
      data: {
        invoices,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages,
      },
    } as ApiResponse<InvoicesResponse>);

  } catch (error) {
    console.error('❌ Error in invoices endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener facturas',
    } as ApiResponse);
  }
}
