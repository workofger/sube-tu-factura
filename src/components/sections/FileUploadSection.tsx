import React, { useMemo } from 'react';
import { Sparkles, Loader2, AlertTriangle, FileWarning, Upload, CheckCircle } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Section Header */}
      <div className="section-header">
        <span className="section-icon">
          <Upload size={18} />
        </span>
        <h3 className="section-title">Carga de Archivos</h3>
      </div>

      {/* Upload Area */}
      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FileUpload
            label="Archivo XML"
            accept=".xml"
            file={formData.xmlFile}
            onChange={(f) => onFileChange('xmlFile', f)}
            iconType="xml"
          />
          <FileUpload
            label="Archivo PDF"
            accept=".pdf"
            file={formData.pdfFile}
            onChange={(f) => onFileChange('pdfFile', f)}
            iconType="pdf"
          />
        </div>

        {/* Filename mismatch error */}
        {displayError && (
          <div className="flex items-center gap-3 text-orange-600 bg-orange-50 px-4 py-3 rounded-xl border border-orange-200 text-sm">
            <FileWarning size={18} className="flex-shrink-0" />
            <span className="font-medium">{displayError}</span>
          </div>
        )}

        {/* Status Messages */}
        <div className="flex items-center justify-center min-h-[48px]">
          {isExtracting ? (
            <div className="flex items-center gap-3 text-partrunner-yellow-dark bg-partrunner-yellow/10 px-5 py-3 rounded-xl border border-partrunner-yellow/30 animate-pulse text-sm">
              <Loader2 size={18} className="animate-spin" />
              <span className="font-semibold">Leyendo factura y completando formulario...</span>
            </div>
          ) : extractSuccess ? (
            <div className="flex items-center gap-3 text-partrunner-yellow-accent bg-partrunner-yellow/10 px-5 py-3 rounded-xl border border-partrunner-yellow/30 text-sm">
              <CheckCircle size={18} />
              <span className="font-semibold">¡Datos extraídos! Verifica la información abajo.</span>
            </div>
          ) : extractError ? (
            <div className="flex items-center gap-3 text-red-600 bg-red-50 px-5 py-3 rounded-xl border border-red-200 text-sm">
              <AlertTriangle size={18} />
              <span className="font-semibold">Error al leer. Llena los campos manualmente.</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <Sparkles size={18} />
              <span>Sube tus archivos para extracción automática con IA</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
