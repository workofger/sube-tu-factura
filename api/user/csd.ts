import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../lib/supabase.js';
import { verifyUserJWT, extractUserToken } from '../lib/userAuth.js';
import {
  createOrganization,
  updateOrganizationCSD,
  deleteOrganization,
  getOrganization,
  validateCSDFormat,
  CSDUploadData,
  OrganizationData,
} from '../lib/facturapi.js';

interface CSDUploadPayload {
  cerFile: string;      // Base64 encoded .cer file
  keyFile: string;      // Base64 encoded .key file
  password: string;     // Password for .key file
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

/**
 * CSD Management Endpoints
 * 
 * POST /api/user/csd - Upload CSD files and create Facturapi organization
 * GET /api/user/csd - Get CSD status
 * DELETE /api/user/csd - Remove CSD and delete Facturapi organization
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication
  const token = extractUserToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Token de autenticación requerido',
    } as ApiResponse);
  }

  const userPayload = verifyUserJWT(token);
  if (!userPayload) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token inválido o expirado',
    } as ApiResponse);
  }

  const user = { flotillero_id: userPayload.flotilleroId };

  const supabase = getSupabaseClient();

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetCSDStatus(req, res, user.flotillero_id, supabase);
      
      case 'POST':
        return await handleUploadCSD(req, res, user.flotillero_id, supabase);
      
      case 'DELETE':
        return await handleDeleteCSD(req, res, user.flotillero_id, supabase);
      
      default:
        return res.status(405).json({
          success: false,
          error: 'METHOD_NOT_ALLOWED',
          message: 'Método no permitido',
        } as ApiResponse);
    }
  } catch (error) {
    console.error('❌ CSD endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    } as ApiResponse);
  }
}

/**
 * GET /api/user/csd
 * Get current CSD status for the authenticated flotillero
 */
async function handleGetCSDStatus(
  req: VercelRequest,
  res: VercelResponse,
  flotilleroId: string,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  console.log('📋 Getting CSD status for flotillero:', flotilleroId);

      // Get flotillero data
      const { data: flotillero, error } = await supabase
        .from('flotilleros')
        .select(`
          id,
          rfc,
          fiscal_name,
      fiscal_regime_code,
      fiscal_zip_code,
          facturapi_organization_id,
          csd_uploaded_at,
          csd_valid_until,
          csd_serial_number,
          invoicing_enabled
        `)
    .eq('id', flotilleroId)
        .single();

  if (error || !flotillero) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Flotillero no encontrado',
    } as ApiResponse);
  }

  // Determine CSD status
  let csdStatus: 'none' | 'active' | 'expired' | 'error' = 'none';
  let daysUntilExpiry: number | null = null;

  if (flotillero.facturapi_organization_id && flotillero.csd_valid_until) {
    const validUntil = new Date(flotillero.csd_valid_until);
    const now = new Date();
    
    if (validUntil > now) {
      csdStatus = 'active';
      daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      csdStatus = 'expired';
    }
  }

  // If there's an org ID but no valid_until, try to fetch from Facturapi
  if (flotillero.facturapi_organization_id && !flotillero.csd_valid_until) {
    try {
      const org = await getOrganization(flotillero.facturapi_organization_id);
      if (org && org.certificate) {
        // Update local record with certificate info
        const validUntil = new Date(org.certificate.expires_at);
        await supabase
          .from('flotilleros')
          .update({
            csd_valid_until: validUntil.toISOString().split('T')[0],
            csd_serial_number: org.certificate.serial_number,
          })
          .eq('id', flotilleroId);
        
        if (validUntil > new Date()) {
          csdStatus = 'active';
          daysUntilExpiry = Math.ceil((validUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        } else {
          csdStatus = 'expired';
        }
      }
    } catch {
      csdStatus = 'error';
    }
      }

      return res.status(200).json({
        success: true,
    message: 'Estado del CSD obtenido',
        data: {
      status: csdStatus,
      invoicingEnabled: flotillero.invoicing_enabled || false,
      certificate: flotillero.facturapi_organization_id ? {
        serialNumber: flotillero.csd_serial_number,
        validUntil: flotillero.csd_valid_until,
        daysUntilExpiry,
        uploadedAt: flotillero.csd_uploaded_at,
      } : null,
      fiscalInfo: {
          rfc: flotillero.rfc,
        name: flotillero.fiscal_name,
        regime: flotillero.fiscal_regime_code,
        zipCode: flotillero.fiscal_zip_code,
      },
        },
      } as ApiResponse);
}

/**
 * POST /api/user/csd
 * Upload CSD files and create/update Facturapi organization
 */
async function handleUploadCSD(
  req: VercelRequest,
  res: VercelResponse,
  flotilleroId: string,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  console.log('📤 Uploading CSD for flotillero:', flotilleroId);

  const payload = req.body as CSDUploadPayload;

  // Validate payload
  if (!payload.cerFile || !payload.keyFile || !payload.password) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
      message: 'Se requieren los archivos .cer, .key y la contraseña',
      details: [
        !payload.cerFile ? 'Archivo .cer requerido' : null,
        !payload.keyFile ? 'Archivo .key requerido' : null,
        !payload.password ? 'Contraseña requerida' : null,
      ].filter(Boolean) as string[],
        } as ApiResponse);
      }

  // Validate CSD format
  if (!validateCSDFormat(payload.cerFile, payload.keyFile)) {
        return res.status(400).json({
          success: false,
      error: 'INVALID_CSD',
      message: 'Los archivos CSD no tienen el formato correcto',
        } as ApiResponse);
      }

      // Get flotillero data
      const { data: flotillero, error: flotilleroError } = await supabase
        .from('flotilleros')
    .select('*')
    .eq('id', flotilleroId)
        .single();

      if (flotilleroError || !flotillero) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Flotillero no encontrado',
        } as ApiResponse);
      }

  // Validate required fiscal info
  if (!flotillero.rfc || !flotillero.fiscal_name || !flotillero.fiscal_regime_code || !flotillero.fiscal_zip_code) {
    return res.status(400).json({
      success: false,
      error: 'INCOMPLETE_FISCAL_INFO',
      message: 'Información fiscal incompleta. Actualiza tu perfil con RFC, nombre fiscal, régimen y código postal.',
      details: [
        !flotillero.rfc ? 'RFC requerido' : null,
        !flotillero.fiscal_name ? 'Nombre fiscal requerido' : null,
        !flotillero.fiscal_regime_code ? 'Régimen fiscal requerido' : null,
        !flotillero.fiscal_zip_code ? 'Código postal fiscal requerido' : null,
      ].filter(Boolean) as string[],
    } as ApiResponse);
  }

      const csdData: CSDUploadData = {
    cerFile: payload.cerFile,
    keyFile: payload.keyFile,
    password: payload.password,
  };

  try {
    let certificateInfo: { expires_at: string; serial_number: string };
      let organizationId = flotillero.facturapi_organization_id;

      if (organizationId) {
      // Update existing organization's CSD
      console.log('🔄 Updating existing organization CSD');
      certificateInfo = await updateOrganizationCSD(organizationId, csdData);
      } else {
      // Create new organization
      console.log('✨ Creating new Facturapi organization');
      const orgData: OrganizationData = {
        name: flotillero.trade_name || flotillero.fiscal_name,
          legal_name: flotillero.fiscal_name,
          tax_id: flotillero.rfc,
        tax_system: flotillero.fiscal_regime_code,
          address: {
          zip: flotillero.fiscal_zip_code,
        },
        email: flotillero.email,
        phone: flotillero.phone,
      };

      const result = await createOrganization(orgData, csdData);
      organizationId = result.id;
      certificateInfo = result.certificate!;
    }

    // Update flotillero record
      const { error: updateError } = await supabase
        .from('flotilleros')
        .update({
          facturapi_organization_id: organizationId,
          csd_uploaded_at: new Date().toISOString(),
        csd_valid_until: certificateInfo.expires_at.split('T')[0],
        csd_serial_number: certificateInfo.serial_number,
          invoicing_enabled: true,
        })
      .eq('id', flotilleroId);

      if (updateError) {
      console.error('❌ Failed to update flotillero:', updateError);
      // Still return success since Facturapi operation succeeded
      }

    const validUntil = new Date(certificateInfo.expires_at);
    const daysUntilExpiry = Math.ceil((validUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      return res.status(200).json({
        success: true,
        message: 'CSD cargado exitosamente. Ya puedes emitir facturas.',
        data: {
        status: 'active',
        invoicingEnabled: true,
        certificate: {
          serialNumber: certificateInfo.serial_number,
          validUntil: certificateInfo.expires_at.split('T')[0],
          daysUntilExpiry,
          uploadedAt: new Date().toISOString(),
        },
        },
      } as ApiResponse);

  } catch (error) {
    console.error('❌ Facturapi error:', error);
    
    // Parse Facturapi error message
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    let userMessage = 'Error al procesar los archivos CSD';
    
    if (errorMessage.includes('password') || errorMessage.includes('contraseña')) {
      userMessage = 'Contraseña incorrecta para el archivo .key';
    } else if (errorMessage.includes('expired') || errorMessage.includes('vencido')) {
      userMessage = 'El certificado CSD está vencido';
    } else if (errorMessage.includes('invalid') || errorMessage.includes('inválido')) {
      userMessage = 'Los archivos CSD no son válidos o no coinciden';
    } else if (errorMessage.includes('RFC') || errorMessage.includes('tax_id')) {
      userMessage = 'El RFC del certificado no coincide con tu RFC registrado';
      }

      return res.status(400).json({
        success: false,
      error: 'CSD_UPLOAD_FAILED',
      message: userMessage,
      details: [errorMessage],
      } as ApiResponse);
    }
  }

/**
 * DELETE /api/user/csd
 * Remove CSD and delete Facturapi organization
 */
async function handleDeleteCSD(
  req: VercelRequest,
  res: VercelResponse,
  flotilleroId: string,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  console.log('🗑️ Deleting CSD for flotillero:', flotilleroId);

      // Get flotillero data
  const { data: flotillero, error: flotilleroError } = await supabase
        .from('flotilleros')
    .select('facturapi_organization_id')
    .eq('id', flotilleroId)
        .single();

  if (flotilleroError || !flotillero) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Flotillero no encontrado',
        } as ApiResponse);
      }

      if (!flotillero.facturapi_organization_id) {
        return res.status(400).json({
          success: false,
          error: 'NO_CSD',
      message: 'No hay CSD configurado para eliminar',
        } as ApiResponse);
      }

  try {
    // Delete organization in Facturapi
    await deleteOrganization(flotillero.facturapi_organization_id);

    // Update flotillero record
      const { error: updateError } = await supabase
        .from('flotilleros')
        .update({
        facturapi_organization_id: null,
          csd_uploaded_at: null,
          csd_valid_until: null,
          csd_serial_number: null,
          invoicing_enabled: false,
        })
      .eq('id', flotilleroId);

      if (updateError) {
      console.error('❌ Failed to update flotillero:', updateError);
      }

      return res.status(200).json({
        success: true,
      message: 'CSD eliminado exitosamente',
      data: {
        status: 'none',
        invoicingEnabled: false,
        certificate: null,
      },
      } as ApiResponse);

    } catch (error) {
    console.error('❌ Failed to delete organization:', error);
      return res.status(500).json({
        success: false,
      error: 'DELETE_FAILED',
      message: 'Error al eliminar el CSD',
      details: [error instanceof Error ? error.message : 'Unknown error'],
      } as ApiResponse);
    }
}
