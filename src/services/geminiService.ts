import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractionResult } from "../types/invoice";
import { fileToPart } from "../utils/files";

// Verificar que la API key esté configurada
const apiKey = process.env.API_KEY;

console.log("🔑 Gemini Service inicializado");
console.log("API Key presente:", apiKey ? `✅ (${apiKey.substring(0, 10)}...)` : "❌ NO");

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export const extractInvoiceData = async (
  xmlFile: File | null, 
  pdfFile: File | null
): Promise<ExtractionResult> => {
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Iniciando extracción de datos...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  if (!apiKey) {
    console.error("❌ ERROR: API Key no configurada");
    throw new Error("API Key no configurada. Agrega GEMINI_API_KEY a .env.local");
  }
  
  try {
    const parts: Array<{ inlineData: { data: string; mimeType: string } } | { text: string }> = [];

    // Procesar XML primero (más importante para datos estructurados)
    if (xmlFile) {
      console.log("📄 Procesando XML:", xmlFile.name, `(${(xmlFile.size / 1024).toFixed(1)} KB)`);
      try {
        const xmlPart = await fileToPart(xmlFile);
        parts.push(xmlPart);
        console.log("✅ XML procesado correctamente");
      } catch (err) {
        console.error("❌ Error procesando XML:", err);
        throw new Error("Error al procesar archivo XML");
      }
    }
    
    // Procesar PDF
    if (pdfFile) {
      console.log("📄 Procesando PDF:", pdfFile.name, `(${(pdfFile.size / 1024).toFixed(1)} KB)`);
      try {
        const pdfPart = await fileToPart(pdfFile);
        parts.push(pdfPart);
        console.log("✅ PDF procesado correctamente");
      } catch (err) {
        console.error("❌ Error procesando PDF:", err);
        throw new Error("Error al procesar archivo PDF");
      }
    }

    if (parts.length === 0) {
      throw new Error("No se proporcionaron archivos para extracción.");
    }

    // Agregar el prompt
    parts.push({ 
      text: `Analyze this Mexican CFDI v4.0 invoice (XML/PDF) and extract ALL available data.

EXTRACTION INSTRUCTIONS:
1. IDENTIFIERS: Extract 'Folio', 'Serie', 'UUID', 'FechaTimbrado', 'NoCertificadoSAT'.
2. ISSUER (Emisor): Extract RFC, Name, RegimenFiscal (code AND description), DomicilioFiscalEmisor or LugarExpedicion.
3. RECEIVER (Receptor): Extract RFC, Name, RegimenFiscalReceptor, DomicilioFiscalReceptor, UsoCFDI.
4. PAYMENT: Extract MetodoPago (PUE/PPD), FormaPago code, CondicionesDePago if present.
5. TAXES: 
   - Extract total TRANSFERRED taxes (IVA 16%) into 'totalTax'.
   - Look for cfdi:Retenciones inside Impuestos:
     * Extract TOTAL amount for IVA Retentions (Impuesto 002) into 'retentionIva' and rate into 'retentionIvaRate'.
     * Extract TOTAL amount for ISR Retentions (Impuesto 001) into 'retentionIsr' and rate into 'retentionIsrRate'.
   - Note: Rates vary (e.g. 0.04, 0.106667, 0.0125, 0.10). Extract exactly what is in the XML.
6. ITEMS: Extract ALL Conceptos with full description, quantity, unit, unitPrice, amount, ClaveProdServ, ObjetoImp.
7. PROJECT: Check Concepto Descripcion or Issuer Name for keywords: 'Mercado Libre', 'Amazon', 'Walmart', 'Shopify'.

Return complete JSON with all fields.` 
    });

    const extractionSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        rfc: { type: Type.STRING, description: "RFC of issuer" },
        billerName: { type: Type.STRING, description: "Name of issuer" },
        issuerRegime: { type: Type.STRING, description: "Tax regime of issuer with code and description" },
        issuerZipCode: { type: Type.STRING, description: "Postal code of issuer" },
        receiverRfc: { type: Type.STRING, description: "RFC of receiver" },
        receiverName: { type: Type.STRING, description: "Name of receiver" },
        receiverRegime: { type: Type.STRING, description: "Tax regime of receiver" },
        receiverZipCode: { type: Type.STRING, description: "Postal code of receiver" },
        cfdiUse: { type: Type.STRING, description: "CFDI Use code" },
        email: { type: Type.STRING, description: "Email address" },
        project: { 
          type: Type.STRING, 
          enum: ['MERCADO LIBRE', 'AMAZON', 'WALMART', 'SHOPIFY', 'OTRO'],
          description: "Project type based on description" 
        },
        week: { type: Type.INTEGER, description: "Week number 1-52" },
        invoiceDate: { type: Type.STRING, description: "Invoice date YYYY-MM-DD" },
        folio: { type: Type.STRING, description: "Invoice folio" },
        series: { type: Type.STRING, description: "Invoice series" },
        uuid: { type: Type.STRING, description: "Fiscal UUID" },
        certificationDate: { type: Type.STRING, description: "Certification date" },
        satCertNumber: { type: Type.STRING, description: "SAT certificate number" },
        paymentMethod: { type: Type.STRING, enum: ['PUE', 'PPD'], description: "Payment method" },
        paymentForm: { type: Type.STRING, description: "Payment form code" },
        paymentConditions: { type: Type.STRING, description: "Payment conditions" },
        subtotal: { type: Type.NUMBER, description: "Subtotal amount" },
        totalTax: { type: Type.NUMBER, description: "Total transferred taxes" },
        retentionIva: { type: Type.NUMBER, description: "IVA retention amount" },
        retentionIvaRate: { type: Type.NUMBER, description: "IVA retention rate" },
        retentionIsr: { type: Type.NUMBER, description: "ISR retention amount" },
        retentionIsrRate: { type: Type.NUMBER, description: "ISR retention rate" },
        totalAmount: { type: Type.NUMBER, description: "Total amount" },
        currency: { type: Type.STRING, description: "Currency code" },
        exchangeRate: { type: Type.STRING, description: "Exchange rate" },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              unitPrice: { type: Type.NUMBER },
              amount: { type: Type.NUMBER },
              productKey: { type: Type.STRING },
              taxObject: { type: Type.STRING }
            },
            required: ["description", "quantity", "unitPrice", "amount"]
          }
        }
      },
      required: ["rfc", "billerName", "totalAmount", "items", "invoiceDate", "project", "paymentMethod", "uuid"],
    };

    console.log("🤖 Enviando a Gemini API (modelo: gemini-2.5-flash)...");
    console.log("⏳ Esto puede tomar unos segundos...");
    
    const startTime = Date.now();
    
    // Usar modelo estable gemini-2.5-flash (el más reciente con structured outputs)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
      }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Respuesta recibida de Gemini en ${elapsed}s`);
    
    const text = response.text;
    if (!text) {
      console.error("❌ Respuesta vacía de Gemini");
      throw new Error("Respuesta vacía del modelo");
    }

    console.log("📋 Parseando respuesta JSON...");
    console.log("Respuesta raw (primeros 500 chars):", text.substring(0, 500));
    
    const result = JSON.parse(text) as ExtractionResult;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ EXTRACCIÓN EXITOSA");
    console.log("Emisor:", result.billerName);
    console.log("RFC:", result.rfc);
    console.log("UUID:", result.uuid);
    console.log("Total:", result.totalAmount, result.currency);
    console.log("Items:", result.items?.length || 0);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    return result;

  } catch (error: any) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR EN EXTRACCIÓN");
    console.error("Mensaje:", error.message);
    console.error("Stack:", error.stack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Mensajes de error más descriptivos
    if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      throw new Error("API Key inválida o no configurada. Verifica tu GEMINI_API_KEY en .env.local");
    }
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw new Error("Cuota de API excedida. Intenta más tarde.");
    }
    if (error.message?.includes('model') || error.message?.includes('404')) {
      throw new Error("Modelo no disponible. Contacta soporte.");
    }
    if (error.message?.includes('JSON')) {
      throw new Error("Error parseando respuesta del modelo.");
    }
    
    throw error;
  }
};
