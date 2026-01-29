import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from './lib/supabase.js';

interface PublicConfig {
  prontoPagoEnabled: boolean;
  prontoPagoFeeRate: number;
}

/**
 * GET /api/config
 * Get public system configuration (non-sensitive)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use GET request'
    });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get pronto_pago_config
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .eq('key', 'pronto_pago_config')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine - use defaults
      console.error('Config fetch error:', error);
    }

    // Default config if not found
    const prontoPagoConfig = data?.value as { enabled?: boolean; fee_rate?: number } || {
      enabled: true,
      fee_rate: 0.08
    };

    const publicConfig: PublicConfig = {
      prontoPagoEnabled: prontoPagoConfig.enabled ?? true,
      prontoPagoFeeRate: prontoPagoConfig.fee_rate ?? 0.08,
    };

    return res.status(200).json({
      success: true,
      data: publicConfig,
    });

  } catch (error) {
    console.error('Config fetch error:', error);

    // Return defaults on error
    return res.status(200).json({
      success: true,
      data: {
        prontoPagoEnabled: true,
        prontoPagoFeeRate: 0.08,
      } as PublicConfig,
    });
  }
}
