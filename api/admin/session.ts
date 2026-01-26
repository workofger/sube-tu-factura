import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminAuth } from '../lib/adminAuth.js';
import { ApiResponse } from '../lib/types.js';

interface SessionResponse {
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

/**
 * GET /api/admin/session
 * Verify current session and return admin data
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
    const admin = await verifyAdminAuth(req);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Sesión no válida',
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      message: 'Sesión válida',
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          fullName: admin.full_name,
          role: admin.role,
        },
      },
    } as ApiResponse<SessionResponse>);

  } catch (error) {
    console.error('❌ Session check error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    } as ApiResponse);
  }
}
