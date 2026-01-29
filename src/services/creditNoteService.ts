/**
 * Credit Note Service
 * Handles extraction and validation of CFDI tipo E (Egreso) credit notes
 * Required for Pronto Pago to document the financial cost discount
 */

import { CreditNoteData, CreditNoteValidation } from '../types/invoice';

/**
 * Extract credit note data from CFDI XML content
 * Parses CFDI tipo E (Egreso) and extracts required fields
 */
export const extractCreditNoteData = async (xmlFile: File): Promise<CreditNoteData | null> => {
  try {
    const content = await xmlFile.text();
    
    // Extract TipoDeComprobante - must be "E" for Egreso
    const tipoComprobanteMatch = content.match(/TipoDeComprobante\s*=\s*["']([^"']+)["']/i);
    const tipoComprobante = tipoComprobanteMatch ? tipoComprobanteMatch[1].toUpperCase() : '';
    
    // Extract UUID from TimbreFiscalDigital
    const uuidMatch = content.match(/tfd:TimbreFiscalDigital[^>]*UUID\s*=\s*["']([A-Fa-f0-9-]{36})["']/i) ||
                      content.match(/TimbreFiscalDigital[^>]*UUID\s*=\s*["']([A-Fa-f0-9-]{36})["']/i);
    const uuid = uuidMatch ? uuidMatch[1].toUpperCase() : '';
    
    // Extract Folio
    const folioMatch = content.match(/Folio\s*=\s*["']([^"']+)["']/i);
    const folio = folioMatch ? folioMatch[1] : undefined;
    
    // Extract Serie
    const seriesMatch = content.match(/Serie\s*=\s*["']([^"']+)["']/i);
    const series = seriesMatch ? seriesMatch[1] : undefined;
    
    // Extract issuer RFC and name
    const rfcMatch = content.match(/cfdi:Emisor[^>]*Rfc\s*=\s*["']([^"']+)["']/i) ||
                     content.match(/Emisor[^>]*Rfc\s*=\s*["']([^"']+)["']/i);
    const issuerRfc = rfcMatch ? rfcMatch[1].toUpperCase() : '';
    
    const nameMatch = content.match(/cfdi:Emisor[^>]*Nombre\s*=\s*["']([^"']+)["']/i) ||
                      content.match(/Emisor[^>]*Nombre\s*=\s*["']([^"']+)["']/i);
    const issuerName = nameMatch ? nameMatch[1] : undefined;
    
    // Extract related UUID from CfdiRelacionados
    // Pattern: <cfdi:CfdiRelacionados TipoRelacion="01"><cfdi:CfdiRelacionado UUID="..."/>
    const tipoRelacionMatch = content.match(/CfdiRelacionados[^>]*TipoRelacion\s*=\s*["']([^"']+)["']/i);
    const tipoRelacion = tipoRelacionMatch ? tipoRelacionMatch[1] : '01';
    
    const relatedUuidMatch = content.match(/CfdiRelacionado[^>]*UUID\s*=\s*["']([A-Fa-f0-9-]{36})["']/i);
    const relatedUuid = relatedUuidMatch ? relatedUuidMatch[1].toUpperCase() : '';
    
    // Extract amounts
    const subtotalMatch = content.match(/SubTotal\s*=\s*["']([0-9.]+)["']/i);
    const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1]) : 0;
    
    // Extract total tax (can be from TotalImpuestosTrasladados or Traslados)
    const totalTaxMatch = content.match(/TotalImpuestosTrasladados\s*=\s*["']([0-9.]+)["']/i);
    const totalTax = totalTaxMatch ? parseFloat(totalTaxMatch[1]) : 0;
    
    const totalMatch = content.match(/Total\s*=\s*["']([0-9.]+)["']/i);
    const totalAmount = totalMatch ? parseFloat(totalMatch[1]) : 0;
    
    // Extract currency
    const currencyMatch = content.match(/Moneda\s*=\s*["']([^"']+)["']/i);
    const currency = currencyMatch ? currencyMatch[1] : 'MXN';
    
    // Extract dates
    const dateMatch = content.match(/Fecha\s*=\s*["']([^"']+)["']/i);
    const issueDate = dateMatch ? dateMatch[1].split('T')[0] : '';
    
    const certDateMatch = content.match(/FechaTimbrado\s*=\s*["']([^"']+)["']/i);
    const certificationDate = certDateMatch ? certDateMatch[1] : undefined;
    
    if (!uuid || !issuerRfc) {
      console.error('📋 Required credit note fields missing: UUID or RFC');
      return null;
    }
    
    return {
      uuid,
      folio,
      series,
      issuerRfc,
      issuerName,
      relatedUuid,
      tipoRelacion,
      subtotal,
      totalTax,
      totalAmount,
      currency,
      issueDate,
      certificationDate,
      tipoComprobante,
    };
  } catch (error) {
    console.error('❌ Error extracting credit note data:', error);
    return null;
  }
};

/**
 * Validate credit note against the main invoice
 * Checks:
 * 1. TipoDeComprobante is "E" (Egreso)
 * 2. RelatedUuid matches the invoice UUID
 * 3. IssuerRfc matches the invoice issuer RFC
 * 4. TotalAmount approximately matches the expected fee (with tolerance)
 */
export const validateCreditNote = (
  creditNoteData: CreditNoteData | null,
  invoiceUuid: string,
  invoiceIssuerRfc: string,
  expectedFeeAmount: number,
  tolerancePercent: number = 0.05 // 5% tolerance for rounding differences
): CreditNoteValidation => {
  const errors: string[] = [];
  
  if (!creditNoteData) {
    return {
      isValid: false,
      errors: ['No se pudo extraer la información de la nota de crédito'],
    };
  }
  
  // 1. Validate TipoDeComprobante
  if (creditNoteData.tipoComprobante !== 'E') {
    errors.push(
      `El tipo de comprobante debe ser "E" (Egreso). Se encontró: "${creditNoteData.tipoComprobante || 'vacío'}"`
    );
  }
  
  // 2. Validate related UUID
  if (!creditNoteData.relatedUuid) {
    errors.push('La nota de crédito no tiene un UUID relacionado (CfdiRelacionado)');
  } else if (creditNoteData.relatedUuid.toUpperCase() !== invoiceUuid.toUpperCase()) {
    errors.push(
      `El UUID relacionado no coincide con la factura. ` +
      `Esperado: ${invoiceUuid}, Encontrado: ${creditNoteData.relatedUuid}`
    );
  }
  
  // 3. Validate issuer RFC
  if (creditNoteData.issuerRfc.toUpperCase() !== invoiceIssuerRfc.toUpperCase()) {
    errors.push(
      `El RFC del emisor no coincide con la factura. ` +
      `Esperado: ${invoiceIssuerRfc}, Encontrado: ${creditNoteData.issuerRfc}`
    );
  }
  
  // 4. Validate amount (with tolerance)
  const minAmount = expectedFeeAmount * (1 - tolerancePercent);
  const maxAmount = expectedFeeAmount * (1 + tolerancePercent);
  
  if (creditNoteData.totalAmount < minAmount || creditNoteData.totalAmount > maxAmount) {
    errors.push(
      `El monto de la nota de crédito no coincide con el costo financiero. ` +
      `Esperado: $${expectedFeeAmount.toFixed(2)}, Encontrado: $${creditNoteData.totalAmount.toFixed(2)}`
    );
  }
  
  // 5. Validate TipoRelacion is "01" (Nota de crédito de los documentos relacionados)
  if (creditNoteData.tipoRelacion !== '01') {
    errors.push(
      `El tipo de relación debe ser "01" (Nota de crédito). Se encontró: "${creditNoteData.tipoRelacion}"`
    );
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: creditNoteData,
  };
};

/**
 * Check if a file is a credit note (CFDI tipo E)
 * Quick check without full extraction
 */
export const isCreditNoteXml = async (xmlFile: File): Promise<boolean> => {
  try {
    const content = await xmlFile.text();
    const tipoMatch = content.match(/TipoDeComprobante\s*=\s*["']E["']/i);
    return !!tipoMatch;
  } catch {
    return false;
  }
};

/**
 * Get a human-readable description of the credit note
 */
export const getCreditNoteDescription = (data: CreditNoteData): string => {
  const parts = [
    `Nota de Crédito ${data.uuid}`,
    data.folio ? `Folio: ${data.folio}` : null,
    `Monto: $${data.totalAmount.toFixed(2)} ${data.currency}`,
    `Fecha: ${data.issueDate}`,
    `Relacionada a: ${data.relatedUuid}`,
  ].filter(Boolean);
  
  return parts.join(' | ');
};
