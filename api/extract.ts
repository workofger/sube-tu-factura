import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { ApiResponse } from './lib/types.js';
import { applySecurityMiddleware } from './lib/rateLimit.js';

/**
 * Extraction result interface
 */
interface ExtractionResult {
  week?: number;
  project?: string;
  rfc?: string;
  billerName?: string;
  issuerRegime?: string;
  issuerZipCode?: string;
  receiverRfc?: string;
  receiverName?: string;
  receiverRegime?: string;
  receiverZipCode?: string;
  cfdiUse?: string;
  email?: string;
  invoiceDate?: string;
  folio?: string;
  series?: string;
  uuid?: string;
  certificationDate?: string;
  satCertNumber?: string;
  paymentMethod?: 'PUE' | 'PPD';
  paymentForm?: string;
  paymentConditions?: string;
  subtotal?: number;
  totalTax?: number;
  retentionIva?: number;
  retentionIvaRate?: number;
  retentionIsr?: number;
  retentionIsrRate?: number;
  totalAmount?: number;
  currency?: string;
  exchangeRate?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    productKey?: string;
    taxObject?: string;
  }>;
}

interface ExtractPayload {
  xmlContent?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

// Initialize OpenAI with server-side API key
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured on server');
  }
  return new OpenAI({ apiKey });
};

/**
 * POST /api/extract
 * Extract invoice data from XML/PDF using OpenAI GPT-4o
 * This endpoint keeps the API key secure on the server side
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

  // Only allow POST
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
    const payload = req.body as ExtractPayload;

    // Validate input
    if (!payload.xmlContent && !payload.pdfBase64) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Se requiere al menos un archivo (XML o PDF)',
        details: ['xmlContent o pdfBase64 es requerido']
      } as ApiResponse);
    }

    console.log('🤖 Starting OpenAI extraction...');
    console.log('  - XML:', payload.xmlContent ? `✅ (${payload.xmlContent.length} chars)` : '❌');
    console.log('  - PDF:', payload.pdfBase64 ? `✅ (${(payload.pdfBase64.length / 1024).toFixed(1)} KB)` : '❌');

    const openai = getOpenAIClient();

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

    // Add XML as text
    if (payload.xmlContent) {
      userContent.push({
        type: 'text',
        text: `CONTENIDO XML DE LA FACTURA CFDI:\n\n${payload.xmlContent}`
      });
    }

    // Add PDF as file if available
    if (payload.pdfBase64 && payload.pdfFilename) {
      userContent.push({
        type: 'file',
        file: {
          filename: payload.pdfFilename,
          file_data: `data:application/pdf;base64,${payload.pdfBase64}`
        }
      } as OpenAI.Chat.ChatCompletionContentPart);
    }

    // Add final instruction
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
    console.log(`✅ OpenAI response received in ${elapsed}s`);

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response from OpenAI');
    }

    const result = JSON.parse(text) as ExtractionResult;

    console.log('📋 Extraction complete:');
    console.log('  - Emisor:', result.billerName);
    console.log('  - RFC:', result.rfc);
    console.log('  - UUID:', result.uuid);
    console.log('  - Total:', result.totalAmount, result.currency);
    console.log('  - Items:', result.items?.length || 0);

    return res.status(200).json({
      success: true,
      message: 'Datos extraídos correctamente',
      data: result
    } as ApiResponse<ExtractionResult>);

  } catch (error) {
    const err = error as Error & { status?: number; code?: string };
    console.error('❌ Extraction error:', err.message);

    // Specific error messages
    let errorMessage = 'Error al extraer datos de la factura';
    let errorCode = 'EXTRACTION_ERROR';

    if (err.status === 401 || err.message?.includes('API key') || err.message?.includes('Incorrect API key')) {
      errorMessage = 'Error de configuración del servidor. Contacta soporte.';
      errorCode = 'API_KEY_ERROR';
    } else if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('rate limit')) {
      errorMessage = 'Servicio temporalmente no disponible. Intenta en unos minutos.';
      errorCode = 'RATE_LIMIT';
    } else if (err.status === 404 || err.message?.includes('model')) {
      errorMessage = 'Modelo de IA no disponible. Contacta soporte.';
      errorCode = 'MODEL_ERROR';
    } else if (err.message?.includes('JSON')) {
      errorMessage = 'Error procesando respuesta. Intenta de nuevo.';
      errorCode = 'PARSE_ERROR';
    }

    return res.status(500).json({
      success: false,
      error: errorCode,
      message: errorMessage,
      details: [err.message]
    } as ApiResponse);
  }
}
