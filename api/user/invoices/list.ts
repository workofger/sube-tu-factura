import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../lib/supabase.js';
import { verifyUserJWT, extractUserToken } from '../../lib/userAuth.js';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

interface InvoiceListItem {
  id: string;
  facturapiId: string;
  cfdiType: 'I' | 'E' | 'P';
  cfdiTypeName: string;
  uuid: string | null;
  folio: string | null;
  series: string | null;
  issueDate: string;
  receiverRfc: string;
  receiverName: string | null;
  total: number;
  currency: string;
  status: string;
  statusName: string;
  createdAt: string;
}

/**
 * Invoice List Endpoint
 * 
 * GET /api/user/invoices/list - List all issued invoices for the authenticated flotillero
 * 
 * Query Parameters:
 * - page: number (default 1)
 * - limit: number (default 25, max 100)
 * - type: 'I' | 'E' | 'P' (optional, filter by CFDI type)
 * - status: 'pending' | 'stamped' | 'cancelled' (optional)
 * - search: string (optional, search by receiver RFC or name)
 * - startDate: string ISO date (optional)
 * - endDate: string ISO date (optional)
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
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build query
    let query = supabase
      .from('issued_invoices')
      .select('*', { count: 'exact' })
      .eq('flotillero_id', user.flotillero_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type && ['I', 'E', 'P'].includes(type)) {
      query = query.eq('cfdi_type', type);
    }

    if (status && ['pending', 'stamped', 'cancelled', 'error'].includes(status)) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`receiver_rfc.ilike.%${search}%,receiver_name.ilike.%${search}%`);
    }

    if (startDate) {
      query = query.gte('issue_date', startDate);
    }

    if (endDate) {
      query = query.lte('issue_date', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error('❌ Error listing invoices:', error);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Error al consultar las facturas',
      } as ApiResponse);
    }

    // Map to response format
    const items: InvoiceListItem[] = (invoices || []).map(inv => ({
      id: inv.id,
      facturapiId: inv.facturapi_invoice_id,
      cfdiType: inv.cfdi_type,
      cfdiTypeName: getCfdiTypeName(inv.cfdi_type),
      uuid: inv.uuid,
      folio: inv.folio,
      series: inv.series,
      issueDate: inv.issue_date,
      receiverRfc: inv.receiver_rfc,
      receiverName: inv.receiver_name,
      total: parseFloat(inv.total),
      currency: inv.currency || 'MXN',
      status: inv.status,
      statusName: getStatusName(inv.status),
      createdAt: inv.created_at,
    }));

    // Calculate pagination info
    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      message: 'Facturas obtenidas',
      data: {
        items,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Invoice list error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    } as ApiResponse);
  }
}

function getCfdiTypeName(type: string): string {
  const types: Record<string, string> = {
    'I': 'Factura de Ingreso',
    'E': 'Nota de Crédito',
    'P': 'Complemento de Pago',
    'N': 'Nómina',
    'T': 'Traslado',
  };
  return types[type] || 'Desconocido';
}

function getStatusName(status: string): string {
  const statuses: Record<string, string> = {
    'pending': 'Pendiente',
    'stamped': 'Timbrada',
    'cancelled': 'Cancelada',
    'error': 'Error',
  };
  return statuses[status] || 'Desconocido';
}
