import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminAuth, hasRole } from '../lib/adminAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { hashPassword, generateToken, hashToken } from '../lib/userAuth.js';
import { ApiResponse } from '../lib/types.js';

interface UserListItem {
  id: string;
  rfc: string | null;
  fiscal_name: string | null;
  trade_name: string | null;
  email: string;
  phone: string | null;
  type: 'flotillero' | 'independiente';
  status: string;
  email_verified: boolean;
  onboarding_completed: boolean;
  onboarding_step: string | null;
  has_bank_info: boolean;
  has_fiscal_info: boolean;
  auth_status: string;
  drivers_count: number;
  invoices_count: number;
  last_login_at: string | null;
  created_at: string;
  created_by_name: string | null;
  invite_sent_at: string | null;
  invite_method: string | null;
}

interface UsersResponse {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CreateUserPayload {
  type: 'flotillero' | 'independiente';
  email: string;
  phone: string;
  rfc?: string;
  fiscal_name?: string;
  invite_method: 'magic_link' | 'temp_password';
}

/**
 * /api/admin/users
 * 
 * GET - List users with pagination and filters
 * POST - Create new flotillero/driver
 * PUT - Update user (with ?id=xxx)
 * DELETE - Deactivate user (with ?id=xxx)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    // ========== GET - List users ==========
    if (req.method === 'GET') {
      const {
        page = '1',
        pageSize = '10',
        search,
        type,
        status,
        onboarding,
        id, // Single user detail
      } = req.query;

      // If ID is provided, return single user detail
      if (id) {
        const { data: user, error } = await supabase
          .from('flotilleros')
          .select(`
            *,
            admin_users!created_by_admin (full_name)
          `)
          .eq('id', id)
          .single();

        if (error || !user) {
          return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'Usuario no encontrado',
          } as ApiResponse);
        }

        // Get drivers count
        const { count: driversCount } = await supabase
          .from('drivers')
          .select('id', { count: 'exact', head: true })
          .eq('flotillero_id', id);

        // Get invoices count
        const { count: invoicesCount } = await supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('biller_id', id);

        return res.status(200).json({
          success: true,
          data: {
            ...user,
            drivers_count: driversCount || 0,
            invoices_count: invoicesCount || 0,
            created_by_name: user.admin_users?.full_name || null,
          },
        } as ApiResponse);
      }

      // List users with pagination
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 10));
      const offset = (pageNum - 1) * pageSizeNum;

      // Build query
      let query = supabase
        .from('flotilleros')
        .select(`
          id,
          rfc,
          fiscal_name,
          trade_name,
          email,
          phone,
          type,
          status,
          email_verified,
          onboarding_completed,
          onboarding_step,
          bank_clabe,
          bank_name,
          last_login_at,
          created_at,
          created_by_admin,
          invite_sent_at,
          invite_method,
          admin_users!created_by_admin (full_name)
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        const searchTerm = `%${search}%`;
        query = query.or(`email.ilike.${searchTerm},fiscal_name.ilike.${searchTerm},rfc.ilike.${searchTerm},phone.ilike.${searchTerm}`);
      }

      if (type && (type === 'flotillero' || type === 'independiente')) {
        query = query.eq('type', type);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (onboarding === 'completed') {
        query = query.eq('onboarding_completed', true);
      } else if (onboarding === 'pending') {
        query = query.eq('onboarding_completed', false);
      }

      // Execute query
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSizeNum - 1);

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }

      // Transform data
      const users: UserListItem[] = (data || []).map((u: Record<string, unknown>) => ({
        id: u.id as string,
        rfc: u.rfc as string | null,
        fiscal_name: u.fiscal_name as string | null,
        trade_name: u.trade_name as string | null,
        email: u.email as string,
        phone: u.phone as string | null,
        type: u.type as 'flotillero' | 'independiente',
        status: u.status as string,
        email_verified: u.email_verified as boolean,
        onboarding_completed: u.onboarding_completed as boolean,
        onboarding_step: u.onboarding_step as string | null,
        has_bank_info: !!(u.bank_clabe && u.bank_name),
        has_fiscal_info: !!(u.rfc && u.fiscal_name && u.phone),
        auth_status: getAuthStatus(u),
        drivers_count: 0, // Will be fetched separately if needed
        invoices_count: 0,
        last_login_at: u.last_login_at as string | null,
        created_at: u.created_at as string,
        created_by_name: (u.admin_users as Record<string, unknown>)?.full_name as string | null,
        invite_sent_at: u.invite_sent_at as string | null,
        invite_method: u.invite_method as string | null,
      }));

      const total = count || 0;
      const totalPages = Math.ceil(total / pageSizeNum);

      return res.status(200).json({
        success: true,
        data: {
          users,
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages,
        },
      } as ApiResponse<UsersResponse>);
    }

    // ========== POST - Create user ==========
    if (req.method === 'POST') {
      // Only super_admin and operations can create users
      if (!hasRole(admin, 'operations')) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'No tienes permisos para crear usuarios',
        } as ApiResponse);
      }

      const { action, id: userId } = req.query;

      // Handle special actions
      if (action === 'send-invite' && userId) {
        return await handleSendInvite(supabase, userId as string, admin.id, res);
      }

      if (action === 'reset-password' && userId) {
        return await handleResetPassword(supabase, userId as string, admin.id, res);
      }

      // Create new user
      const payload = req.body as CreateUserPayload;

      // Validate required fields
      if (!payload.email || !payload.phone) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email y teléfono son requeridos',
        } as ApiResponse);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Formato de email inválido',
        } as ApiResponse);
      }

      // Check if email already exists
      const { data: existing } = await supabase
        .from('flotilleros')
        .select('id')
        .eq('email', payload.email.toLowerCase())
        .single();

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'EMAIL_EXISTS',
          message: 'Ya existe un usuario con este email',
        } as ApiResponse);
      }

      // Check RFC if provided
      if (payload.rfc) {
        const { data: existingRfc } = await supabase
          .from('flotilleros')
          .select('id')
          .eq('rfc', payload.rfc.toUpperCase())
          .single();

        if (existingRfc) {
          return res.status(409).json({
            success: false,
            error: 'RFC_EXISTS',
            message: 'Ya existe un usuario con este RFC',
          } as ApiResponse);
        }
      }

      // Prepare user data
      const userData: Record<string, unknown> = {
        email: payload.email.toLowerCase(),
        phone: payload.phone,
        type: payload.type || 'independiente',
        status: 'pending_verification',
        onboarding_completed: false,
        onboarding_step: 'pending',
        created_by_admin: admin.id,
        invite_method: payload.invite_method,
      };

      if (payload.rfc) {
        userData.rfc = payload.rfc.toUpperCase();
      }

      if (payload.fiscal_name) {
        userData.fiscal_name = payload.fiscal_name;
      }

      // Handle invite method
      if (payload.invite_method === 'temp_password') {
        // Generate temporary password
        const tempPassword = generateTempPassword();
        userData.temp_password_hash = await hashPassword(tempPassword);
        userData.requires_password_change = true;

        // Insert user
        const { data: newUser, error: insertError } = await supabase
          .from('flotilleros')
          .insert(userData)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating user:', insertError);
          throw insertError;
        }

        console.log(`✅ User created with temp password: ${payload.email}`);

        return res.status(201).json({
          success: true,
          message: 'Usuario creado con contraseña temporal',
          data: {
            id: newUser.id,
            email: newUser.email,
            tempPassword, // Return once so admin can share
            requiresPasswordChange: true,
          },
        } as ApiResponse);

      } else {
        // Magic link invite
        const inviteToken = generateToken();
        userData.magic_link_token = hashToken(inviteToken);
        userData.magic_link_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        userData.invite_sent_at = new Date().toISOString();

        // Insert user
        const { data: newUser, error: insertError } = await supabase
          .from('flotilleros')
          .insert(userData)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating user:', insertError);
          throw insertError;
        }

        // TODO: Send email with magic link
        const inviteUrl = `${process.env.APP_URL || 'https://sube-tu-factura.vercel.app'}/portal/setup?token=${inviteToken}`;

        console.log(`✅ User created with magic link: ${payload.email}`);
        console.log(`   Invite URL: ${inviteUrl}`);

        return res.status(201).json({
          success: true,
          message: 'Usuario creado. Se debe enviar el enlace de invitación.',
          data: {
            id: newUser.id,
            email: newUser.email,
            inviteUrl, // Return for admin to share manually
            expiresIn: '7 días',
          },
        } as ApiResponse);
      }
    }

    // ========== PUT - Update user ==========
    if (req.method === 'PUT') {
      if (!hasRole(admin, 'operations')) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'No tienes permisos para actualizar usuarios',
        } as ApiResponse);
      }

      const { id: userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID de usuario requerido',
        } as ApiResponse);
      }

      const {
        email,
        phone,
        rfc,
        fiscal_name,
        trade_name,
        type,
        status,
        address,
      } = req.body;

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (email !== undefined) updateData.email = email.toLowerCase();
      if (phone !== undefined) updateData.phone = phone;
      if (rfc !== undefined) updateData.rfc = rfc?.toUpperCase() || null;
      if (fiscal_name !== undefined) updateData.fiscal_name = fiscal_name;
      if (trade_name !== undefined) updateData.trade_name = trade_name;
      if (type !== undefined) updateData.type = type;
      if (status !== undefined) updateData.status = status;
      if (address !== undefined) updateData.address = address;

      const { data, error } = await supabase
        .from('flotilleros')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating user:', error);
        throw error;
      }

      console.log(`✅ User updated: ${data.email}`);

      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado',
        data,
      } as ApiResponse);
    }

    // ========== DELETE - Deactivate user ==========
    if (req.method === 'DELETE') {
      if (!hasRole(admin, 'super_admin')) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Solo super_admin puede desactivar usuarios',
        } as ApiResponse);
      }

      const { id: userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID de usuario requerido',
        } as ApiResponse);
      }

      const { error } = await supabase
        .from('flotilleros')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error deactivating user:', error);
        throw error;
      }

      console.log(`✅ User deactivated: ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Usuario desactivado',
      } as ApiResponse);
    }

    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Método no permitido',
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Error in users endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al procesar solicitud',
    } as ApiResponse);
  }
}

// Helper functions

function getAuthStatus(user: Record<string, unknown>): string {
  const lockedUntil = user.locked_until as string | null;
  const passwordHash = user.password_hash as string | null;
  const emailVerified = user.email_verified as boolean;
  const onboardingCompleted = user.onboarding_completed as boolean;

  if (lockedUntil && new Date(lockedUntil) > new Date()) {
    return 'locked';
  }
  if (!passwordHash && !emailVerified) {
    return 'pending_setup';
  }
  if (!emailVerified) {
    return 'pending_verification';
  }
  if (!onboardingCompleted) {
    return 'pending_onboarding';
  }
  return 'active';
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function handleSendInvite(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  _adminId: string,
  res: VercelResponse
) {
  // Generate new magic link
  const inviteToken = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('flotilleros')
    .update({
      magic_link_token: hashToken(inviteToken),
      magic_link_expires_at: expiresAt,
      invite_sent_at: new Date().toISOString(),
      invite_method: 'magic_link',
    })
    .eq('id', userId)
    .select('email')
    .single();

  if (error) {
    throw error;
  }

  const inviteUrl = `${process.env.APP_URL || 'https://sube-tu-factura.vercel.app'}/portal/setup?token=${inviteToken}`;

  console.log(`✅ Invite sent to: ${data.email}`);

  return res.status(200).json({
    success: true,
    message: 'Enlace de invitación generado',
    data: {
      email: data.email,
      inviteUrl,
      expiresIn: '7 días',
    },
  } as ApiResponse);
}

async function handleResetPassword(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  _adminId: string,
  res: VercelResponse
) {
  // Generate new temp password
  const tempPassword = generateTempPassword();
  const tempHash = await hashPassword(tempPassword);

  const { data, error } = await supabase
    .from('flotilleros')
    .update({
      temp_password_hash: tempHash,
      requires_password_change: true,
      invite_method: 'temp_password',
    })
    .eq('id', userId)
    .select('email')
    .single();

  if (error) {
    throw error;
  }

  console.log(`✅ Password reset for: ${data.email}`);

  return res.status(200).json({
    success: true,
    message: 'Contraseña temporal generada',
    data: {
      email: data.email,
      tempPassword,
      requiresPasswordChange: true,
    },
  } as ApiResponse);
}
