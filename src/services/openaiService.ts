import { ExtractionResult } from '../types/invoice';
import { fileToBase64 } from '../utils/files';

// API base URL - uses relative path for same-origin requests in production
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

/**
 * Extract invoice data using the backend API endpoint
 * This keeps the OpenAI API key secure on the server side
 */
export const extractInvoiceData = async (
  xmlFile: File | null, 
  pdfFile: File | null
): Promise<ExtractionResult> => {
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Iniciando extracción de datos via API...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (!xmlFile && !pdfFile) {
    throw new Error("No se proporcionaron archivos para extracción.");
  }
  
  try {
    // Prepare content for backend
    let xmlContent = '';
    let pdfBase64 = '';
    let pdfFilename = '';

    // Process XML (read as text)
    if (xmlFile) {
      console.log("📄 Procesando XML:", xmlFile.name, `(${(xmlFile.size / 1024).toFixed(1)} KB)`);
      try {
        xmlContent = await xmlFile.text();
        console.log("✅ XML procesado correctamente");
      } catch (err) {
        console.error("❌ Error procesando XML:", err);
        throw new Error("Error al procesar archivo XML");
      }
    }
    
    // Process PDF (convert to base64)
    if (pdfFile) {
      console.log("📄 Procesando PDF:", pdfFile.name, `(${(pdfFile.size / 1024).toFixed(1)} KB)`);
      try {
        pdfBase64 = await fileToBase64(pdfFile);
        pdfFilename = pdfFile.name;
        console.log("✅ PDF procesado correctamente");
      } catch (err) {
        console.error("❌ Error procesando PDF:", err);
        // PDF is optional, continue without it
        console.log("⚠️ Continuando sin PDF...");
      }
    }

    console.log("🤖 Enviando a API de extracción...");
    console.log("⏳ Esto puede tomar unos segundos...");
    
    const startTime = Date.now();
    
    // Call backend extraction API
    const response = await fetch(`${API_BASE_URL}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        xmlContent: xmlContent || undefined,
        pdfBase64: pdfBase64 || undefined,
        pdfFilename: pdfFilename || undefined,
      }),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("❌ Error de API:", data.error, data.message);
      throw new Error(data.message || "Error al extraer datos de la factura");
    }

    const result = data.data as ExtractionResult;

    console.log(`✅ Respuesta recibida en ${elapsed}s`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ EXTRACCIÓN EXITOSA");
    console.log("Emisor:", result.billerName);
    console.log("RFC:", result.rfc);
    console.log("UUID:", result.uuid);
    console.log("Total:", result.totalAmount, result.currency);
    console.log("Items:", result.items?.length || 0);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    return result;

  } catch (error: unknown) {
    const err = error as Error;
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR EN EXTRACCIÓN");
    console.error("Mensaje:", err.message);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    throw error;
  }
};
