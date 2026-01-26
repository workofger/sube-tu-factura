import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateAdminCredentials, createJWT } from '../lib/adminAuth.js';
import { ApiResponse } from '../lib/types.js';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  expiresIn: number;
}

/**
 * POST /api/admin/login
 * Authenticate admin user and return JWT token
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

  try {
    const { email, password } = req.body as LoginRequest;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email y contraseña son requeridos',
      } as ApiResponse);
    }

    console.log('🔐 Login attempt for:', email);

    // Validate credentials
    const admin = await validateAdminCredentials(email, password);

    if (!admin) {
      console.log('❌ Login failed for:', email);
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas',
      } as ApiResponse);
    }

    // Create JWT token
    const token = createJWT({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    console.log('✅ Login successful for:', email);

    // Set httpOnly cookie for better security
    res.setHeader('Set-Cookie', [
      `admin_token=${token}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    ]);

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          fullName: admin.full_name,
          role: admin.role,
        },
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
      },
    } as ApiResponse<LoginResponse>);

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    } as ApiResponse);
  }
}
