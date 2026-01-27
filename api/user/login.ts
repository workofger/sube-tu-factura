import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  validateUserCredentials, 
  createUserJWT, 
  logAuthEvent 
} from '../lib/userAuth.js';
import { ApiResponse } from '../lib/types.js';

/**
 * POST /api/user/login
 * Login with email and password
 * 
 * Body:
 * - email: string
 * - password: string
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email y contraseña son requeridos',
      } as ApiResponse);
    }

    // Validate credentials
    const user = await validateUserCredentials(email, password);

    if (!user) {
      await logAuthEvent(null, 'failed_login', false, req, 'Invalid credentials', { email });
      
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email o contraseña incorrectos',
      } as ApiResponse);
    }

    // Check if email is verified
    if (!user.email_verified) {
      await logAuthEvent(user.id, 'login_unverified', false, req, 'Email not verified');
      
      return res.status(403).json({
        success: false,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Por favor verifica tu email antes de iniciar sesión',
      } as ApiResponse);
    }

    // Check account status
    if (user.status !== 'active') {
      await logAuthEvent(user.id, 'login_inactive', false, req, `Account status: ${user.status}`);
      
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'Tu cuenta no está activa. Contacta a soporte.',
      } as ApiResponse);
    }

    // Generate JWT
    const token = createUserJWT({
      flotilleroId: user.id,
      rfc: user.rfc,
      email: user.email,
      type: user.type,
    });

    // Log successful login
    await logAuthEvent(user.id, 'login', true, req);

    // Set cookie
    res.setHeader('Set-Cookie', 
      `user_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    console.log(`✅ User logged in: ${user.email}`);

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
        token,
      },
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al iniciar sesión',
    } as ApiResponse);
  }
}
