import React, { useEffect, useState } from 'react';
import { Loader2, Mail, ShieldCheck, CheckSquare } from 'lucide-react';

// Hooks
import { useWeekOptions } from './hooks/useWeekOptions';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import { useInvoiceExtraction } from './hooks/useInvoiceExtraction';

// Services
import { submitInvoice, validateFormData } from './services/webhookService';

// Components
import { Header, WhatsAppButton } from './components/layout';
import { 
  FileUploadSection, 
  FiscalInfoSection, 
  PaymentSection, 
  ItemsTable 
} from './components/sections';

const App: React.FC = () => {
  // Hooks
  const { weekOptions, currentWeek } = useWeekOptions();
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
  } = useInvoiceForm();

  const {
    isExtracting,
    extractError,
    extractSuccess,
    handleExtraction,
  } = useInvoiceExtraction({ formData, setFormData });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Set initial week when loaded
  useEffect(() => {
    if (currentWeek && !formData.week) {
      setWeek(currentWeek);
    }
  }, [currentWeek, formData.week, setWeek]);

  // Auto-extraction effect when both files are uploaded
  useEffect(() => {
    if (formData.xmlFile && formData.pdfFile && !isExtracting && !extractSuccess) {
      handleExtraction();
    }
  }, [formData.xmlFile, formData.pdfFile, isExtracting, extractSuccess, handleExtraction]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateFormData(formData);
    if (!validation.valid) {
      alert(`Por favor corrige los siguientes errores:\n\n${validation.errors.join('\n')}`);
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
              isExtracting={isExtracting}
              extractSuccess={extractSuccess}
              extractError={extractError}
            />

            {/* STEP 2 & 3: Validation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Fiscal Info */}
              <FiscalInfoSection
                formData={formData}
                weekOptions={weekOptions}
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

            {/* Confirmation & Footer */}
            <div className="pt-6 border-t border-gray-100 flex flex-col gap-6">
              
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
                  onClick={() => window.open('https://wa.me/525512345678?text=Necesito ayuda con mi factura', '_blank')}
                >
                  <ShieldCheck size={16} /> ¿Necesitas ayuda?
                </button>

                <button 
                  type="submit" 
                  disabled={!isConfirmed || isSubmitting}
                  className={`font-bold text-lg py-3 px-8 rounded-xl shadow-lg transform transition-all duration-200 flex items-center gap-3 w-full md:w-auto justify-center
                    ${isConfirmed && !isSubmitting
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
    </div>
  );
};

export default App;
