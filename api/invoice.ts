import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  checkUuidExists, 
  upsertDriver, 
  getProject, 
  insertInvoice, 
  insertInvoiceItems,
  saveFileRecord,
  updateFileRecord,
  insertCreditNote,
  saveCreditNoteFileRecord
} from './lib/supabase.js';
import { uploadInvoiceToStorage, uploadCreditNoteToStorage } from './lib/storage.js';
import { uploadInvoiceFiles, uploadCreditNoteFiles } from './lib/googleDrive.js';
import { validateInvoicePayload } from './lib/validators.js';
import { InvoicePayload, ApiResponse, InvoiceSuccessData } from './lib/types.js';
import { applySecurityMiddleware } from './lib/rateLimit.js';

/**
 * POST /api/invoice
 * Process and save a complete invoice with files
 * 
 * File storage strategy:
 * 1. First upload to Supabase Storage (primary/guaranteed)
 * 2. Save file reference to database
 * 3. Then attempt Google Drive upload (backup/optional)
 * 4. If Drive succeeds, update reference with Drive URL
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

  // Apply security middleware (rate limiting + origin validation)
  if (!applySecurityMiddleware(req, res)) {
    return; // Response already sent by middleware
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

    // Step 7: Upload files
    const hasXml = payload.files?.xml?.content;
    const hasPdf = payload.files?.pdf?.content;
    const invoiceYear = new Date(payload.invoice.date).getFullYear();
    
    console.log('📦 Files received:', { 
      hasXml: !!hasXml, 
      xmlSize: hasXml ? hasXml.length : 0,
      hasPdf: !!hasPdf, 
      pdfSize: hasPdf ? hasPdf.length : 0 
    });

    let storageResult: {
      xmlFile?: { path: string; publicUrl: string };
      pdfFile?: { path: string; publicUrl: string };
    } = {};

    let driveResult: {
      folderPath: string;
      xmlFile?: { fileId: string; webViewLink: string };
      pdfFile?: { fileId: string; webViewLink: string };
    } | null = null;

    if (hasXml || hasPdf) {
      // ===== STEP 7A: Upload to Supabase Storage (PRIMARY) =====
      console.log('📤 [1/2] Uploading files to Supabase Storage...');
      try {
        storageResult = await uploadInvoiceToStorage(
          payload.week,
          invoiceYear,
          payload.project,
          payload.issuer.rfc,
          payload.invoice.uuid,
          hasXml,
          hasPdf
        );
        
        console.log('✅ Files uploaded to Supabase Storage');
        
        // Save file records to database with Supabase Storage URLs
        if (storageResult.xmlFile) {
          console.log('💾 Saving XML file record (Supabase)...');
          await saveFileRecord(
            invoice.id,
            'xml',
            `${payload.invoice.uuid}.xml`,
            storageResult.xmlFile.publicUrl,
            storageResult.xmlFile.path // Use path as reference
          );
        }

        if (storageResult.pdfFile) {
          console.log('💾 Saving PDF file record (Supabase)...');
          await saveFileRecord(
            invoice.id,
            'pdf',
            `${payload.invoice.uuid}.pdf`,
            storageResult.pdfFile.publicUrl,
            storageResult.pdfFile.path // Use path as reference
          );
        }
        console.log('✅ File records saved to database');
        
      } catch (storageError) {
        console.error('❌ Supabase Storage error:', storageError);
        const err = storageError as Error;
        console.error('   Message:', err.message);
        // Continue to try Google Drive as fallback
      }

      // ===== STEP 7B: Upload to Google Drive (BACKUP) =====
      console.log('📤 [2/2] Attempting Google Drive upload (backup)...');
      const isLate = payload.isLate || false;
      if (isLate) {
        console.log('⚠️ Late invoice - will be stored in Extemporaneas folder');
      }
      try {
        driveResult = await uploadInvoiceFiles(
          payload.week,
          payload.year || invoiceYear,
          payload.project,
          payload.issuer.rfc,
          payload.issuer.name,
          payload.invoice.uuid,
          hasXml,
          hasPdf,
          isLate // Pass late invoice flag for Extemporaneas folder
        );
        
        console.log('✅ Files uploaded to Google Drive:', driveResult.folderPath);

        // Update file records with Google Drive URLs if Drive upload succeeded
        if (driveResult.xmlFile) {
          console.log('📝 Updating XML record with Drive URL...');
          await updateFileRecord(
            invoice.id,
            'xml',
            driveResult.xmlFile.webViewLink,
            driveResult.xmlFile.fileId
          );
        }

        if (driveResult.pdfFile) {
          console.log('📝 Updating PDF record with Drive URL...');
          await updateFileRecord(
            invoice.id,
            'pdf',
            driveResult.pdfFile.webViewLink,
            driveResult.pdfFile.fileId
          );
        }
        console.log('✅ File records updated with Drive URLs');

      } catch (driveError) {
        // Google Drive failed but files are safe in Supabase Storage
        console.warn('⚠️ Google Drive upload failed (files safe in Supabase):', (driveError as Error).message);
      }
    } else {
      console.log('⚠️ No file content received in payload');
    }

    // ===== STEP 8: Process Credit Note (for Pronto Pago) =====
    let creditNoteResult: {
      id?: string;
      uuid?: string;
      files?: {
        xml?: string;
        pdf?: string;
      };
    } | undefined;

    if (payload.paymentProgram?.program === 'pronto_pago' && payload.creditNote) {
      console.log('📄 Processing credit note for Pronto Pago...');
      
      try {
        // Insert credit note record
        const creditNote = await insertCreditNote(invoice.id, payload.creditNote);
        console.log('✅ Credit note inserted with ID:', creditNote.id);
        
        creditNoteResult = {
          id: creditNote.id,
          uuid: payload.creditNote.uuid,
          files: {},
        };
        
        const hasCreditNoteXml = payload.creditNote.files?.xml?.content;
        const hasCreditNotePdf = payload.creditNote.files?.pdf?.content;
        
        if (hasCreditNoteXml || hasCreditNotePdf) {
          // Upload credit note files to Supabase Storage
          console.log('📤 Uploading credit note files to Supabase Storage...');
          try {
            const creditNoteStorageResult = await uploadCreditNoteToStorage(
              payload.week,
              invoiceYear,
              payload.project,
              payload.issuer.rfc,
              payload.creditNote.uuid,
              hasCreditNoteXml,
              hasCreditNotePdf
            );
            
            if (creditNoteStorageResult.xmlFile) {
              await saveCreditNoteFileRecord(
                invoice.id,
                creditNote.id,
                'credit_note_xml',
                `${payload.creditNote.uuid}_NC.xml`,
                creditNoteStorageResult.xmlFile.publicUrl,
                creditNoteStorageResult.xmlFile.path
              );
              creditNoteResult.files!.xml = creditNoteStorageResult.xmlFile.publicUrl;
            }
            
            if (creditNoteStorageResult.pdfFile) {
              await saveCreditNoteFileRecord(
                invoice.id,
                creditNote.id,
                'credit_note_pdf',
                `${payload.creditNote.uuid}_NC.pdf`,
                creditNoteStorageResult.pdfFile.publicUrl,
                creditNoteStorageResult.pdfFile.path
              );
              creditNoteResult.files!.pdf = creditNoteStorageResult.pdfFile.publicUrl;
            }
            
            console.log('✅ Credit note files uploaded to Supabase Storage');
          } catch (cnStorageError) {
            console.error('⚠️ Credit note storage error:', (cnStorageError as Error).message);
          }
          
          // Upload credit note files to Google Drive
          console.log('📤 Uploading credit note files to Google Drive...');
          try {
            const creditNoteDriveResult = await uploadCreditNoteFiles(
              payload.week,
              payload.year || invoiceYear,
              payload.project,
              payload.issuer.rfc,
              payload.issuer.name,
              payload.invoice.uuid, // Parent invoice UUID for folder
              payload.creditNote.uuid,
              hasCreditNoteXml,
              hasCreditNotePdf,
              payload.isLate || false
            );
            
            if (creditNoteDriveResult.xmlFile) {
              creditNoteResult.files!.xml = creditNoteDriveResult.xmlFile.webViewLink;
            }
            if (creditNoteDriveResult.pdfFile) {
              creditNoteResult.files!.pdf = creditNoteDriveResult.pdfFile.webViewLink;
            }
            
            console.log('✅ Credit note files uploaded to Google Drive');
          } catch (cnDriveError) {
            console.warn('⚠️ Credit note Drive upload failed:', (cnDriveError as Error).message);
          }
        }
      } catch (creditNoteError) {
        console.error('⚠️ Credit note processing error:', (creditNoteError as Error).message);
        // Don't fail the entire request if credit note fails
      }
    }

    // Build success response
    const responseData: InvoiceSuccessData = {
      invoiceId: invoice.id,
      uuid: payload.invoice.uuid,
      driveFolderPath: driveResult?.folderPath || 'Supabase Storage',
      files: {
        xml: driveResult?.xmlFile?.webViewLink || storageResult.xmlFile?.publicUrl,
        pdf: driveResult?.pdfFile?.webViewLink || storageResult.pdfFile?.publicUrl
      },
      creditNote: creditNoteResult,
    };

    console.log('🎉 Invoice processed successfully!');
    console.log('   Storage:', storageResult.xmlFile ? '✅ Supabase' : '❌');
    console.log('   Drive:', driveResult ? '✅ Google Drive' : '❌');

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
