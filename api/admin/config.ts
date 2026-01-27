import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminAuth, hasRole } from '../lib/adminAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface SystemConfig {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  category: string;
  is_sensitive: boolean;
  updated_at: string;
  updated_by: string | null;
}

/**
 * /api/admin/config
 * GET - List all configurations or get specific key
 * PUT - Update configuration (super_admin only)
 * 
 * Query params:
 * - key: string (optional for GET, required for PUT)
 * - category: string (optional filter for GET)
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
  const admin = await verifyAdminAuth(req);
  if (!admin) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'No autorizado',
    } as ApiResponse);
  }

  const supabase = getSupabaseClient();

  // Handle GET - List or get specific config
  if (req.method === 'GET') {
    try {
      const { key, category } = req.query;

      // If specific key requested
      if (key) {
        const { data, error } = await supabase
          .from('system_config')
          .select('*')
          .eq('key', key)
          .single();

        if (error || !data) {
          return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: `Configuración '${key}' no encontrada`,
          } as ApiResponse);
        }

        // Hide sensitive values for non-super_admin
        const config = data as SystemConfig;
        if (config.is_sensitive && !hasRole(admin, 'super_admin')) {
          config.value = { hidden: true };
        }

        return res.status(200).json({
          success: true,
          data: config,
        } as ApiResponse);
      }

      // List all configurations
      let query = supabase
        .from('system_config')
        .select('*')
        .order('category')
        .order('key');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Hide sensitive values for non-super_admin
      const configs = (data as SystemConfig[]).map(config => {
        if (config.is_sensitive && !hasRole(admin, 'super_admin')) {
          return { ...config, value: { hidden: true } };
        }
        return config;
      });

      return res.status(200).json({
        success: true,
        data: configs,
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error fetching config:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al obtener configuración',
      } as ApiResponse);
    }
  }

  // Handle PUT - Update configuration
  if (req.method === 'PUT') {
    // Only super_admin can update config
    if (!hasRole(admin, 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Solo super_admin puede modificar configuraciones',
      } as ApiResponse);
    }

    try {
      const { key } = req.query;
      const { value, description } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Parámetro key es requerido',
        } as ApiResponse);
      }

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Campo value es requerido en el body',
        } as ApiResponse);
      }

      // Update configuration
      const updateData: Record<string, unknown> = {
        value,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      };

      if (description !== undefined) {
        updateData.description = description;
      }

      const { data, error } = await supabase
        .from('system_config')
        .update(updateData)
        .eq('key', key)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: `Configuración '${key}' no encontrada`,
          } as ApiResponse);
        }
        throw error;
      }

      console.log(`📝 Config updated: ${key} by ${admin.email}`);

      return res.status(200).json({
        success: true,
        message: 'Configuración actualizada',
        data,
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error updating config:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al actualizar configuración',
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
