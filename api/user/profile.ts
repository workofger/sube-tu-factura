import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth } from '../lib/userAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

/**
 * /api/user/profile
 * GET - Get current user profile
 * PUT - Update user profile (limited fields)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  // GET - Return user profile
  if (req.method === 'GET') {
    try {
      // Get full profile with associated drivers count
      const { data: profile, error } = await supabase
        .from('flotilleros')
        .select(`
          id,
          rfc,
          fiscal_name,
          trade_name,
          email,
          phone,
          address,
          type,
          status,
          email_verified,
          bank_name,
          bank_clabe,
          bank_institution_id,
          created_at,
          last_login_at
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      // Get drivers count if flotillero type
      let driversCount = 0;
      if (profile.type === 'flotillero') {
        const { count } = await supabase
          .from('drivers')
          .select('id', { count: 'exact', head: true })
          .eq('flotillero_id', user.id);
        driversCount = count || 0;
      }

      // Get invoices summary
      const { data: invoicesSummary } = await supabase
        .from('invoices')
        .select('id, total_amount, status')
        .eq('biller_id', user.id);

      const invoicesTotal = invoicesSummary?.length || 0;
      const invoicesPaid = invoicesSummary?.filter(i => i.status === 'paid').length || 0;
      const invoicesPending = invoicesSummary?.filter(i => ['pending_review', 'approved', 'pending_payment'].includes(i.status)).length || 0;
      const totalAmount = invoicesSummary?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

      return res.status(200).json({
        success: true,
        data: {
          ...profile,
          stats: {
            drivers_count: driversCount,
            invoices_total: invoicesTotal,
            invoices_paid: invoicesPaid,
            invoices_pending: invoicesPending,
            total_facturado: totalAmount,
          },
        },
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al obtener perfil',
      } as ApiResponse);
    }
  }

  // PUT - Update profile
  if (req.method === 'PUT') {
    try {
      const { 
        phone, 
        address, 
        trade_name,
        bank_name,
        bank_clabe,
        bank_institution_id,
      } = req.body;

      // Validate bank_clabe if provided
      if (bank_clabe && bank_clabe.length !== 18) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'CLABE debe tener exactamente 18 dígitos',
        } as ApiResponse);
      }

      // Build update object with only allowed fields
      const updateData: Record<string, unknown> = {};
      
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (trade_name !== undefined) updateData.trade_name = trade_name;
      if (bank_name !== undefined) updateData.bank_name = bank_name;
      if (bank_clabe !== undefined) updateData.bank_clabe = bank_clabe;
      if (bank_institution_id !== undefined) updateData.bank_institution_id = bank_institution_id;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'No hay campos para actualizar',
        } as ApiResponse);
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('flotilleros')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`✅ Profile updated: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Perfil actualizado',
        data: {
          id: data.id,
          rfc: data.rfc,
          fiscal_name: data.fiscal_name,
          trade_name: data.trade_name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          bank_name: data.bank_name,
          bank_clabe: data.bank_clabe,
          bank_institution_id: data.bank_institution_id,
        },
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al actualizar perfil',
      } as ApiResponse);
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use GET o PUT',
  } as ApiResponse);
}
