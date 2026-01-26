import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiResponse } from '../lib/types.js';

/**
 * POST /api/admin/logout
 * Clear admin session cookie
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use POST request',
    } as ApiResponse);
  }

  // Clear the cookie
  res.setHeader('Set-Cookie', [
    `admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`,
  ]);

  return res.status(200).json({
    success: true,
    message: 'Sesión cerrada exitosamente',
  } as ApiResponse);
}
