import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  createMagicLink,
  getFlotilleroByEmail,
  logAuthEvent 
} from '../lib/userAuth.js';
import { ApiResponse } from '../lib/types.js';

/**
 * POST /api/user/magic-link
 * Request a magic link for passwordless login
 * 
 * Body:
 * - email: string
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email es requerido',
      } as ApiResponse);
    }

    // Check if user exists
    const user = await getFlotilleroByEmail(email);
    
    // Always return success to prevent email enumeration
    // But only actually send if user exists
    if (!user) {
      console.log(`⚠️ Magic link requested for non-existent email: ${email}`);
      // Still return success to prevent enumeration
      return res.status(200).json({
        success: true,
        message: 'Si tu email está registrado, recibirás un enlace de acceso.',
      } as ApiResponse);
    }

    // Create magic link
    const result = await createMagicLink(email);
    
    if (!result) {
      console.error('❌ Failed to create magic link for:', email);
      return res.status(200).json({
        success: true,
        message: 'Si tu email está registrado, recibirás un enlace de acceso.',
      } as ApiResponse);
    }

    // Log event
    await logAuthEvent(user.id, 'magic_link_requested', true, req);

    // TODO: Send email with magic link
    // The link would be: https://yourapp.com/auth/magic-link?token={result.token}
    const magicLinkUrl = `${process.env.APP_URL || 'https://sube-tu-factura.vercel.app'}/auth/magic-link?token=${result.token}`;
    
    console.log(`🔗 Magic link created for ${email}:`);
    console.log(`   URL: ${magicLinkUrl}`);
    console.log(`   Expires: ${result.expiresAt.toISOString()}`);

    // In development, return the token for testing
    const isDev = process.env.NODE_ENV === 'development';

    return res.status(200).json({
      success: true,
      message: 'Si tu email está registrado, recibirás un enlace de acceso.',
      // Only include debug info in development
      ...(isDev && { 
        debug: { 
          token: result.token,
          url: magicLinkUrl,
          expiresAt: result.expiresAt.toISOString(),
        } 
      }),
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Magic link error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al procesar solicitud',
    } as ApiResponse);
  }
}
