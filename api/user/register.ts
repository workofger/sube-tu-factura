import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  hashPassword, 
  getFlotilleroByEmail,
  generateToken,
  hashToken,
  logAuthEvent 
} from '../lib/userAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

/**
 * POST /api/user/register
 * Register a new user (flotillero/independiente)
 * 
 * Body:
 * - email: string
 * - password: string
 * - rfc: string (required - for matching with existing flotillero)
 * - full_name: string (optional - used if no flotillero exists with this RFC)
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
    const { email, password, rfc, full_name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email y contraseña son requeridos',
      } as ApiResponse);
    }

    if (!rfc) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'RFC es requerido para el registro',
      } as ApiResponse);
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe tener al menos 8 caracteres',
      } as ApiResponse);
    }

    // Validate RFC format
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
    if (!rfcRegex.test(rfc.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Formato de RFC inválido',
      } as ApiResponse);
    }

    const supabase = getSupabaseClient();

    // Check if email already has an account
    const existingByEmail = await getFlotilleroByEmail(email);
    if (existingByEmail && existingByEmail.password_hash) {
      return res.status(409).json({
        success: false,
        error: 'EMAIL_EXISTS',
        message: 'Ya existe una cuenta con este email',
      } as ApiResponse);
    }

    // Look for existing flotillero by RFC
    const { data: existingByRfc, error: rfcError } = await supabase
      .from('flotilleros')
      .select('*')
      .eq('rfc', rfc.toUpperCase())
      .single();

    let flotilleroId: string;

    if (existingByRfc && !rfcError) {
      // Flotillero exists - update with auth info
      if (existingByRfc.password_hash) {
        return res.status(409).json({
          success: false,
          error: 'RFC_REGISTERED',
          message: 'Este RFC ya tiene una cuenta registrada',
        } as ApiResponse);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Generate email verification token
      const verificationToken = generateToken();
      const verificationExpires = new Date();
      verificationExpires.setHours(verificationExpires.getHours() + 24);

      // Update flotillero with auth fields
      const { error: updateError } = await supabase
        .from('flotilleros')
        .update({
          email: email.toLowerCase(),
          password_hash: passwordHash,
          email_verification_token: hashToken(verificationToken),
          email_verification_expires_at: verificationExpires.toISOString(),
        })
        .eq('id', existingByRfc.id);

      if (updateError) {
        throw updateError;
      }

      flotilleroId = existingByRfc.id;
      console.log(`✅ Auth added to existing flotillero: ${rfc}`);

    } else {
      // Create new flotillero
      if (!full_name) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nombre completo es requerido para nuevos registros',
        } as ApiResponse);
      }

      const passwordHash = await hashPassword(password);
      const verificationToken = generateToken();
      const verificationExpires = new Date();
      verificationExpires.setHours(verificationExpires.getHours() + 24);

      const { data: newFlotillero, error: insertError } = await supabase
        .from('flotilleros')
        .insert({
          rfc: rfc.toUpperCase(),
          fiscal_name: full_name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          type: 'independiente',
          status: 'pending_verification',
          email_verification_token: hashToken(verificationToken),
          email_verification_expires_at: verificationExpires.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          return res.status(409).json({
            success: false,
            error: 'RFC_EXISTS',
            message: 'Este RFC ya está registrado',
          } as ApiResponse);
        }
        throw insertError;
      }

      flotilleroId = newFlotillero.id;
      console.log(`✅ New flotillero registered: ${rfc}`);
    }

    // Log registration event
    await logAuthEvent(flotilleroId, 'register', true, req, undefined, { rfc });

    // TODO: Send verification email here
    // For now, just return success

    return res.status(201).json({
      success: true,
      message: 'Registro exitoso. Por favor verifica tu email.',
      data: {
        flotilleroId,
        email: email.toLowerCase(),
        requiresEmailVerification: true,
      },
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al registrar usuario',
    } as ApiResponse);
  }
}
