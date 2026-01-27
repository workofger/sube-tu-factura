import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';
import { getSupabaseClient } from './supabase.js';

export interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
}

export type ApiKeyScope = 'public' | 'admin' | 'export' | 'user';

/**
 * Extract API key from request
 * Supports both X-API-Key header and query parameter
 */
export function extractApiKey(req: VercelRequest): string | null {
  // Try header first (preferred)
  const headerKey = req.headers['x-api-key'];
  if (headerKey && typeof headerKey === 'string') {
    return headerKey;
  }

  // Try query parameter as fallback
  const queryKey = req.query.api_key;
  if (queryKey && typeof queryKey === 'string') {
    return queryKey;
  }

  return null;
}

/**
 * Verify API key and return key info if valid
 */
export async function verifyApiKey(req: VercelRequest): Promise<ApiKey | null> {
  const key = extractApiKey(req);
  
  if (!key) {
    return null;
  }

  // Validate format (pk_xxxxx)
  if (!key.startsWith('pk_') || key.length < 20) {
    console.warn('⚠️ Invalid API key format');
    return null;
  }

  const supabase = getSupabaseClient();

  // Hash the key for lookup
  const keyHash = createHash('sha256').update(key).digest('hex');

  // Look up by hash
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, scopes, rate_limit_per_minute, rate_limit_per_day, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    console.warn('⚠️ API key not found');
    return null;
  }

  // Check if active
  if (!data.is_active) {
    console.warn('⚠️ API key is revoked');
    return null;
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    console.warn('⚠️ API key is expired');
    return null;
  }

  // Update last used timestamp and increment counter
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.headers['x-real-ip'] as string || 
                   'unknown';

  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      last_used_ip: clientIp,
      total_requests: (data as Record<string, unknown>).total_requests as number + 1,
    })
    .eq('id', data.id);

  return {
    id: data.id,
    name: data.name,
    scopes: data.scopes,
    rate_limit_per_minute: data.rate_limit_per_minute,
    rate_limit_per_day: data.rate_limit_per_day,
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
  return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('admin');
}

/**
 * Log API key usage for auditing
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  req: VercelRequest
): Promise<void> {
  const supabase = getSupabaseClient();

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.headers['x-real-ip'] as string || 
                   'unknown';

  await supabase
    .from('api_key_usage_log')
    .insert({
      api_key_id: apiKeyId,
      endpoint,
      method,
      status_code: statusCode,
      ip_address: clientIp,
      user_agent: req.headers['user-agent'] || null,
    });
}

/**
 * Middleware to require API key authentication
 * Use for endpoints that should be accessible via API key
 */
export function withApiKeyAuth(
  handler: (req: VercelRequest, res: VercelResponse, apiKey: ApiKey) => Promise<void | VercelResponse>,
  requiredScope?: ApiKeyScope
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const apiKey = await verifyApiKey(req);

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'API key inválida o no proporcionada',
      });
    }

    if (requiredScope && !hasScope(apiKey, requiredScope)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `API key no tiene permiso '${requiredScope}'`,
      });
    }

    return handler(req, res, apiKey);
  };
}

/**
 * Middleware that allows either admin auth or API key auth
 */
export async function verifyAuthOrApiKey(req: VercelRequest): Promise<{
  type: 'admin' | 'api_key' | null;
  admin?: unknown;
  apiKey?: ApiKey;
}> {
  // First try admin auth (for browser/admin panel)
  const { verifyAdminAuth } = await import('./adminAuth.js');
  const admin = await verifyAdminAuth(req);
  
  if (admin) {
    return { type: 'admin', admin };
  }

  // Then try API key (for programmatic access)
  const apiKey = await verifyApiKey(req);
  
  if (apiKey) {
    return { type: 'api_key', apiKey };
  }

  return { type: null };
}
