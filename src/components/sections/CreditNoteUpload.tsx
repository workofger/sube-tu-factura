import React, { useEffect, useState } from 'react';
import { FileCheck, FileX2, AlertCircle, CheckCircle2, Info, Receipt, Loader2 } from 'lucide-react';
import { FileUpload } from '../common/FileUpload';
import { CreditNoteData, CreditNoteValidation } from '../../types/invoice';
import { extractCreditNoteData, validateCreditNote } from '../../services/creditNoteService';
import { formatNumber } from '../../utils/formatters';
import { validateMatchingFilenames } from '../../utils/xmlParser';

interface CreditNoteUploadProps {
  xmlFile: File | null;
  pdfFile: File | null;
  onXmlChange: (file: File | null) => void;
  onPdfChange: (file: File | null) => void;
  invoiceUuid: string;
  invoiceIssuerRfc: string;
  expectedFeeAmount: number;
  onValidationChange: (validation: CreditNoteValidation | null, data: CreditNoteData | null) => void;
}

export const CreditNoteUpload: React.FC<CreditNoteUploadProps> = ({
  xmlFile,
  pdfFile,
  onXmlChange,
  onPdfChange,
  invoiceUuid,
  invoiceIssuerRfc,
  expectedFeeAmount,
  onValidationChange,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<CreditNoteValidation | null>(null);
  const [creditNoteData, setCreditNoteData] = useState<CreditNoteData | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Validate credit note when XML file changes
  useEffect(() => {
    const validateXml = async () => {
      if (!xmlFile) {
        setValidation(null);
        setCreditNoteData(null);
        onValidationChange(null, null);
        return;
      }

      setIsValidating(true);
      setFileError(null);

      try {
        // Extract data from XML
        const data = await extractCreditNoteData(xmlFile);
        setCreditNoteData(data);

        if (!data) {
          const failedValidation: CreditNoteValidation = {
            isValid: false,
            errors: ['No se pudo extraer la información del XML. Verifica que sea un CFDI válido.'],
          };
          setValidation(failedValidation);
          onValidationChange(failedValidation, null);
          return;
        }

        // Validate against invoice data
        const validationResult = validateCreditNote(
          data,
          invoiceUuid,
          invoiceIssuerRfc,
          expectedFeeAmount
        );

        setValidation(validationResult);
        onValidationChange(validationResult, data);
      } catch (error) {
        console.error('Error validating credit note:', error);
        const errorValidation: CreditNoteValidation = {
          isValid: false,
          errors: ['Error al procesar el archivo XML'],
        };
        setValidation(errorValidation);
        onValidationChange(errorValidation, null);
      } finally {
        setIsValidating(false);
      }
    };

    validateXml();
  }, [xmlFile, invoiceUuid, invoiceIssuerRfc, expectedFeeAmount, onValidationChange]);

  // Validate matching filenames
  useEffect(() => {
    if (xmlFile && pdfFile) {
      const { valid, error } = validateMatchingFilenames(xmlFile, pdfFile);
      setFileError(valid ? null : error || null);
    } else {
      setFileError(null);
    }
  }, [xmlFile, pdfFile]);

  const isComplete = xmlFile && pdfFile && validation?.isValid && !fileError;

  return (
    <div className="mt-6 p-5 bg-amber-50/50 rounded-2xl border border-amber-200/50">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-xl">
          <Receipt size={20} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            Nota de Crédito
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
              REQUERIDA
            </span>
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Para Pronto Pago debes adjuntar la nota de crédito (CFDI tipo E) que ampara el descuento financiero.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-amber-200/50 mb-4">
        <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600">
          <p className="font-medium text-gray-700 mb-1">Requisitos de la Nota de Crédito:</p>
          <ul className="space-y-1 list-disc list-inside text-gray-500">
            <li>Tipo de comprobante: <strong>E (Egreso)</strong></li>
            <li>UUID relacionado: <strong>{invoiceUuid || '(carga primero la factura)'}</strong></li>
            <li>Monto aproximado: <strong>${formatNumber(expectedFeeAmount)}</strong></li>
            <li>RFC emisor debe coincidir con la factura</li>
          </ul>
        </div>
      </div>

      {/* File Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <FileUpload
            label="XML de Nota de Crédito"
            accept=".xml"
            file={xmlFile}
            onChange={onXmlChange}
            iconType="xml"
          />
          {isValidating && (
            <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          )}
        </div>
        <FileUpload
          label="PDF de Nota de Crédito"
          accept=".pdf"
          file={pdfFile}
          onChange={onPdfChange}
          iconType="pdf"
        />
      </div>

      {/* Filename mismatch error */}
      {fileError && (
        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{fileError}</p>
        </div>
      )}

      {/* Validation Status */}
      {validation && !isValidating && (
        <div className={`mt-4 p-4 rounded-xl border ${
          validation.isValid 
            ? 'bg-partrunner-green/5 border-partrunner-green/20' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {validation.isValid ? (
              <>
                <CheckCircle2 size={20} className="text-partrunner-green flex-shrink-0" />
                <div>
                  <p className="font-semibold text-partrunner-green">Nota de crédito válida</p>
                  {creditNoteData && (
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p><span className="text-gray-500">UUID:</span> {creditNoteData.uuid}</p>
                      <p><span className="text-gray-500">Monto:</span> ${formatNumber(creditNoteData.totalAmount)} {creditNoteData.currency}</p>
                      <p><span className="text-gray-500">Fecha:</span> {creditNoteData.issueDate}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <FileX2 size={20} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">Errores de validación</p>
                  <ul className="mt-2 text-sm text-red-600 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-400">•</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Completeness indicator */}
      {xmlFile && pdfFile && (
        <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl ${
          isComplete 
            ? 'bg-partrunner-green/10 text-partrunner-green' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          {isComplete ? (
            <>
              <FileCheck size={18} />
              <span className="text-sm font-medium">Nota de crédito completa y validada</span>
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              <span className="text-sm font-medium">Corrige los errores para continuar</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
