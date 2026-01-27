import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Mail, ShieldCheck, CheckSquare } from 'lucide-react';

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
  // Alert modal state (renamed to avoid conflict with window.alert)
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
    // Pronto Pago
    setPaymentProgram,
    prontoPagoPreview,
    // Late invoice
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

  // Auto-extraction effect when both files are uploaded and filenames match
  // Uses canAttemptExtraction to prevent infinite loops when validation fails
  // Also checks extractError to prevent retries after failures
  useEffect(() => {
    if (
      formData.xmlFile && 
      formData.pdfFile && 
      !isExtracting && 
      !isValidating && 
      !filenameError &&
      !extractError &&  // Don't retry if there was an error
      !extractSuccess && // Don't re-extract if already successful
      canAttemptExtraction()
    ) {
      handleExtraction();
    }
  }, [formData.xmlFile, formData.pdfFile, isExtracting, isValidating, filenameError, extractError, extractSuccess, handleExtraction, canAttemptExtraction]);

  // Calculate payment week automatically after extraction success
  useEffect(() => {
    if (extractSuccess && formData.invoiceDate && !formData.week) {
      // Validate invoice using new logic
      const validation = validateInvoiceWeek(formData.invoiceDate, formData.weekFromDescription);
      const mexicoNow = getMexicoNow();
      const currentWeek = getWeekNumber(mexicoNow);
      const currentYear = mexicoNow.getFullYear();
      
      // Set week and year (current week for filing, expected week for billing)
      setWeek(currentWeek.toString(), currentYear, validation.expectedWeek);
      
      // Set late invoice info with all reasons
      setLateInvoiceInfo(validation.isLate, validation.reasons);
      
      // If late, show confirmation modal with first reason
      if (validation.isLate && validation.reasons.length > 0) {
        setLateInvoiceModal({
          isOpen: true,
          reason: validation.reasons[0], // Show primary reason
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

  // Handle late invoice cancellation (clear files)
  const handleLateInvoiceCancel = useCallback(() => {
    setLateInvoiceModal(prev => ({ ...prev, isOpen: false }));
    // Reset the form to allow uploading different files
    updateField('xmlFile', null);
    updateField('pdfFile', null);
    setWeek('');
    setLateInvoiceInfo(false, []);
  }, [updateField, setWeek, setLateInvoiceInfo]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateFormData(formData);
    if (!validation.valid) {
      alert(`Por favor corrige los siguientes errores:\n\n${validation.errors.join('\n')}`);
      return;
    }

    // Check if late invoice needs acknowledgment
    if (formData.isLate && !formData.lateAcknowledged) {
      setLateInvoiceModal({
        isOpen: true,
        reason: formData.lateReasons[0] || 'after_deadline',
        invoiceDate: formData.invoiceDate,
      });
      return;
    }

    if (!isConfirmed) {
      alert("Por favor confirma que la información es correcta.");
      return;
    }
    
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      const result = await submitInvoice(formData);
      setSubmitResult(result);
      
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-grow px-4 pb-12 -mt-10 relative z-20">
        <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10">
          
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* STEP 1: File Upload */}
            <FileUploadSection
              formData={formData}
              onFileChange={(field, file) => updateField(field, file)}
              isExtracting={isExtracting || isValidating}
              extractSuccess={extractSuccess}
              extractError={extractError}
              filenameError={filenameError}
            />

            {/* STEP 2 & 3: Validation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Fiscal Info */}
              <FiscalInfoSection
                formData={formData}
                projects={projects}
                projectsLoading={projectsLoading}
                onFieldChange={updateField}
              />

              {/* Right Column: Payment & Financials */}
              <PaymentSection
                formData={formData}
                showRetentionIva={showRetentionIva}
                showRetentionIsr={showRetentionIsr}
                onFieldChange={updateField}
              />
            </div>

            {/* STEP 4: Items Table */}
            <ItemsTable
              items={formData.items}
              onItemChange={updateItem}
              onDeleteItem={deleteItem}
              itemsTotal={itemsTotal}
            />

            {/* STEP 5: Payment Program Selection */}
            <PaymentProgramSelector
              selectedProgram={formData.paymentProgram}
              onProgramChange={setPaymentProgram}
              totalAmount={parseFloat(formData.totalAmount) || 0}
              prontoPagoPreview={prontoPagoPreview}
              disabled={!extractSuccess}
            />

            {/* Confirmation & Footer */}
            <div className="pt-6 border-t border-gray-100 flex flex-col gap-6">
              
              {/* Late Invoice Warning (if applicable) */}
              {formData.isLate && formData.lateAcknowledged && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-amber-600">⚠️</span>
                  <p className="text-sm text-amber-700">
                    <strong>Factura extemporánea:</strong> Esta factura se programará para el siguiente ciclo de pago.
                  </p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <button 
                  type="button"
                  onClick={toggleConfirmation}
                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    isConfirmed ? 'bg-yellow-500 border-yellow-500' : 'bg-white border-gray-300'
                  }`}
                >
                  {isConfirmed && <CheckSquare size={16} className="text-white" />}
                </button>
                <label 
                  onClick={toggleConfirmation}
                  className="text-sm text-gray-800 cursor-pointer select-none"
                >
                  Confirmo que he revisado la información extraída (conceptos, montos, RFC y proyecto) y es correcta para su procesamiento.
                </label>
              </div>

              {/* Submit Result Message */}
              {submitResult && (
                <div className={`p-3 rounded-lg text-sm font-medium ${
                  submitResult.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {submitResult.message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <button 
                  type="button" 
                  className="text-gray-500 hover:text-gray-800 font-medium text-sm flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                  onClick={() => window.open('https://wa.me/5215644443529?text=Necesito ayuda con mi factura', '_blank')}
                >
                  <ShieldCheck size={16} /> ¿Necesitas ayuda?
                </button>

                <button 
                  type="submit" 
                  disabled={!isConfirmed || isSubmitting || (formData.isLate && !formData.lateAcknowledged)}
                  className={`font-bold text-lg py-3 px-8 rounded-xl shadow-lg transform transition-all duration-200 flex items-center gap-3 w-full md:w-auto justify-center
                    ${isConfirmed && !isSubmitting && (!formData.isLate || formData.lateAcknowledged)
                      ? 'bg-[#B91C1C] hover:bg-[#991B1B] text-white shadow-red-200 hover:shadow-xl hover:shadow-red-100 hover:-translate-y-0.5' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    }
                  `}
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                  {isSubmitting ? 'Enviando...' : 'Validar y Enviar Factura'}
                </button>
              </div>
            </div>

          </form>
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
