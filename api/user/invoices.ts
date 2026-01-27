import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth } from '../lib/userAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface UserInvoiceItem {
  id: string;
  uuid: string;
  folio: string | null;
  invoice_date: string;
  total_amount: number;
  net_payment_amount: number | null;
  payment_program: string;
  pronto_pago_fee_amount: number | null;
  payment_week: number;
  payment_year: number;
  status: string;
  created_at: string;
  project_name: string | null;
  project_code: string | null;
}

interface UserInvoicesResponse {
  invoices: UserInvoiceItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    total_facturado: number;
    total_pendiente: number;
    total_pagado: number;
    count_pending: number;
    count_paid: number;
  };
}

/**
 * GET /api/user/invoices
 * List invoices for authenticated user (flotillero)
 * 
 * Query params:
 * - page: number (default 1)
 * - pageSize: number (default 10, max 50)
 * - status: string (filter by status)
 * - week: number (filter by payment week)
 * - year: number (filter by year)
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

  // Verify authentication
  const user = await verifyUserAuth(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'No autorizado. Inicia sesión.',
    } as ApiResponse);
  }

  try {
    const {
      page = '1',
      pageSize = '10',
      status,
      week,
      year,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize as string, 10) || 10));
    const offset = (pageNum - 1) * pageSizeNum;

    const supabase = getSupabaseClient();

    // Build query - only invoices where user is the biller
    let query = supabase
      .from('invoices')
      .select(`
        id,
        uuid,
        folio,
        invoice_date,
        total_amount,
        net_payment_amount,
        payment_program,
        pronto_pago_fee_amount,
        payment_week,
        payment_year,
        status,
        created_at,
        projects!left(name, code)
      `, { count: 'exact' })
      .eq('biller_id', user.id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (week) {
      query = query.eq('payment_week', parseInt(week as string, 10));
    }

    if (year) {
      query = query.eq('payment_year', parseInt(year as string, 10));
    }

    // Execute query with pagination
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSizeNum - 1);

    if (error) {
      console.error('❌ Error fetching user invoices:', error);
      throw error;
    }

    // Get summary (all invoices, not paginated)
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('total_amount, net_payment_amount, status')
      .eq('biller_id', user.id);

    const summary = calculateSummary(allInvoices || []);

    // Transform data
    const invoices: UserInvoiceItem[] = (data || []).map((inv: Record<string, unknown>) => {
      const totalAmount = (inv.total_amount as number) ?? 0;
      const netAmount = (inv.net_payment_amount as number | null) ?? totalAmount;
      const projects = inv.projects as Record<string, unknown> | null;

      return {
        id: inv.id as string,
        uuid: inv.uuid as string,
        folio: (inv.folio as string) || null,
        invoice_date: inv.invoice_date as string,
        total_amount: totalAmount,
        net_payment_amount: netAmount,
        payment_program: (inv.payment_program as string) || 'standard',
        pronto_pago_fee_amount: (inv.pronto_pago_fee_amount as number | null) ?? 0,
        payment_week: (inv.payment_week as number) ?? 0,
        payment_year: (inv.payment_year as number) ?? new Date().getFullYear(),
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
        summary,
      },
    } as ApiResponse<UserInvoicesResponse>);

  } catch (error) {
    console.error('❌ Error in user invoices endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener facturas',
    } as ApiResponse);
  }
}

function calculateSummary(invoices: Array<{ total_amount: number; net_payment_amount: number | null; status: string }>) {
  const paidStatuses = ['paid'];
  const pendingStatuses = ['pending_review', 'approved', 'pending_payment'];

  let total_facturado = 0;
  let total_pendiente = 0;
  let total_pagado = 0;
  let count_pending = 0;
  let count_paid = 0;

  for (const inv of invoices) {
    const amount = inv.net_payment_amount ?? inv.total_amount ?? 0;
    total_facturado += amount;

    if (paidStatuses.includes(inv.status)) {
      total_pagado += amount;
      count_paid++;
    } else if (pendingStatuses.includes(inv.status)) {
      total_pendiente += amount;
      count_pending++;
    }
  }

  return {
    total_facturado: Math.round(total_facturado * 100) / 100,
    total_pendiente: Math.round(total_pendiente * 100) / 100,
    total_pagado: Math.round(total_pagado * 100) / 100,
    count_pending,
    count_paid,
  };
}
