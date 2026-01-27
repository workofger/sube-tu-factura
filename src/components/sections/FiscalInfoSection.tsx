import React from 'react';
import { User, ShieldCheck, Calendar, Hash, AlertTriangle, Clock, Info } from 'lucide-react';
import { InputField, ProjectSelect } from '../common';
import { InvoiceData } from '../../types/invoice';
import { CONFIG } from '../../constants/config';
import { Project } from '../../hooks/useProjects';
import { getValidPeriodDescription, formatDeadline } from '../../utils/dates';

interface FiscalInfoSectionProps {
  formData: InvoiceData;
  projects: Project[];
  projectsLoading?: boolean;
  onFieldChange: <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => void;
}

export const FiscalInfoSection: React.FC<FiscalInfoSectionProps> = ({
  formData,
  projects,
  projectsLoading = false,
  onFieldChange,
}) => {

  const rfcMismatch = formData.receiverRfc && formData.receiverRfc !== CONFIG.EXPECTED_RECEIVER_RFC;
  const validPeriod = getValidPeriodDescription();
  const deadline = formatDeadline();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <span className="bg-yellow-100 text-yellow-700 p-1.5 rounded-lg">
          <User size={18} />
        </span>
        <h3 className="font-bold text-gray-800 text-lg">2. Información Fiscal</h3>
      </div>

      {/* Issuer Details */}
      <div className="space-y-4">
        <InputField
          label="Razón Social Emisor"
          placeholder="Nombre completo"
          value={formData.billerName}
          onChange={(e) => onFieldChange('billerName', e.target.value)}
          icon={<User size={18} />}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="RFC Emisor"
            placeholder="XAXX010101000"
            value={formData.rfc}
            onChange={(e) => onFieldChange('rfc', e.target.value.toUpperCase())}
            icon={<ShieldCheck size={18} />}
          />
          <InputField
            label="Régimen Fiscal Emisor"
            placeholder="612 - Personas Físicas..."
            value={formData.issuerRegime}
            onChange={(e) => onFieldChange('issuerRegime', e.target.value)}
          />
        </div>
        <InputField
          label="C.P. Emisor"
          placeholder="06600"
          value={formData.issuerZipCode || ''}
          onChange={(e) => onFieldChange('issuerZipCode', e.target.value)}
          className="w-1/2"
        />
      </div>

      {/* Receiver Details with Validation */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
        <h4 className="font-bold text-gray-600 text-sm flex items-center gap-1">
          Datos Receptor (Esperado: {CONFIG.EXPECTED_RECEIVER_RFC})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InputField
            label="RFC Receptor"
            value={formData.receiverRfc}
            onChange={(e) => onFieldChange('receiverRfc', e.target.value.toUpperCase())}
            error={rfcMismatch ? "RFC incorrecto" : undefined}
            helperText={formData.receiverRfc === CONFIG.EXPECTED_RECEIVER_RFC ? "✓ RFC Correcto" : undefined}
          />
          <InputField
            label="Régimen Receptor"
            value={formData.receiverRegime}
            onChange={(e) => onFieldChange('receiverRegime', e.target.value)}
            placeholder="601 - General de Ley"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Uso CFDI"
            value={formData.cfdiUse || ''}
            onChange={(e) => onFieldChange('cfdiUse', e.target.value)}
            placeholder="G03 - Gastos en general"
          />
          <InputField
            label="C.P. Receptor"
            value={formData.receiverZipCode || ''}
            onChange={(e) => onFieldChange('receiverZipCode', e.target.value)}
            placeholder="06600"
          />
        </div>
        {rfcMismatch && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-2">
            <AlertTriangle size={14} /> El RFC no coincide con {CONFIG.EXPECTED_RECEIVER_RFC}
          </div>
        )}
      </div>

      {/* Week Info (Read-only) & Project */}
      <div className="grid grid-cols-2 gap-4">
        {/* Week Info Box - Read Only */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            Semana de Pago
          </label>
          <div className={`p-3 rounded-xl border ${
            formData.isLate 
              ? 'bg-amber-50 border-amber-300' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            {formData.week ? (
              <>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className={formData.isLate ? 'text-amber-600' : 'text-blue-600'} />
                  <span className={`font-semibold ${formData.isLate ? 'text-amber-700' : 'text-blue-700'}`}>
                    Semana {formData.week} - {formData.year}
                  </span>
                </div>
                {formData.isLate && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle size={12} />
                    <span>Extemporánea - Se programará para el siguiente ciclo</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <Info size={16} />
                <span className="text-sm">Se calculará automáticamente</span>
              </div>
            )}
          </div>
          {/* Valid period info */}
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={12} />
            Período válido: {validPeriod}
          </p>
          <p className="text-xs text-gray-500">
            Deadline: {deadline}
          </p>
        </div>

        <ProjectSelect
          projects={projects}
          value={formData.project}
          onChange={(value) => onFieldChange('project', value)}
          loading={projectsLoading}
        />
      </div>

      {/* Date & Folio */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Fecha Factura"
          type="date"
          value={formData.invoiceDate}
          onChange={(e) => onFieldChange('invoiceDate', e.target.value)}
          icon={<Calendar size={18} />}
        />
        <InputField
          label="Folio"
          placeholder="Ej. A-123"
          value={formData.folio}
          onChange={(e) => onFieldChange('folio', e.target.value)}
          icon={<Hash size={18} />}
        />
      </div>

      {/* Series (optional) */}
      {formData.series && (
        <InputField
          label="Serie"
          value={formData.series}
          onChange={(e) => onFieldChange('series', e.target.value)}
          className="w-1/2"
        />
      )}
    </div>
  );
};
