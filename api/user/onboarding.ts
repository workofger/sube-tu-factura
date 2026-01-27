import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth, hashPassword, verifyPassword } from '../lib/userAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface OnboardingStatus {
  currentStep: string;
  steps: {
    verify_email: { completed: boolean; required: boolean };
    bank_info: { completed: boolean; required: boolean };
    profile_info: { completed: boolean; required: boolean };
    change_password: { completed: boolean; required: boolean };
  };
  isComplete: boolean;
  canComplete: boolean;
  user: {
    email: string;
    email_verified: boolean;
    rfc: string | null;
    fiscal_name: string | null;
    phone: string | null;
    address: string | null;
    bank_name: string | null;
    bank_clabe: string | null;
    requires_password_change: boolean;
  };
}

/**
 * /api/user/onboarding
 * 
 * GET - Get onboarding status and next step
 * PUT - Update onboarding step (bank, profile, password)
 * POST - Complete onboarding
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication
  const user = await verifyUserAuth(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'No autorizado. Inicia sesión.',
    } as ApiResponse);
  }

  const supabase = getSupabaseClient();

  // ========== GET - Onboarding status ==========
  if (req.method === 'GET') {
    try {
      const { data: flotillero, error } = await supabase
        .from('flotilleros')
        .select(`
          email,
          email_verified,
          rfc,
          fiscal_name,
          phone,
          address,
          bank_name,
          bank_clabe,
          bank_account_number,
          bank_institution_id,
          requires_password_change,
          onboarding_completed,
          onboarding_step
        `)
        .eq('id', user.id)
        .single();

      if (error || !flotillero) {
        throw error || new Error('User not found');
      }

      // Determine step completion
      const steps = {
        verify_email: {
          completed: flotillero.email_verified === true,
          required: true,
        },
        bank_info: {
          completed: !!(flotillero.bank_clabe && flotillero.bank_name),
          required: true,
        },
        profile_info: {
          completed: !!(flotillero.rfc && flotillero.fiscal_name && flotillero.phone && flotillero.address),
          required: true,
        },
        change_password: {
          completed: flotillero.requires_password_change === false,
          required: flotillero.requires_password_change === true,
        },
      };

      // Determine current step
      let currentStep = 'completed';
      if (!steps.verify_email.completed) {
        currentStep = 'verify_email';
      } else if (!steps.bank_info.completed) {
        currentStep = 'bank_info';
      } else if (!steps.profile_info.completed) {
        currentStep = 'profile_info';
      } else if (steps.change_password.required && !steps.change_password.completed) {
        currentStep = 'change_password';
      }

      const canComplete = 
        steps.verify_email.completed &&
        steps.bank_info.completed &&
        steps.profile_info.completed &&
        (!steps.change_password.required || steps.change_password.completed);

      const status: OnboardingStatus = {
        currentStep,
        steps,
        isComplete: flotillero.onboarding_completed === true,
        canComplete,
        user: {
          email: flotillero.email,
          email_verified: flotillero.email_verified,
          rfc: flotillero.rfc,
          fiscal_name: flotillero.fiscal_name,
          phone: flotillero.phone,
          address: flotillero.address,
          bank_name: flotillero.bank_name,
          bank_clabe: flotillero.bank_clabe ? maskClabe(flotillero.bank_clabe) : null,
          requires_password_change: flotillero.requires_password_change,
        },
      };

      return res.status(200).json({
        success: true,
        data: status,
      } as ApiResponse<OnboardingStatus>);

    } catch (error) {
      console.error('❌ Error getting onboarding status:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al obtener estado de onboarding',
      } as ApiResponse);
    }
  }

  // ========== PUT - Update step ==========
  if (req.method === 'PUT') {
    const { step } = req.query;

    if (!step || !['bank', 'profile', 'password'].includes(step as string)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Paso inválido. Use: bank, profile, password',
      } as ApiResponse);
    }

    try {
      // ===== Bank Info Step =====
      if (step === 'bank') {
        const { bank_name, bank_clabe, bank_account_number, bank_institution_id } = req.body;

        // Validate CLABE
        if (!bank_clabe || bank_clabe.length !== 18) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'CLABE debe tener exactamente 18 dígitos',
          } as ApiResponse);
        }

        if (!/^\d{18}$/.test(bank_clabe)) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'CLABE debe contener solo números',
          } as ApiResponse);
        }

        if (!bank_name) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Nombre del banco es requerido',
          } as ApiResponse);
        }

        const { error } = await supabase
          .from('flotilleros')
          .update({
            bank_name,
            bank_clabe,
            bank_account_number: bank_account_number || null,
            bank_institution_id: bank_institution_id || null,
            onboarding_step: 'bank_info_completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;

        console.log(`✅ Bank info updated for: ${user.email}`);

        return res.status(200).json({
          success: true,
          message: 'Información bancaria guardada',
        } as ApiResponse);
      }

      // ===== Profile Info Step =====
      if (step === 'profile') {
        const { rfc, fiscal_name, phone, address, trade_name } = req.body;

        // Validate RFC
        if (!rfc) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'RFC es requerido',
          } as ApiResponse);
        }

        const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
        if (!rfcRegex.test(rfc.toUpperCase())) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Formato de RFC inválido',
          } as ApiResponse);
        }

        if (!fiscal_name) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Nombre o razón social es requerido',
          } as ApiResponse);
        }

        if (!phone) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Teléfono es requerido',
          } as ApiResponse);
        }

        if (!address) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Dirección es requerida',
          } as ApiResponse);
        }

        // Check if RFC is already used by another user
        const { data: existingRfc } = await supabase
          .from('flotilleros')
          .select('id')
          .eq('rfc', rfc.toUpperCase())
          .neq('id', user.id)
          .single();

        if (existingRfc) {
          return res.status(409).json({
            success: false,
            error: 'RFC_EXISTS',
            message: 'Este RFC ya está registrado por otro usuario',
          } as ApiResponse);
        }

        const { error } = await supabase
          .from('flotilleros')
          .update({
            rfc: rfc.toUpperCase(),
            fiscal_name,
            phone,
            address,
            trade_name: trade_name || null,
            onboarding_step: 'profile_completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;

        console.log(`✅ Profile info updated for: ${user.email}`);

        return res.status(200).json({
          success: true,
          message: 'Información de perfil guardada',
        } as ApiResponse);
      }

      // ===== Password Change Step =====
      if (step === 'password') {
        const { current_password, new_password } = req.body;

        // Get current user with temp password
        const { data: flotillero, error: fetchError } = await supabase
          .from('flotilleros')
          .select('password_hash, temp_password_hash, requires_password_change')
          .eq('id', user.id)
          .single();

        if (fetchError || !flotillero) {
          throw fetchError || new Error('User not found');
        }

        if (!flotillero.requires_password_change) {
          return res.status(400).json({
            success: false,
            error: 'NOT_REQUIRED',
            message: 'No se requiere cambio de contraseña',
          } as ApiResponse);
        }

        if (!current_password || !new_password) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Contraseña actual y nueva son requeridas',
          } as ApiResponse);
        }

        if (new_password.length < 8) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'La nueva contraseña debe tener al menos 8 caracteres',
          } as ApiResponse);
        }

        // Verify current password (can be temp or regular)
        const validTempPassword = flotillero.temp_password_hash 
          ? await verifyPassword(current_password, flotillero.temp_password_hash)
          : false;
        const validRegularPassword = flotillero.password_hash
          ? await verifyPassword(current_password, flotillero.password_hash)
          : false;

        if (!validTempPassword && !validRegularPassword) {
          return res.status(401).json({
            success: false,
            error: 'INVALID_PASSWORD',
            message: 'Contraseña actual incorrecta',
          } as ApiResponse);
        }

        // Hash new password
        const newPasswordHash = await hashPassword(new_password);

        const { error } = await supabase
          .from('flotilleros')
          .update({
            password_hash: newPasswordHash,
            temp_password_hash: null,
            requires_password_change: false,
            onboarding_step: 'password_changed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;

        console.log(`✅ Password changed for: ${user.email}`);

        return res.status(200).json({
          success: true,
          message: 'Contraseña actualizada correctamente',
        } as ApiResponse);
      }

    } catch (error) {
      console.error('❌ Error updating onboarding step:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al actualizar información',
      } as ApiResponse);
    }
  }

  // ========== POST - Complete onboarding ==========
  if (req.method === 'POST') {
    try {
      // Get current user status
      const { data: flotillero, error: fetchError } = await supabase
        .from('flotilleros')
        .select(`
          email_verified,
          bank_clabe,
          bank_name,
          rfc,
          fiscal_name,
          phone,
          address,
          requires_password_change
        `)
        .eq('id', user.id)
        .single();

      if (fetchError || !flotillero) {
        throw fetchError || new Error('User not found');
      }

      // Verify all steps are complete
      const errors: string[] = [];

      if (!flotillero.email_verified) {
        errors.push('Email no verificado');
      }
      if (!flotillero.bank_clabe || !flotillero.bank_name) {
        errors.push('Información bancaria incompleta');
      }
      if (!flotillero.rfc || !flotillero.fiscal_name || !flotillero.phone || !flotillero.address) {
        errors.push('Información de perfil incompleta');
      }
      if (flotillero.requires_password_change) {
        errors.push('Cambio de contraseña pendiente');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'INCOMPLETE_ONBOARDING',
          message: 'Onboarding incompleto',
          details: errors,
        } as ApiResponse);
      }

      // Mark onboarding as complete
      const { error } = await supabase
        .from('flotilleros')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 'completed',
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log(`✅ Onboarding completed for: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: '¡Onboarding completado! Ya puedes usar el portal.',
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al completar onboarding',
      } as ApiResponse);
    }
  }

  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Método no permitido',
  } as ApiResponse);
}

// Helper to mask CLABE for display
function maskClabe(clabe: string): string {
  if (!clabe || clabe.length !== 18) return clabe;
  return `****${clabe.slice(-4)}`;
}
