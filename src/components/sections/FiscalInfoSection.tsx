import React from 'react';
import { Building2, User, MapPin, FileText, Lock, FolderKanban, AlertCircle } from 'lucide-react';
import { InputField, SelectField } from '../common';
import { InvoiceData, ProjectType } from '../../types/invoice';
import { Project } from '../../hooks/useProjects';

interface FiscalInfoSectionProps {
  formData: InvoiceData;
  projects: Project[];
  projectsLoading: boolean;
  onFieldChange: <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => void;
  readOnly?: boolean;
}

export const FiscalInfoSection: React.FC<FiscalInfoSectionProps> = ({
  formData,
  projects,
  projectsLoading,
  onFieldChange,
  readOnly = false,
}) => {
  // Build project options from API
  const projectOptions = projects.length > 0
    ? projects.map(p => ({ value: p.code, label: p.name }))
    : Object.values(ProjectType).map(p => ({ value: p, label: p.replace(/_/g, ' ') }));

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="section-header">
        <span className="section-icon">
          <Building2 size={18} />
        </span>
        <h3 className="section-title">Datos Fiscales</h3>
        {readOnly && (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Lock size={12} />
            Solo lectura
          </span>
        )}
      </div>

      {/* Issuer Info */}
      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <User size={14} />
          Emisor
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="RFC Emisor"
            placeholder="XAXX010101000"
            value={formData.issuerRfc}
            onChange={(e) => onFieldChange('issuerRfc', e.target.value)}
            readOnly={readOnly}
          />
          <InputField
            label="Nombre / Razón Social"
            placeholder="Nombre del emisor"
            value={formData.issuerName}
            onChange={(e) => onFieldChange('issuerName', e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Régimen Fiscal"
            placeholder="612 - Personas Físicas..."
            value={formData.issuerRegime}
            onChange={(e) => onFieldChange('issuerRegime', e.target.value)}
            readOnly={readOnly}
          />
          <InputField
            label="Código Postal"
            placeholder="06600"
            value={formData.issuerZipCode}
            onChange={(e) => onFieldChange('issuerZipCode', e.target.value)}
            icon={<MapPin size={18} />}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Receiver Info */}
      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <Building2 size={14} />
          Receptor
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="RFC Receptor"
            placeholder="XAXX010101000"
            value={formData.receiverRfc}
            onChange={(e) => onFieldChange('receiverRfc', e.target.value)}
            readOnly={readOnly}
          />
          <InputField
            label="Nombre / Razón Social"
            placeholder="Nombre del receptor"
            value={formData.receiverName}
            onChange={(e) => onFieldChange('receiverName', e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Régimen Fiscal"
            placeholder="601 - General de Ley..."
            value={formData.receiverRegime}
            onChange={(e) => onFieldChange('receiverRegime', e.target.value)}
            readOnly={readOnly}
          />
          <InputField
            label="Uso CFDI"
            placeholder="G03 - Gastos en general"
            value={formData.cfdiUse}
            onChange={(e) => onFieldChange('cfdiUse', e.target.value)}
            icon={<FileText size={18} />}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Project Selection */}
      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <FolderKanban size={14} />
          Proyecto
          {readOnly && <Lock size={12} className="text-gray-400 ml-1" />}
        </h4>
        <SelectField
          label="Proyecto asignado"
          options={projectOptions}
          value={formData.project}
          onChange={(e) => onFieldChange('project', e.target.value as ProjectType)}
          disabled={projectsLoading || readOnly}
        />
        {formData.needsProjectReview && !readOnly && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm border border-amber-200">
            <AlertCircle size={16} />
            <span>El proyecto requiere revisión manual</span>
          </div>
        )}
      </div>
    </div>
  );
};

