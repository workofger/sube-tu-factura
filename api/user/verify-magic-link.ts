import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  verifyMagicLink,
  createUserJWT,
  logAuthEvent 
} from '../lib/userAuth.js';
import { ApiResponse } from '../lib/types.js';

/**
 * GET /api/user/verify-magic-link
 * Verify magic link token and authenticate user
 * 
 * Query params:
 * - token: string
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Token es requerido',
      } as ApiResponse);
    }

    // Verify magic link
    const user = await verifyMagicLink(token);

    if (!user) {
      await logAuthEvent(null, 'magic_link_failed', false, req, 'Invalid or expired token');
      
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Enlace inválido o expirado. Solicita uno nuevo.',
      } as ApiResponse);
    }

    // Check account status
    if (user.status !== 'active' && user.status !== 'pending_verification') {
      await logAuthEvent(user.id, 'magic_link_inactive', false, req, `Account status: ${user.status}`);
      
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'Tu cuenta no está activa. Contacta a soporte.',
      } as ApiResponse);
    }

    // Generate JWT
    const jwtToken = createUserJWT({
      flotilleroId: user.id,
      rfc: user.rfc,
      email: user.email,
      type: user.type,
    });

    // Log successful login
    await logAuthEvent(user.id, 'magic_link_login', true, req);

    // Set cookie
    res.setHeader('Set-Cookie', 
      `user_token=${jwtToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    console.log(`✅ User logged in via magic link: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: user.id,
          rfc: user.rfc,
          fiscal_name: user.fiscal_name,
          email: user.email,
          type: user.type,
        },
        token: jwtToken,
      },
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Magic link verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al verificar enlace',
    } as ApiResponse);
  }
}
