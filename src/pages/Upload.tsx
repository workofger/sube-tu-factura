import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Send, HelpCircle, Check, AlertTriangle } from 'lucide-react';

// Hooks
import { useInvoiceForm } from '../hooks/useInvoiceForm';
import { useInvoiceExtraction, ValidationAlert } from '../hooks/useInvoiceExtraction';
import { useProjects } from '../hooks/useProjects';

// Services
import { submitInvoice, validateFormData } from '../services/webhookService';

// Components
import { Header, WhatsAppButton } from '../components/layout';
import { AlertPopup, AlertType, LateInvoiceModal } from '../components/common';
import { 
  FileUploadSection, 
  FiscalInfoSection, 
  PaymentSection, 
  ContactSection,
  ItemsTable,
  PaymentProgramSelector 
} from '../components/sections';

// Utilities
import { validateMatchingFilenames } from '../utils/xmlParser';
import { 
  validateInvoiceWeek, 
  getWeekNumber, 
  getMexicoNow, 
  getValidPeriodDescription, 
  formatDeadline, 
  LateReason 
} from '../utils/dates';

const UploadPage: React.FC = () => {
  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
  });

  // Late invoice modal state
  const [lateInvoiceModal, setLateInvoiceModal] = useState<{
    isOpen: boolean;
    reason: LateReason;
    invoiceDate: string;
  }>({
    isOpen: false,
    reason: 'after_deadline',
    invoiceDate: '',
  });

  // Filename error state
  const [filenameError, setFilenameError] = useState<string | null>(null);

  // Hooks
  const { projects, loading: projectsLoading } = useProjects();
  const { 
    formData, 
    setFormData, 
    updateField, 
    updateItem, 
    deleteItem,
    setWeek,
    isConfirmed,
    toggleConfirmation,
    itemsTotal,
    showRetentionIva,
    showRetentionIsr,
    setPaymentProgram,
    prontoPagoPreview,
    setLateInvoiceInfo,
    acknowledgeLateInvoice,
  } = useInvoiceForm();

  // Handle validation alerts from extraction
  const handleValidationAlert = useCallback((validationAlert: ValidationAlert) => {
    setAlertModal({
      isOpen: true,
      type: validationAlert.type as AlertType,
      title: validationAlert.title,
      message: validationAlert.message,
      details: validationAlert.details,
    });
  }, []);

  const {
    isExtracting,
    isValidating,
    extractError,
    extractSuccess,
    handleExtraction,
    canAttemptExtraction,
  } = useInvoiceExtraction({ 
    formData, 
    setFormData, 
    projects,
    onValidationAlert: handleValidationAlert 
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Close alert handler
  const closeAlertModal = useCallback(() => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Validate filenames match when both files are uploaded
  useEffect(() => {
    if (formData.xmlFile && formData.pdfFile) {
      const validation = validateMatchingFilenames(formData.xmlFile, formData.pdfFile);
      setFilenameError(validation.valid ? null : validation.error || null);
    } else {
      setFilenameError(null);
    }
  }, [formData.xmlFile, formData.pdfFile]);

  // Auto-extraction effect
  useEffect(() => {
    if (
      formData.xmlFile && 
      formData.pdfFile && 
      !isExtracting && 
      !isValidating && 
      !filenameError &&
      !extractError &&
      !extractSuccess &&
      canAttemptExtraction()
    ) {
      handleExtraction();
    }
  }, [formData.xmlFile, formData.pdfFile, isExtracting, isValidating, filenameError, extractError, extractSuccess, handleExtraction, canAttemptExtraction]);

  // Calculate payment week automatically after extraction success
  useEffect(() => {
    if (extractSuccess && formData.invoiceDate && !formData.week) {
      const validation = validateInvoiceWeek(formData.invoiceDate, formData.weekFromDescription);
      const mexicoNow = getMexicoNow();
      const currentWeek = getWeekNumber(mexicoNow);
      const currentYear = mexicoNow.getFullYear();
      
      setWeek(currentWeek.toString(), currentYear, validation.expectedWeek);
      setLateInvoiceInfo(validation.isLate, validation.reasons);
      
      if (validation.isLate && validation.reasons.length > 0) {
        setLateInvoiceModal({
          isOpen: true,
          reason: validation.reasons[0],
          invoiceDate: formData.invoiceDate,
        });
      }
    }
  }, [extractSuccess, formData.invoiceDate, formData.week, formData.weekFromDescription, setWeek, setLateInvoiceInfo]);

  // Handle late invoice confirmation
  const handleLateInvoiceConfirm = useCallback(() => {
    acknowledgeLateInvoice();
    setLateInvoiceModal(prev => ({ ...prev, isOpen: false }));
  }, [acknowledgeLateInvoice]);

  // Handle late invoice cancellation
  const handleLateInvoiceCancel = useCallback(() => {
    setLateInvoiceModal(prev => ({ ...prev, isOpen: false }));
    updateField('xmlFile', null);
    updateField('pdfFile', null);
    setWeek('');
    setLateInvoiceInfo(false, []);
  }, [updateField, setWeek, setLateInvoiceInfo]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateFormData(formData);
    if (!validation.valid) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Errores en el formulario',
        message: 'Por favor corrige los siguientes errores:',
        details: validation.errors.join('\n'),
      });
      return;
    }

    if (formData.isLate && !formData.lateAcknowledged) {
      setLateInvoiceModal({
        isOpen: true,
        reason: formData.lateReasons[0] || 'after_deadline',
        invoiceDate: formData.invoiceDate,
      });
      return;
    }

    if (!isConfirmed) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Confirmación requerida',
        message: 'Por favor confirma que la información es correcta antes de enviar.',
      });
      return;
    }
    
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      const result = await submitInvoice(formData);
      setSubmitResult(result);
      
      setAlertModal({
        isOpen: true,
        type: result.success ? 'success' : 'error',
        title: result.success ? '¡Factura enviada!' : 'Error al enviar',
        message: result.message,
      });
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitResult({
        success: false,
        message: "Error inesperado al enviar la factura.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = isConfirmed && !isSubmitting && (!formData.isLate || formData.lateAcknowledged);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-partrunner-black flex flex-col font-sans text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-grow px-4 pb-12 -mt-12 relative z-20">
        <div className="max-w-6xl mx-auto">
          {/* Main Card */}
          <div className="bg-white dark:bg-partrunner-charcoal rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/20 border border-gray-100 dark:border-partrunner-gray-dark p-6 md:p-10 animate-fade-in">
            
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Section 1: File Upload */}
              <FileUploadSection
                formData={formData}
                onFileChange={(field, file) => updateField(field, file)}
                isExtracting={isExtracting || isValidating}
                extractSuccess={extractSuccess}
                extractError={extractError}
                filenameError={filenameError}
              />

              {/* Sections 2 & 3: Fiscal Info and Payment - Side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FiscalInfoSection
                  formData={formData}
                  projects={projects}
                  projectsLoading={projectsLoading}
                  onFieldChange={updateField}
                  readOnly={extractSuccess}
                />

                <PaymentSection
                  formData={formData}
                  showRetentionIva={showRetentionIva}
                  showRetentionIsr={showRetentionIsr}
                  onFieldChange={updateField}
                  readOnly={extractSuccess}
                />
              </div>

              {/* Section 4: Items Table */}
              <ItemsTable
                items={formData.items}
                onItemChange={updateItem}
                onDeleteItem={deleteItem}
                itemsTotal={itemsTotal}
              />

              {/* Section 5: Payment Program Selection */}
              <PaymentProgramSelector
                selectedProgram={formData.paymentProgram}
                onProgramChange={setPaymentProgram}
                totalAmount={parseFloat(formData.totalAmount) || 0}
                prontoPagoPreview={prontoPagoPreview}
                disabled={!extractSuccess}
              />

              {/* Section 6: Contact Information (moved here) */}
              <ContactSection
                formData={formData}
                onFieldChange={updateField}
              />

              {/* Section 7: Confirmation & Submit */}
              <div className="pt-6 border-t border-gray-100 dark:border-partrunner-gray-dark space-y-5">
                
                {/* Late Invoice Warning */}
                {formData.isLate && formData.lateAcknowledged && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30">
                    <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>Factura extemporánea:</strong> Esta factura se programará para el siguiente ciclo de pago.
                    </p>
                  </div>
                )}

                {/* Confirmation Checkbox */}
                <div className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  isConfirmed 
                    ? 'bg-partrunner-yellow/10 border-partrunner-yellow/30 dark:bg-partrunner-yellow/5' 
                    : 'bg-gray-50 dark:bg-partrunner-black/30 border-gray-200 dark:border-partrunner-gray-dark hover:border-partrunner-yellow/30'
                }`}
                onClick={toggleConfirmation}
                >
                  <button 
                    type="button"
                    className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                      isConfirmed 
                        ? 'bg-partrunner-yellow border-partrunner-yellow' 
                        : 'bg-white dark:bg-partrunner-charcoal border-gray-300 dark:border-partrunner-gray-dark'
                    }`}
                  >
                    {isConfirmed && <Check size={14} className="text-partrunner-black" strokeWidth={3} />}
                  </button>
                  <label className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none leading-relaxed">
                    Confirmo que he revisado la información extraída (conceptos, montos, RFC y proyecto) y es correcta para su procesamiento.
                  </label>
                </div>

                {/* Submit Result Message */}
                {submitResult && (
                  <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${
                    submitResult.success 
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30' 
                      : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                  }`}>
                    {submitResult.success ? <Check size={18} /> : <AlertTriangle size={18} />}
                    {submitResult.message}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
                  <button 
                    type="button" 
                    className="btn-ghost flex items-center gap-2"
                    onClick={() => window.open('https://wa.me/5215644443529?text=Necesito ayuda con mi factura', '_blank')}
                  >
                    <HelpCircle size={18} />
                    ¿Necesitas ayuda?
                  </button>

                  <button 
                    type="submit" 
                    disabled={!canSubmit}
                    className={`
                      font-bold text-lg py-4 px-10 rounded-xl shadow-lg transform transition-all duration-200 
                      flex items-center gap-3 w-full md:w-auto justify-center
                      ${canSubmit
                        ? 'btn-primary hover:-translate-y-0.5' 
                        : 'bg-gray-200 dark:bg-partrunner-gray-dark text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                      }
                    `}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={22} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={22} />
                        Enviar Factura
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      </main>

      {/* WhatsApp FAB */}
      <WhatsAppButton />

      {/* Validation Alert Popup */}
      <AlertPopup
        isOpen={alertModal.isOpen}
        onClose={closeAlertModal}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        details={alertModal.details}
      />

      {/* Late Invoice Modal */}
      <LateInvoiceModal
        isOpen={lateInvoiceModal.isOpen}
        onClose={handleLateInvoiceCancel}
        onConfirm={handleLateInvoiceConfirm}
        reason={lateInvoiceModal.reason}
        invoiceDate={lateInvoiceModal.invoiceDate}
        validPeriod={getValidPeriodDescription()}
        deadline={formatDeadline()}
      />
    </div>
  );
};

export default UploadPage;
