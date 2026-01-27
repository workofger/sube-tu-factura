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
  // Late invoice stats
  totalLate: number;
  lateAmount: number;
  needsProjectReview: number;
}

interface RecentInvoice {
  id: string;
  uuid: string;
  issuer_name: string;
  total_amount: number;
  payment_program: string;
  created_at: string;
  status: string;
  is_late: boolean;
  late_reason: string | null;
  needs_project_review: boolean;
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

    // Fetch all invoices for stats (exclude cancelled/rejected)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, total_amount, net_payment_amount, payment_program, pronto_pago_fee_amount, payment_week, payment_year, status, is_late, late_reason, needs_project_review')
      .not('status', 'in', '("cancelled","rejected")');

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      throw invoicesError;
    }

    // Calculate stats with proper null handling
    const allInvoices = invoices || [];
    
    // Separate invoices by payment program
    const prontoPagoInvoices: typeof allInvoices = [];
    const standardInvoices: typeof allInvoices = [];
    
    for (const inv of allInvoices) {
      if (inv.payment_program === 'pronto_pago') {
        prontoPagoInvoices.push(inv);
      } else {
        // null, undefined, 'standard', or any other value = standard
        standardInvoices.push(inv);
      }
    }

    // Calculate amounts
    let totalAmount = 0;
    let prontoPagoAmount = 0;
    let standardAmount = 0;
    let prontoPagoFees = 0;

    for (const inv of prontoPagoInvoices) {
      const amount = inv.total_amount ?? 0;
      const fee = inv.pronto_pago_fee_amount ?? 0;
      prontoPagoAmount += amount;
      prontoPagoFees += fee;
      totalAmount += amount;
    }

    for (const inv of standardInvoices) {
      const amount = inv.total_amount ?? 0;
      standardAmount += amount;
      totalAmount += amount;
    }

    // Count this week and last week
    const thisWeekInvoices = allInvoices.filter(inv => 
      inv.payment_week === currentWeek && inv.payment_year === currentYear
    ).length;
    
    const lastWeekInvoices = allInvoices.filter(inv => 
      inv.payment_week === currentWeek - 1 && inv.payment_year === currentYear
    ).length;

    // Count late invoices and amount
    const lateInvoices = allInvoices.filter(inv => inv.is_late === true);
    const lateAmount = lateInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    
    // Count invoices needing project review
    const needsProjectReview = allInvoices.filter(inv => inv.needs_project_review === true).length;

    const stats: DashboardStats = {
      totalInvoices: allInvoices.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalProntoPago: prontoPagoInvoices.length,
      totalStandard: standardInvoices.length,
      prontoPagoAmount: Math.round(prontoPagoAmount * 100) / 100,
      standardAmount: Math.round(standardAmount * 100) / 100,
      prontoPagoFees: Math.round(prontoPagoFees * 100) / 100,
      thisWeekInvoices,
      lastWeekInvoices,
      currentWeek,
      currentYear,
      // Late invoice stats
      totalLate: lateInvoices.length,
      lateAmount: Math.round(lateAmount * 100) / 100,
      needsProjectReview,
    };
    
    // Debug: verify the sums add up
    const sumCheck = prontoPagoInvoices.length + standardInvoices.length;
    const amountCheck = Math.round((prontoPagoAmount + standardAmount) * 100) / 100;
    
    console.log('📊 Stats calculated:', {
      total: stats.totalInvoices,
      prontoPago: stats.totalProntoPago,
      standard: stats.totalStandard,
      sumCheck: `${sumCheck} === ${stats.totalInvoices}`,
      prontoPagoAmount: stats.prontoPagoAmount,
      standardAmount: stats.standardAmount,
      amountCheck: `${amountCheck} === ${stats.totalAmount}`,
    });

    // Fetch recent invoices
    const { data: recent, error: recentError } = await supabase
      .from('invoices')
      .select('id, uuid, issuer_name, total_amount, payment_program, created_at, status, is_late, late_reason, needs_project_review')
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
      is_late: inv.is_late || false,
      late_reason: inv.late_reason || null,
      needs_project_review: inv.needs_project_review || false,
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
