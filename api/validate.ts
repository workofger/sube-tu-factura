import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkUuidExists } from './lib/supabase';
import { validateUuidRequest } from './lib/validators';
import { ValidateResponse, ApiResponse } from './lib/types';

/**
 * POST /api/validate
 * Check if an invoice UUID already exists in the database
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use POST request'
    } as ApiResponse);
  }

  try {
    const body = req.body as { uuid?: string };

    // Validate request
    const validation = validateUuidRequest(body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: validation.errors
      } as ApiResponse);
    }

    // Check if UUID exists
    const { exists, invoiceId } = await checkUuidExists(body.uuid!);

    const response: ValidateResponse = {
      exists,
      message: exists 
        ? 'Esta factura ya está registrada en el sistema' 
        : 'UUID disponible para registro',
      existingInvoiceId: invoiceId
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Validation error:', error);

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      details: [error instanceof Error ? error.message : 'Unknown error']
    } as ApiResponse);
  }
}
