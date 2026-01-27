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
  FileCheck,
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
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Email Verificado</h3>
                <p className="text-slate-400 mb-6">
                  Tu email {onboardingStatus.user.email} ha sido verificado.
                </p>
                <button
                  onClick={() => setCurrentStep('bank_info')}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25"
                >
                  Continuar
                  <ChevronRight className="w-5 h-5 inline ml-2" />
                </button>
              </>
            ) : (
              <>
                <Mail className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Verifica tu Email</h3>
                <p className="text-slate-400 mb-6">
                  Hemos enviado un enlace de verificación a{' '}
                  <strong className="text-white">{onboardingStatus?.user.email}</strong>
                </p>
                <p className="text-slate-500 text-sm">
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre del Banco *
              </label>
              <input
                type="text"
                required
                value={bankForm.bank_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="BBVA, Santander, Banorte..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="000000000000000000"
              />
              <p className="text-slate-500 text-xs mt-1">
                {bankForm.bank_clabe.length}/18 dígitos
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Número de Cuenta <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                type="text"
                value={bankForm.bank_account_number}
                onChange={(e) =>
                  setBankForm({ ...bankForm, bank_account_number: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Número de cuenta"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
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
              <label className="block text-sm font-medium text-slate-300 mb-2">RFC *</label>
              <input
                type="text"
                required
                maxLength={13}
                value={profileForm.rfc}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, rfc: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="XAXX010101000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre o Razón Social *
              </label>
              <input
                type="text"
                required
                value={profileForm.fiscal_name}
                onChange={(e) => setProfileForm({ ...profileForm, fiscal_name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Juan Pérez García"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre Comercial <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                type="text"
                value={profileForm.trade_name}
                onChange={(e) => setProfileForm({ ...profileForm, trade_name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Mi Empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono *</label>
              <input
                type="tel"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="55 1234 5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dirección *</label>
              <textarea
                required
                rows={2}
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                placeholder="Calle, número, colonia, ciudad, estado, CP"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
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
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">¡Todo listo!</h3>
              <p className="text-slate-400 mb-6">Has completado toda la información requerida.</p>
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 flex items-center gap-2 mx-auto disabled:opacity-50"
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
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Cambio de contraseña requerido</span>
              </div>
              <p className="text-amber-300/80 text-sm">
                Por seguridad, debes cambiar tu contraseña temporal.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña Actual (temporal) *
              </label>
              <input
                type="password"
                required
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">¡Configuración Completa!</h2>
          <p className="text-slate-400 mb-8">
            Has completado toda la información requerida. Ya puedes usar el portal.
          </p>
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Configura tu cuenta</h1>
              <p className="text-slate-400 text-sm">Completa los siguientes pasos para comenzar</p>
            </div>
          </div>

          {/* Progress Steps */}
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
                        ? 'text-emerald-400'
                        : status === 'current'
                        ? 'text-white bg-slate-700/50'
                        : 'text-slate-500'
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
                        status === 'completed' ? 'bg-emerald-500' : 'bg-slate-700'
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
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
              <p className="text-emerald-400">{success}</p>
            </div>
          )}

          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
