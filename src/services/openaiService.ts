import OpenAI from 'openai';
import { ExtractionResult } from '../types/invoice';
import { fileToBase64 } from '../utils/files';

// Verificar que la API key esté configurada
const apiKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

console.log("🔑 OpenAI Service inicializado");
console.log("API Key presente:", apiKey ? `✅ (${apiKey.substring(0, 10)}...)` : "❌ NO");

const openai = new OpenAI({
  apiKey: apiKey || '',
  dangerouslyAllowBrowser: true // Necesario para uso en browser
});

export const extractInvoiceData = async (
  xmlFile: File | null, 
  pdfFile: File | null
): Promise<ExtractionResult> => {
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Iniciando extracción de datos con OpenAI...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  if (!apiKey) {
    console.error("❌ ERROR: API Key no configurada");
    throw new Error("API Key no configurada. Agrega VITE_OPENAI_API_KEY a .env.local");
  }

  if (!xmlFile && !pdfFile) {
    throw new Error("No se proporcionaron archivos para extracción.");
  }
  
  try {
    // Preparar contenido para enviar
    let xmlContent = '';
    let pdfBase64 = '';

    // Procesar XML (leer como texto)
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
    
    // Procesar PDF (convertir a base64 para vision)
    if (pdfFile) {
      console.log("📄 Procesando PDF:", pdfFile.name, `(${(pdfFile.size / 1024).toFixed(1)} KB)`);
      try {
        pdfBase64 = await fileToBase64(pdfFile);
        console.log("✅ PDF procesado correctamente");
      } catch (err) {
        console.error("❌ Error procesando PDF:", err);
        // PDF es opcional, continuamos sin él
        console.log("⚠️ Continuando sin PDF...");
      }
    }

    const systemPrompt = `Eres un experto en facturas CFDI mexicanas v4.0. Tu tarea es extraer TODOS los datos de la factura proporcionada.

INSTRUCCIONES DE EXTRACCIÓN:
1. IDENTIFICADORES: Extrae 'Folio', 'Serie', 'UUID', 'FechaTimbrado', 'NoCertificadoSAT'.
2. EMISOR: Extrae RFC, Nombre, RegimenFiscal (código Y descripción), DomicilioFiscalEmisor.
3. RECEPTOR: Extrae RFC, Nombre, RegimenFiscalReceptor, DomicilioFiscalReceptor, UsoCFDI.
4. PAGO: Extrae MetodoPago (PUE/PPD), FormaPago código, CondicionesDePago.
5. IMPUESTOS: 
   - Extrae total de impuestos TRASLADADOS (IVA 16%) en 'totalTax'.
   - Busca cfdi:Retenciones dentro de Impuestos:
     * Extrae TOTAL de retenciones IVA (Impuesto 002) en 'retentionIva' y tasa en 'retentionIvaRate'.
     * Extrae TOTAL de retenciones ISR (Impuesto 001) en 'retentionIsr' y tasa en 'retentionIsrRate'.
   - Las tasas varían (0.04, 0.106667, 0.0125, 0.10). Extrae exactamente lo que está en el XML.
6. CONCEPTOS: Extrae TODOS los Conceptos con descripción completa, cantidad, unidad, precioUnitario, importe, ClaveProdServ, ObjetoImp.
7. PROYECTO: Busca en la Descripción del Concepto o Nombre del Emisor palabras clave: 'Mercado Libre', 'Amazon', 'Walmart', 'Rappi', 'Home Depot', etc.

Responde SOLO con un objeto JSON válido, sin markdown ni explicaciones.`;

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

    // Agregar el XML como texto
    if (xmlContent) {
      userContent.push({
        type: 'text',
        text: `CONTENIDO XML DE LA FACTURA CFDI:\n\n${xmlContent}`
      });
    }

    // Agregar el PDF como archivo si está disponible
    // OpenAI Vision soporta PDFs usando el tipo 'file' con file_data
    if (pdfBase64 && pdfFile) {
      userContent.push({
        type: 'file',
        file: {
          filename: pdfFile.name,
          file_data: `data:application/pdf;base64,${pdfBase64}`
        }
      } as OpenAI.Chat.ChatCompletionContentPart);
    }

    // Agregar instrucción final
    userContent.push({
      type: 'text',
      text: `Extrae todos los datos y devuelve un JSON con esta estructura exacta:
{
  "rfc": "RFC del emisor",
  "billerName": "Nombre del emisor",
  "issuerRegime": "Código y descripción del régimen fiscal",
  "issuerZipCode": "Código postal del emisor",
  "receiverRfc": "RFC del receptor",
  "receiverName": "Nombre del receptor",
  "receiverRegime": "Régimen del receptor",
  "receiverZipCode": "CP del receptor",
  "cfdiUse": "Uso CFDI",
  "project": "MERCADO LIBRE" | "AMAZON" | "WALMART" | "RAPPI" | "HOME DEPOT" | "OTRO",
  "invoiceDate": "YYYY-MM-DD",
  "folio": "Folio",
  "series": "Serie",
  "uuid": "UUID del timbre fiscal",
  "certificationDate": "Fecha de certificación",
  "satCertNumber": "Número certificado SAT",
  "paymentMethod": "PUE" | "PPD",
  "paymentForm": "Código forma de pago",
  "paymentConditions": "Condiciones de pago",
  "subtotal": número,
  "totalTax": número (IVA trasladado),
  "retentionIva": número,
  "retentionIvaRate": número (tasa como decimal),
  "retentionIsr": número,
  "retentionIsrRate": número,
  "totalAmount": número,
  "currency": "MXN",
  "exchangeRate": "1",
  "items": [
    {
      "description": "Descripción completa",
      "quantity": número,
      "unit": "Unidad",
      "unitPrice": número,
      "amount": número,
      "productKey": "ClaveProdServ",
      "taxObject": "ObjetoImp"
    }
  ]
}`
    });

    console.log("🤖 Enviando a OpenAI API (modelo: gpt-4o)...");
    console.log("⏳ Esto puede tomar unos segundos...");
    
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      temperature: 0.1
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Respuesta recibida de OpenAI en ${elapsed}s`);
    
    const text = response.choices[0]?.message?.content;
    if (!text) {
      console.error("❌ Respuesta vacía de OpenAI");
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

  } catch (error: unknown) {
    const err = error as Error & { status?: number; code?: string };
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR EN EXTRACCIÓN");
    console.error("Mensaje:", err.message);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Mensajes de error más descriptivos
    if (err.status === 401 || err.message?.includes('API key') || err.message?.includes('Incorrect API key')) {
      throw new Error("API Key inválida o no configurada. Verifica tu VITE_OPENAI_API_KEY en .env.local");
    }
    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('rate limit')) {
      throw new Error("Cuota de API excedida o rate limit. Intenta más tarde.");
    }
    if (err.status === 404 || err.message?.includes('model')) {
      throw new Error("Modelo no disponible. Contacta soporte.");
    }
    if (err.message?.includes('JSON')) {
      throw new Error("Error parseando respuesta del modelo.");
    }
    
    throw error;
  }
};
