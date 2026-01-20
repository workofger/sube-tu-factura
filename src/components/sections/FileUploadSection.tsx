import React, { useMemo } from 'react';
import { Sparkles, Loader2, AlertTriangle, FileWarning } from 'lucide-react';
import { FileUpload } from '../common';
import { InvoiceData } from '../../types/invoice';
import { validateMatchingFilenames } from '../../utils/xmlParser';

interface FileUploadSectionProps {
  formData: InvoiceData;
  onFileChange: (field: 'xmlFile' | 'pdfFile', file: File | null) => void;
  isExtracting: boolean;
  extractSuccess: boolean;
  extractError: string | null;
  filenameError?: string | null;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  formData,
  onFileChange,
  isExtracting,
  extractSuccess,
  extractError,
  filenameError,
}) => {
  // Validate filename matching
  const filenameValidation = useMemo(() => {
    return validateMatchingFilenames(formData.xmlFile, formData.pdfFile);
  }, [formData.xmlFile, formData.pdfFile]);

  const displayError = filenameError || (!filenameValidation.valid ? filenameValidation.error : null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <span className="bg-yellow-100 text-yellow-700 p-1.5 rounded-lg">
          <Sparkles size={18} />
        </span>
        <h3 className="font-bold text-gray-800 text-lg">1. Carga de Archivos</h3>
      </div>

      <div className="bg-yellow-50/50 p-6 rounded-2xl border border-yellow-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUpload
            label="XML"
            accept=".xml"
            file={formData.xmlFile}
            onChange={(f) => onFileChange('xmlFile', f)}
            iconType="xml"
          />
          <FileUpload
            label="PDF"
            accept=".pdf"
            file={formData.pdfFile}
            onChange={(f) => onFileChange('pdfFile', f)}
            iconType="pdf"
          />
        </div>

        {/* Filename mismatch error */}
        {displayError && (
          <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-3 rounded-xl border border-orange-200 text-sm">
            <FileWarning size={18} className="flex-shrink-0" />
            <span className="font-medium">{displayError}</span>
          </div>
        )}

        <div className="flex items-center justify-center min-h-[40px]">
          {isExtracting ? (
            <div className="flex items-center gap-2 text-yellow-700 bg-white px-4 py-2 rounded-full shadow-sm border border-yellow-200 animate-pulse text-sm">
              <Loader2 size={16} className="animate-spin" />
              <span className="font-semibold">Leyendo factura y completando formulario...</span>
            </div>
          ) : extractSuccess ? (
            <div className="flex items-center gap-2 text-green-700 bg-white px-4 py-2 rounded-full shadow-sm border border-green-200 text-sm">
              <Sparkles size={16} />
              <span className="font-semibold">¡Datos extraídos! Por favor verifica la información abajo.</span>
            </div>
          ) : extractError ? (
            <div className="flex items-center gap-2 text-red-600 bg-white px-4 py-2 rounded-full shadow-sm border border-red-200 text-sm">
              <AlertTriangle size={16} />
              <span className="font-semibold">Error al leer. Llena los campos manualmente.</span>
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm">
              Sube tus archivos para iniciar la extracción automática con IA.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
