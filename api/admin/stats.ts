import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminAuth } from '../lib/adminAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface DashboardStats {
  totalInvoices: number;
  totalAmount: number;
  totalProntoPago: number;
  totalStandard: number;
  prontoPagoAmount: number;
  standardAmount: number;
  prontoPagoFees: number;
  thisWeekInvoices: number;
  lastWeekInvoices: number;
  currentWeek: number;
  currentYear: number;
}

interface RecentInvoice {
  id: string;
  uuid: string;
  issuer_name: string;
  total_amount: number;
  payment_program: string;
  created_at: string;
  status: string;
}

interface StatsResponse {
  stats: DashboardStats;
  recentInvoices: RecentInvoice[];
}

/**
 * GET /api/admin/stats
 * Get dashboard statistics
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

    const supabase = getSupabaseClient();

    // Calculate current week
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const diff = now.getTime() - startOfYear.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const currentWeek = Math.ceil(diff / oneWeek);

    // Fetch all invoices for stats
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, total_amount, payment_program, pronto_pago_fee_amount, payment_week, payment_year');

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      throw invoicesError;
    }

    // Calculate stats
    const stats: DashboardStats = {
      totalInvoices: invoices?.length || 0,
      totalAmount: invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
      totalProntoPago: invoices?.filter(inv => inv.payment_program === 'pronto_pago').length || 0,
      totalStandard: invoices?.filter(inv => inv.payment_program !== 'pronto_pago').length || 0,
      prontoPagoAmount: invoices?.filter(inv => inv.payment_program === 'pronto_pago')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
      standardAmount: invoices?.filter(inv => inv.payment_program !== 'pronto_pago')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
      prontoPagoFees: invoices?.reduce((sum, inv) => sum + (inv.pronto_pago_fee_amount || 0), 0) || 0,
      thisWeekInvoices: invoices?.filter(inv => 
        inv.payment_week === currentWeek && inv.payment_year === currentYear
      ).length || 0,
      lastWeekInvoices: invoices?.filter(inv => 
        inv.payment_week === currentWeek - 1 && inv.payment_year === currentYear
      ).length || 0,
      currentWeek,
      currentYear,
    };

    // Fetch recent invoices
    const { data: recent, error: recentError } = await supabase
      .from('invoices')
      .select('id, uuid, issuer_name, total_amount, payment_program, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Error fetching recent invoices:', recentError);
      throw recentError;
    }

    const recentInvoices: RecentInvoice[] = (recent || []).map(inv => ({
      id: inv.id,
      uuid: inv.uuid,
      issuer_name: inv.issuer_name,
      total_amount: inv.total_amount,
      payment_program: inv.payment_program || 'standard',
      created_at: inv.created_at,
      status: inv.status,
    }));

    return res.status(200).json({
      success: true,
      message: 'Estadísticas obtenidas',
      data: {
        stats,
        recentInvoices,
      },
    } as ApiResponse<StatsResponse>);

  } catch (error) {
    console.error('❌ Error in stats endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener estadísticas',
    } as ApiResponse);
  }
}
