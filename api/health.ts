import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkConnection as checkSupabase } from './lib/supabase';
import { checkConnection as checkDrive } from './lib/googleDrive';
import { HealthResponse } from './lib/types';

/**
 * GET /api/health
 * Health check endpoint to verify service connections
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Use GET request'
    });
  }

  try {
    // Check service connections in parallel
    const [supabaseOk, driveOk] = await Promise.all([
      checkSupabase().catch(() => false),
      checkDrive().catch(() => false)
    ]);

    const response: HealthResponse = {
      status: supabaseOk && driveOk ? 'healthy' : 
              supabaseOk || driveOk ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseOk ? 'connected' : 'disconnected',
        googleDrive: driveOk ? 'connected' : 'disconnected'
      }
    };

    const statusCode = response.status === 'healthy' ? 200 : 
                       response.status === 'degraded' ? 207 : 503;

    return res.status(statusCode).json(response);

  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: 'error',
        googleDrive: 'error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
