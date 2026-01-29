import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Circle,
  Mail,
  Building2,
  User,
  Key,
  Loader2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useUserAuthContext } from '../../contexts/UserAuthContext';
import {
  updateOnboardingBank,
  updateOnboardingProfile,
  updateOnboardingPassword,
  completeOnboarding,
} from '../../services/userService';

type OnboardingStepKey = 'verify_email' | 'bank_info' | 'profile_info' | 'change_password';
type CurrentStepKey = OnboardingStepKey | 'completed';

const STEPS: { key: OnboardingStepKey; label: string; icon: React.ReactNode }[] = [
  { key: 'verify_email', label: 'Verificar Email', icon: <Mail className="w-5 h-5" /> },
  { key: 'bank_info', label: 'Datos Bancarios', icon: <Building2 className="w-5 h-5" /> },
  { key: 'profile_info', label: 'Información', icon: <User className="w-5 h-5" /> },
  { key: 'change_password', label: 'Contraseña', icon: <Key className="w-5 h-5" /> },
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { onboardingStatus, refreshOnboarding } = useUserAuthContext();

  const [currentStep, setCurrentStep] = useState<CurrentStepKey>('verify_email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bank form
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_clabe: '',
    bank_account_number: '',
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    rfc: '',
    fiscal_name: '',
    phone: '',
    address: '',
    trade_name: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (onboardingStatus) {
      setCurrentStep(onboardingStatus.currentStep as CurrentStepKey);

      // Pre-fill forms with existing data
      if (onboardingStatus.user) {
        setProfileForm((prev) => ({
          ...prev,
          rfc: onboardingStatus.user.rfc || '',
          fiscal_name: onboardingStatus.user.fiscal_name || '',
          phone: onboardingStatus.user.phone || '',
          address: onboardingStatus.user.address || '',
        }));
      }
    }
  }, [onboardingStatus]);

  const getStepStatus = (stepKey: OnboardingStepKey): 'completed' | 'current' | 'pending' => {
    if (!onboardingStatus?.steps) return 'pending';

    const step = onboardingStatus.steps[stepKey];
    if (!step) return 'pending';

    if (step.completed) return 'completed';
    if (stepKey === currentStep) return 'current';
    return 'pending';
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (bankForm.bank_clabe.length !== 18) {
      setError('La CLABE debe tener exactamente 18 dígitos');
      setIsSubmitting(false);
      return;
    }

    const result = await updateOnboardingBank(bankForm);

    if (result.success) {
      setSuccess('Información bancaria guardada');
      await refreshOnboarding();
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await updateOnboardingProfile(profileForm);

    if (result.success) {
      setSuccess('Información de perfil guardada');
      await refreshOnboarding();
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Las contraseñas no coinciden');
      setIsSubmitting(false);
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setIsSubmitting(false);
      return;
    }

    const result = await updateOnboardingPassword({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });

    if (result.success) {
      setSuccess('Contraseña actualizada');
      await refreshOnboarding();
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await completeOnboarding();

    if (result.success) {
      navigate('/portal/dashboard');
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'verify_email':
        return (
          <div className="text-center py-8">
            {onboardingStatus?.steps.verify_email.completed ? (
              <>
                <div className="w-20 h-20 bg-partrunner-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-partrunner-yellow-accent" />
                </div>
                <h3 className="text-xl font-semibold text-partrunner-black mb-2">Email Verificado</h3>
                <p className="text-gray-500 mb-6">
                  Tu email {onboardingStatus.user.email} ha sido verificado.
                </p>
                <button
                  onClick={() => setCurrentStep('bank_info')}
                  className="px-6 py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black rounded-xl font-semibold shadow-partrunner"
                >
                  Continuar
                  <ChevronRight className="w-5 h-5 inline ml-2" />
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-partrunner-black mb-2">Verifica tu Email</h3>
                <p className="text-gray-500 mb-6">
                  Hemos enviado un enlace de verificación a{' '}
                  <strong className="text-partrunner-black">{onboardingStatus?.user.email}</strong>
                </p>
                <p className="text-gray-400 text-sm">
                  Revisa tu bandeja de entrada y haz clic en el enlace para continuar.
                </p>
              </>
            )}
          </div>
        );

      case 'bank_info':
        return (
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Banco *
              </label>
              <input
                type="text"
                required
                value={bankForm.bank_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="BBVA, Santander, Banorte..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CLABE Interbancaria (18 dígitos) *
              </label>
              <input
                type="text"
                required
                maxLength={18}
                value={bankForm.bank_clabe}
                onChange={(e) =>
                  setBankForm({ ...bankForm, bank_clabe: e.target.value.replace(/\D/g, '') })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black font-mono focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="000000000000000000"
              />
              <p className="text-gray-400 text-xs mt-1">
                {bankForm.bank_clabe.length}/18 dígitos
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Cuenta <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={bankForm.bank_account_number}
                onChange={(e) =>
                  setBankForm({ ...bankForm, bank_account_number: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="Número de cuenta"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-partrunner disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Guardar y Continuar
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        );

      case 'profile_info':
        return (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RFC *</label>
              <input
                type="text"
                required
                maxLength={13}
                value={profileForm.rfc}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, rfc: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black font-mono focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="XAXX010101000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre o Razón Social *
              </label>
              <input
                type="text"
                required
                value={profileForm.fiscal_name}
                onChange={(e) => setProfileForm({ ...profileForm, fiscal_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="Juan Pérez García"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Comercial <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={profileForm.trade_name}
                onChange={(e) => setProfileForm({ ...profileForm, trade_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="Mi Empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
              <input
                type="tel"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="55 1234 5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección *</label>
              <textarea
                required
                rows={2}
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow resize-none"
                placeholder="Calle, número, colonia, ciudad, estado, CP"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-partrunner disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Guardar y Continuar
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        );

      case 'change_password':
        if (!onboardingStatus?.steps.change_password.required) {
          return (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-partrunner-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-partrunner-yellow-accent" />
              </div>
              <h3 className="text-xl font-semibold text-partrunner-black mb-2">¡Todo listo!</h3>
              <p className="text-gray-500 mb-6">Has completado toda la información requerida.</p>
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-6 py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black rounded-xl font-semibold shadow-partrunner flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    Comenzar a usar el portal
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          );
        }

        return (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Cambio de contraseña requerido</span>
              </div>
              <p className="text-amber-600 text-sm">
                Por seguridad, debes cambiar tu contraseña temporal.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña Actual (temporal) *
              </label>
              <input
                type="password"
                required
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-partrunner disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  Actualizar Contraseña
                  <Key className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  // Check if we can complete
  const canComplete = onboardingStatus?.canComplete && currentStep === 'completed';

  if (canComplete) {
    return (
      <div className="min-h-screen bg-partrunner-bg-main flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-partrunner-gray-light p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-20 h-20 bg-partrunner-yellow/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-partrunner-yellow-accent" />
          </div>
          <h2 className="text-2xl font-bold text-partrunner-black mb-4">¡Configuración Completa!</h2>
          <p className="text-gray-500 mb-8">
            Has completado toda la información requerida. Ya puedes usar el portal.
          </p>
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="w-full py-4 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-partrunner disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                Ir al Dashboard
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-partrunner-bg-main flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,216,64,0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,216,64,0.05),transparent_50%)]"></div>
      </div>

      <div className="bg-white rounded-2xl border border-partrunner-gray-light w-full max-w-2xl overflow-hidden shadow-xl relative z-10">
        {/* Header */}
        <div className="p-6 border-b border-partrunner-gray-light bg-partrunner-yellow">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="/images/logo-full-black.png"
              alt="Partrunner"
              className="h-10 w-auto"
            />
          </div>
          <h1 className="text-xl font-bold text-partrunner-black">Configura tu cuenta</h1>
          <p className="text-partrunner-black/70 text-sm">Completa los siguientes pasos para comenzar</p>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-partrunner-gray-light bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const status = getStepStatus(step.key);
              const isLast = index === STEPS.length - 1;

              // Skip password step if not required
              if (step.key === 'change_password' && !onboardingStatus?.steps.change_password.required) {
                return null;
              }

              return (
                <React.Fragment key={step.key}>
                  <button
                    onClick={() => {
                      if (status === 'completed' || status === 'current') {
                        setCurrentStep(step.key);
                      }
                    }}
                    disabled={status === 'pending'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      status === 'completed'
                        ? 'text-partrunner-yellow-accent'
                        : status === 'current'
                        ? 'text-partrunner-black bg-white shadow-sm border border-partrunner-gray-light'
                        : 'text-gray-400'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                  </button>
                  {!isLast && step.key !== 'change_password' && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        status === 'completed' ? 'bg-partrunner-yellow' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-partrunner-yellow/10 border border-partrunner-yellow/30 rounded-xl p-4 mb-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-partrunner-yellow-accent flex-shrink-0" />
              <p className="text-partrunner-black">{success}</p>
            </div>
          )}

          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
