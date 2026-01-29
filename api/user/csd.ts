import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUserAuth } from '../lib/userAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';
import {
  createOrganization,
  uploadCertificate,
  getOrganization,
  deleteCertificate,
  deleteOrganization,
  CSDUploadData,
} from '../lib/facturapi.js';

interface CSDUploadBody {
  cerFile: string;    // Base64 encoded .cer file
  keyFile: string;    // Base64 encoded .key file
  password: string;   // Password for the .key file
  taxSystem: string;  // Regimen fiscal (e.g., "601", "612")
  postalCode: string; // Codigo postal
}

/**
 * /api/user/csd
 * POST - Upload CSD certificates (create or update)
 * GET - Get CSD status
 * DELETE - Remove CSD and Facturapi organization
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

  // ============================================
  // GET - Get CSD status
  // ============================================
  if (req.method === 'GET') {
    try {
      // Get flotillero data
      const { data: flotillero, error } = await supabase
        .from('flotilleros')
        .select(`
          id,
          rfc,
          fiscal_name,
          facturapi_organization_id,
          csd_uploaded_at,
          csd_valid_until,
          csd_serial_number,
          invoicing_enabled
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      // If has Facturapi org, get real-time status
      let facturApiStatus = null;
      if (flotillero.facturapi_organization_id) {
        try {
          const orgDetails = await getOrganization(flotillero.facturapi_organization_id);
          facturApiStatus = {
            is_production_ready: orgDetails.is_production_ready,
            has_certificate: orgDetails.has_certificate,
            certificate_serial_number: orgDetails.certificate_serial_number,
            certificate_expires_at: orgDetails.certificate_expires_at,
          };
        } catch (facturApiError) {
          console.warn('⚠️ Could not fetch Facturapi org status:', facturApiError);
        }
      }

      // Determine overall status
      let status: 'none' | 'active' | 'expired' | 'error' = 'none';
      if (flotillero.invoicing_enabled && facturApiStatus?.has_certificate) {
        const expiresAt = facturApiStatus.certificate_expires_at 
          ? new Date(facturApiStatus.certificate_expires_at) 
          : null;
        if (expiresAt && expiresAt > new Date()) {
          status = 'active';
        } else {
          status = 'expired';
        }
      } else if (flotillero.facturapi_organization_id && !facturApiStatus?.has_certificate) {
        status = 'error';
      }

      return res.status(200).json({
        success: true,
        data: {
          status,
          rfc: flotillero.rfc,
          fiscal_name: flotillero.fiscal_name,
          invoicing_enabled: flotillero.invoicing_enabled,
          csd: {
            uploaded_at: flotillero.csd_uploaded_at,
            valid_until: flotillero.csd_valid_until,
            serial_number: flotillero.csd_serial_number,
          },
          facturapi: facturApiStatus,
        },
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error fetching CSD status:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al obtener estado del CSD',
      } as ApiResponse);
    }
  }

  // ============================================
  // POST - Upload CSD certificates
  // ============================================
  if (req.method === 'POST') {
    try {
      const body = req.body as CSDUploadBody;

      // Validate required fields
      if (!body.cerFile || !body.keyFile || !body.password) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Se requieren archivos .cer, .key y contraseña',
        } as ApiResponse);
      }

      if (!body.taxSystem || !body.postalCode) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Se requiere régimen fiscal y código postal',
        } as ApiResponse);
      }

      // Get flotillero data
      const { data: flotillero, error: flotilleroError } = await supabase
        .from('flotilleros')
        .select('id, rfc, fiscal_name, facturapi_organization_id')
        .eq('id', user.id)
        .single();

      if (flotilleroError || !flotillero) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Flotillero no encontrado',
        } as ApiResponse);
      }

      // Convert base64 to Buffer
      const cerBuffer = Buffer.from(body.cerFile, 'base64');
      const keyBuffer = Buffer.from(body.keyFile, 'base64');

      const csdData: CSDUploadData = {
        cerFile: cerBuffer,
        keyFile: keyBuffer,
        password: body.password,
      };

      let organizationId = flotillero.facturapi_organization_id;
      let certificateResult: { serial_number: string; expires_at: string };

      // If organization exists, just update the certificate
      if (organizationId) {
        console.log('📋 Updating CSD for existing organization:', organizationId);
        certificateResult = await uploadCertificate(organizationId, csdData);
      } else {
        // Create new organization in Facturapi
        console.log('📋 Creating new Facturapi organization for:', flotillero.rfc);
        
        const orgResult = await createOrganization({
          name: flotillero.fiscal_name,
          legal_name: flotillero.fiscal_name,
          tax_id: flotillero.rfc,
          tax_system: body.taxSystem,
          address: {
            zip: body.postalCode,
          },
        });
        
        organizationId = orgResult.id;
        
        // Now upload the certificate
        certificateResult = await uploadCertificate(organizationId, csdData);
      }

      // Parse expiration date
      const expiresAt = certificateResult.expires_at 
        ? new Date(certificateResult.expires_at) 
        : null;

      // Update flotillero in database
      const { error: updateError } = await supabase
        .from('flotilleros')
        .update({
          facturapi_organization_id: organizationId,
          csd_uploaded_at: new Date().toISOString(),
          csd_valid_until: expiresAt?.toISOString().split('T')[0] || null,
          csd_serial_number: certificateResult.serial_number,
          invoicing_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating flotillero with CSD info:', updateError);
        // Don't fail - the Facturapi org was created successfully
      }

      console.log(`✅ CSD uploaded successfully for ${flotillero.rfc}`);

      return res.status(200).json({
        success: true,
        message: 'CSD cargado exitosamente. Ya puedes emitir facturas.',
        data: {
          organization_id: organizationId,
          serial_number: certificateResult.serial_number,
          valid_until: expiresAt?.toISOString().split('T')[0] || null,
          invoicing_enabled: true,
        },
      } as ApiResponse);

    } catch (error: any) {
      console.error('❌ Error uploading CSD:', error);
      
      // Check for specific Facturapi errors
      let errorMessage = 'Error al cargar CSD';
      if (error.message?.includes('password')) {
        errorMessage = 'Contraseña del archivo .key incorrecta';
      } else if (error.message?.includes('expired')) {
        errorMessage = 'El certificado CSD ha expirado';
      } else if (error.message?.includes('tax_id') || error.message?.includes('RFC')) {
        errorMessage = 'El RFC del certificado no coincide con tu registro';
      }

      return res.status(400).json({
        success: false,
        error: 'CSD_ERROR',
        message: errorMessage,
        details: error.message,
      } as ApiResponse);
    }
  }

  // ============================================
  // DELETE - Remove CSD
  // ============================================
  if (req.method === 'DELETE') {
    try {
      // Get flotillero data
      const { data: flotillero, error } = await supabase
        .from('flotilleros')
        .select('id, facturapi_organization_id, invoicing_enabled')
        .eq('id', user.id)
        .single();

      if (error || !flotillero) {
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
          message: 'No tienes un CSD cargado',
        } as ApiResponse);
      }

      // Check if user has pending invoices
      const { count: pendingInvoices } = await supabase
        .from('issued_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('flotillero_id', user.id)
        .eq('status', 'pending');

      if ((pendingInvoices || 0) > 0) {
        return res.status(400).json({
          success: false,
          error: 'PENDING_INVOICES',
          message: 'No puedes eliminar tu CSD mientras tengas facturas pendientes',
        } as ApiResponse);
      }

      // Delete certificate from Facturapi (but keep the organization for records)
      try {
        await deleteCertificate(flotillero.facturapi_organization_id);
      } catch (facturApiError) {
        console.warn('⚠️ Could not delete certificate from Facturapi:', facturApiError);
        // Continue anyway - might already be deleted
      }

      // Update flotillero in database
      const { error: updateError } = await supabase
        .from('flotilleros')
        .update({
          // Keep facturapi_organization_id for historical records
          csd_uploaded_at: null,
          csd_valid_until: null,
          csd_serial_number: null,
          invoicing_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ CSD removed for user ${user.id}`);

      return res.status(200).json({
        success: true,
        message: 'CSD eliminado. Ya no podrás emitir facturas hasta que cargues uno nuevo.',
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error deleting CSD:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error al eliminar CSD',
      } as ApiResponse);
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use GET, POST o DELETE',
  } as ApiResponse);
}
