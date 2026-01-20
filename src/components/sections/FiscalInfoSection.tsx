import React from 'react';
import { User, ShieldCheck, Calendar, Hash, AlertTriangle } from 'lucide-react';
import { InputField, SelectField, ProjectSelect } from '../common';
import { InvoiceData } from '../../types/invoice';
import { CONFIG } from '../../constants/config';
import { Project } from '../../hooks/useProjects';

interface FiscalInfoSectionProps {
  formData: InvoiceData;
  weekOptions: { value: string; label: string }[];
  projects: Project[];
  projectsLoading?: boolean;
  onFieldChange: <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => void;
}

export const FiscalInfoSection: React.FC<FiscalInfoSectionProps> = ({
  formData,
  weekOptions,
  projects,
  projectsLoading = false,
  onFieldChange,
}) => {

  const rfcMismatch = formData.receiverRfc && formData.receiverRfc !== CONFIG.EXPECTED_RECEIVER_RFC;

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

      {/* Week & Project */}
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Semana de Pago"
          options={weekOptions}
          value={formData.week}
          onChange={(e) => onFieldChange('week', e.target.value)}
        />
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
