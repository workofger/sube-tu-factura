import React from 'react';
import { User, ShieldCheck, Calendar, Hash, AlertTriangle, Clock, Info, Lock, Building } from 'lucide-react';
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
  readOnly?: boolean;
}

export const FiscalInfoSection: React.FC<FiscalInfoSectionProps> = ({
  formData,
  projects,
  projectsLoading = false,
  onFieldChange,
  readOnly = false,
}) => {

  const rfcMismatch = formData.receiverRfc && formData.receiverRfc !== CONFIG.EXPECTED_RECEIVER_RFC;
  const validPeriod = getValidPeriodDescription();
  const deadline = formatDeadline();

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="section-header">
        <span className="section-icon">
          <Building size={18} />
        </span>
        <h3 className="section-title">Información Fiscal</h3>
        {readOnly && (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Lock size={12} />
            Solo lectura
          </span>
        )}
      </div>

      {/* Issuer Details */}
      <div className="card p-4 space-y-4">
        <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <User size={14} />
          Datos del Emisor
        </h4>
        <InputField
          label="Razón Social Emisor"
          placeholder="Nombre completo"
          value={formData.billerName}
          onChange={(e) => onFieldChange('billerName', e.target.value)}
          icon={<User size={18} />}
          readOnly={readOnly}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="RFC Emisor"
            placeholder="XAXX010101000"
            value={formData.rfc}
            onChange={(e) => onFieldChange('rfc', e.target.value.toUpperCase())}
            icon={<ShieldCheck size={18} />}
            readOnly={readOnly}
          />
          <InputField
            label="Régimen Fiscal"
            placeholder="612 - Personas Físicas..."
            value={formData.issuerRegime}
            onChange={(e) => onFieldChange('issuerRegime', e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <InputField
          label="C.P. Emisor"
          placeholder="06600"
          value={formData.issuerZipCode || ''}
          onChange={(e) => onFieldChange('issuerZipCode', e.target.value)}
          className="w-1/2"
          readOnly={readOnly}
        />
      </div>

      {/* Receiver Details with Validation */}
      <div className={`card p-4 space-y-4 ${
        rfcMismatch 
          ? 'border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5' 
          : ''
      }`}>
        <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck size={14} />
          Datos del Receptor
          <span className="text-xs font-normal normal-case ml-2 text-gray-400">
            (Esperado: {CONFIG.EXPECTED_RECEIVER_RFC})
          </span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InputField
            label="RFC Receptor"
            value={formData.receiverRfc}
            onChange={(e) => onFieldChange('receiverRfc', e.target.value.toUpperCase())}
            error={rfcMismatch ? "RFC incorrecto" : undefined}
            helperText={formData.receiverRfc === CONFIG.EXPECTED_RECEIVER_RFC ? "RFC Correcto" : undefined}
            readOnly={readOnly}
          />
          <InputField
            label="Régimen Receptor"
            value={formData.receiverRegime}
            onChange={(e) => onFieldChange('receiverRegime', e.target.value)}
            placeholder="601 - General de Ley"
            readOnly={readOnly}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Uso CFDI"
            value={formData.cfdiUse || ''}
            onChange={(e) => onFieldChange('cfdiUse', e.target.value)}
            placeholder="G03 - Gastos en general"
            readOnly={readOnly}
          />
          <InputField
            label="C.P. Receptor"
            value={formData.receiverZipCode || ''}
            onChange={(e) => onFieldChange('receiverZipCode', e.target.value)}
            placeholder="06600"
            readOnly={readOnly}
          />
        </div>
        {rfcMismatch && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 p-3 rounded-lg flex items-center gap-2">
            <AlertTriangle size={14} /> El RFC no coincide con {CONFIG.EXPECTED_RECEIVER_RFC}
          </div>
        )}
      </div>

      {/* Week Info & Project */}
      <div className="grid grid-cols-2 gap-4">
        {/* Week Info Box - Always Read Only */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 ml-0.5">
            Semana de Pago
          </label>
          <div className={`p-4 rounded-xl border-2 transition-colors ${
            formData.isLate 
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' 
              : 'bg-partrunner-yellow/5 dark:bg-partrunner-yellow/10 border-partrunner-yellow/20 dark:border-partrunner-yellow/20'
          }`}>
            {formData.week ? (
              <>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className={formData.isLate ? 'text-amber-500' : 'text-partrunner-yellow'} />
                  <span className={`font-bold ${
                    formData.isLate 
                      ? 'text-amber-700 dark:text-amber-400' 
                      : 'text-partrunner-yellow-dark dark:text-partrunner-yellow'
                  }`}>
                    Semana {formData.week} - {formData.year}
                  </span>
                </div>
                {formData.isLate && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={12} />
                    <span>Extemporánea - Siguiente ciclo</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                <Info size={16} />
                <span className="text-sm">Se calculará automáticamente</span>
              </div>
            )}
          </div>
          {/* Valid period info */}
          <div className="space-y-0.5 mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {validPeriod}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Límite: {deadline}
            </p>
          </div>
        </div>

        <ProjectSelect
          projects={projects}
          value={formData.project}
          onChange={(value) => onFieldChange('project', value)}
          loading={projectsLoading}
          disabled={readOnly}
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
          readOnly={readOnly}
        />
        <InputField
          label="Folio"
          placeholder="Ej. A-123"
          value={formData.folio}
          onChange={(e) => onFieldChange('folio', e.target.value)}
          icon={<Hash size={18} />}
          readOnly={readOnly}
        />
      </div>

      {/* Series (optional) */}
      {formData.series && (
        <InputField
          label="Serie"
          value={formData.series}
          onChange={(e) => onFieldChange('series', e.target.value)}
          className="w-1/2"
          readOnly={readOnly}
        />
      )}
    </div>
  );
};
