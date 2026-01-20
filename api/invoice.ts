import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  checkUuidExists, 
  upsertDriver, 
  getProject, 
  insertInvoice, 
  insertInvoiceItems,
  saveFileRecord 
} from './lib/supabase.js';
import { uploadInvoiceFiles } from './lib/googleDrive.js';
import { validateInvoicePayload } from './lib/validators.js';
import { InvoicePayload, ApiResponse, InvoiceSuccessData } from './lib/types.js';

/**
 * POST /api/invoice
 * Process and save a complete invoice with files
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
    const payload = req.body as InvoicePayload;

    // Step 1: Validate payload
    console.log('📋 Validating payload...');
    const validation = validateInvoicePayload(payload);
    if (!validation.valid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: validation.errors
      } as ApiResponse);
    }

    // Step 2: Check for duplicate UUID
    console.log('🔍 Checking for duplicate UUID...');
    const { exists, invoiceId: existingId } = await checkUuidExists(payload.invoice.uuid);
    if (exists) {
      console.log('⚠️ Duplicate UUID found:', existingId);
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_INVOICE',
        message: 'Esta factura ya fue registrada anteriormente',
        data: { existingInvoiceId: existingId }
      } as ApiResponse);
    }

    // Step 3: Upsert driver (create or update)
    console.log('👤 Upserting driver...');
    const driver = await upsertDriver(payload);
    console.log('✅ Driver ID:', driver.id);

    // Step 4: Get project
    console.log('📁 Getting project...');
    const project = await getProject(payload.project);
    const projectId = project?.id || null;
    console.log('✅ Project ID:', projectId);

    // Step 5: Insert invoice
    console.log('📝 Inserting invoice...');
    const invoice = await insertInvoice(payload, driver.id, projectId);
    console.log('✅ Invoice ID:', invoice.id);

    // Step 6: Insert line items
    console.log('📋 Inserting line items...');
    await insertInvoiceItems(invoice.id, payload.items);
    console.log('✅ Items inserted');

    // Step 7: Upload files to Google Drive
    let driveResult: {
      folderPath: string;
      xmlFile?: { fileId: string; webViewLink: string };
      pdfFile?: { fileId: string; webViewLink: string };
    } | null = null;

    const hasFiles = payload.files?.xml?.content || payload.files?.pdf?.content;
    
    if (hasFiles) {
      console.log('📤 Uploading files to Google Drive...');
      const invoiceYear = new Date(payload.invoice.date).getFullYear();
      
      try {
        driveResult = await uploadInvoiceFiles(
          payload.week,
          invoiceYear,
          payload.project,
          payload.issuer.rfc,
          payload.issuer.name,
          payload.invoice.uuid,
          payload.files?.xml?.content,
          payload.files?.pdf?.content
        );
        console.log('✅ Files uploaded to:', driveResult.folderPath);

        // Step 8: Save file records to database
        if (driveResult.xmlFile) {
          await saveFileRecord(
            invoice.id,
            'xml',
            `${payload.invoice.uuid}.xml`,
            driveResult.xmlFile.webViewLink,
            driveResult.xmlFile.fileId
          );
        }

        if (driveResult.pdfFile) {
          await saveFileRecord(
            invoice.id,
            'pdf',
            `${payload.invoice.uuid}.pdf`,
            driveResult.pdfFile.webViewLink,
            driveResult.pdfFile.fileId
          );
        }
        console.log('✅ File records saved');

      } catch (driveError) {
        // Log error but don't fail the entire request
        console.error('⚠️ Google Drive upload failed:', driveError);
        // Invoice is already saved, just note the drive failure
      }
    }

    // Build success response
    const responseData: InvoiceSuccessData = {
      invoiceId: invoice.id,
      uuid: payload.invoice.uuid,
      driveFolderPath: driveResult?.folderPath || 'N/A',
      files: {
        xml: driveResult?.xmlFile?.webViewLink,
        pdf: driveResult?.pdfFile?.webViewLink
      }
    };

    console.log('🎉 Invoice processed successfully!');

    return res.status(201).json({
      success: true,
      message: '¡Factura registrada exitosamente!',
      data: responseData
    } as ApiResponse<InvoiceSuccessData>);

  } catch (error) {
    console.error('❌ Invoice processing error:', error);

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      details: [error instanceof Error ? error.message : 'Unknown error']
    } as ApiResponse);
  }
}
