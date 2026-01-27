import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomBytes } from 'crypto';
import { verifyAdminAuth, hasRole } from '../lib/adminAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface ApiKeyRow {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  total_requests: number;
  expires_at: string | null;
}

/**
 * Generate a new API key
 * Format: pk_<random 32 chars>
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(24).toString('base64url');
  const key = `pk_${randomPart}`;
  const prefix = key.substring(0, 12); // pk_xxxxxxxx
  const hash = createHash('sha256').update(key).digest('hex');
  
  return { key, prefix, hash };
}

/**
 * /api/admin/api-keys
 * GET - List all API keys (only prefixes visible)
 * POST - Create new API key (returns full key once)
 * DELETE - Revoke API key (via query param ?id=xxx)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

  // Only super_admin can manage API keys
  if (!hasRole(admin, 'super_admin')) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Solo super_admin puede gestionar API keys',
    } as ApiResponse);
  }

  const supabase = getSupabaseClient();

  // GET - List API keys
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select(`
          id,
          name,
          description,
          key_prefix,
          scopes,
          rate_limit_per_minute,
          rate_limit_per_day,
          is_active,
          created_at,
          last_used_at,
          total_requests,
          expires_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Add computed status field
      const keys = (data as ApiKeyRow[]).map(key => ({
        ...key,
        status: getKeyStatus(key),
      }));

      return res.status(200).json({
        success: true,
        data: keys,
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error listing API keys:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al listar API keys',
      } as ApiResponse);
    }
  }

  // POST - Create new API key
  if (req.method === 'POST') {
    try {
      const { 
        name, 
        description, 
        scopes = ['public', 'admin'], 
        rate_limit_per_minute = 60,
        rate_limit_per_day = 10000,
        expires_in_days 
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Campo name es requerido',
        } as ApiResponse);
      }

      // Generate new API key
      const { key, prefix, hash } = generateApiKey();

      // Calculate expiration if specified
      let expiresAt: string | null = null;
      if (expires_in_days) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + expires_in_days);
        expiresAt = expDate.toISOString();
      }

      // Insert into database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          name,
          description,
          key_hash: hash,
          key_prefix: prefix,
          scopes,
          rate_limit_per_minute,
          rate_limit_per_day,
          created_by: admin.id,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`🔑 API Key created: ${name} by ${admin.email}`);

      // Return the full key ONCE - it won't be shown again
      return res.status(201).json({
        success: true,
        message: 'API Key creada exitosamente. Guarda este key, no se mostrará de nuevo.',
        data: {
          id: data.id,
          name: data.name,
          key: key, // Full key - only shown once!
          prefix: prefix,
          scopes: data.scopes,
          expires_at: data.expires_at,
        },
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error creating API key:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al crear API key',
      } as ApiResponse);
    }
  }

  // DELETE - Revoke API key
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Parámetro id es requerido',
        } as ApiResponse);
      }

      // Soft delete - just mark as inactive
      const { data, error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'API Key no encontrada',
          } as ApiResponse);
        }
        throw error;
      }

      console.log(`🔑 API Key revoked: ${data.name} by ${admin.email}`);

      return res.status(200).json({
        success: true,
        message: 'API Key revocada',
        data: {
          id: data.id,
          name: data.name,
          key_prefix: data.key_prefix,
        },
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error revoking API key:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al revocar API key',
      } as ApiResponse);
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use GET, POST o DELETE',
  } as ApiResponse);
}

/**
 * Determine API key status
 */
function getKeyStatus(key: ApiKeyRow): 'active' | 'expired' | 'revoked' {
  if (!key.is_active) {
    return 'revoked';
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return 'expired';
  }
  return 'active';
}
