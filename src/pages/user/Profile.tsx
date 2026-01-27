import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import UserLayout from '../../components/user/UserLayout';
import { useUserAuthContext } from '../../contexts/UserAuthContext';
import { updateUserProfile, updateOnboardingBank } from '../../services/userService';

const UserProfile: React.FC = () => {
  const { user, refreshUser } = useUserAuthContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    phone: '',
    address: '',
    trade_name: '',
  });

  // Bank form
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_clabe: '',
    bank_institution_id: '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        phone: user.phone || '',
        address: user.address || '',
        trade_name: user.trade_name || '',
      });
      setBankForm({
        bank_name: user.bank_name || '',
        bank_clabe: '', // Don't pre-fill CLABE for security
        bank_institution_id: user.bank_institution_id || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await updateUserProfile(profileForm);

    if (result.success) {
      setSuccess('Información actualizada correctamente');
      await refreshUser();
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (bankForm.bank_clabe && bankForm.bank_clabe.length !== 18) {
      setError('La CLABE debe tener exactamente 18 dígitos');
      setIsSubmitting(false);
      return;
    }

    const result = await updateOnboardingBank({
      bank_name: bankForm.bank_name,
      bank_clabe: bankForm.bank_clabe,
      bank_institution_id: bankForm.bank_institution_id || undefined,
    });

    if (result.success) {
      setSuccess('Información bancaria actualizada');
      setBankForm((prev) => ({ ...prev, bank_clabe: '' })); // Clear CLABE after save
      await refreshUser();
    } else {
      setError(result.message);
    }

    setIsSubmitting(false);
  };

  return (
    <UserLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Mi Perfil</h1>
        <p className="text-slate-400">Administra tu información personal y bancaria</p>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <p className="text-emerald-400">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fiscal Information (Read-only) */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Información Fiscal</h2>
              <p className="text-slate-500 text-sm">
                Contacta al administrador para modificar
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">RFC</label>
              <p className="text-white font-mono bg-slate-900/50 px-4 py-3 rounded-xl">
                {user?.rfc || '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre / Razón Social</label>
              <p className="text-white bg-slate-900/50 px-4 py-3 rounded-xl">
                {user?.fiscal_name || '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <div className="flex items-center gap-2 text-white bg-slate-900/50 px-4 py-3 rounded-xl">
                <Mail className="w-4 h-4 text-slate-500" />
                {user?.email || '-'}
                {user?.email_verified && (
                  <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tipo de cuenta</label>
              <p className="text-white bg-slate-900/50 px-4 py-3 rounded-xl capitalize">
                {user?.type === 'flotillero' ? 'Flotillero' : 'Independiente'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Información de Contacto</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="55 1234 5678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre Comercial
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                <textarea
                  rows={2}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  placeholder="Calle, número, colonia, ciudad, estado, CP"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Guardar Cambios
            </button>
          </form>
        </div>

        {/* Bank Information */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Información Bancaria</h2>
              <p className="text-slate-500 text-sm">
                Para recibir tus pagos de forma segura
              </p>
            </div>
            {user?.bank_clabe && (
              <span className="ml-auto px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Configurado
              </span>
            )}
          </div>

          {/* Current Bank Info Display */}
          {user?.bank_name && (
            <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
              <p className="text-slate-400 text-sm mb-2">Cuenta actual registrada:</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-white font-medium">{user.bank_name}</p>
                  <p className="text-slate-500 text-sm font-mono">
                    CLABE: ****{user.bank_clabe?.slice(-4) || '****'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del Banco *
                </label>
                <input
                  type="text"
                  required
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="000000000000000000"
                />
                <p className="text-slate-500 text-xs mt-1">
                  {bankForm.bank_clabe.length}/18 dígitos
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 text-sm">
                ⚠️ Asegúrate de que la CLABE sea correcta. Los pagos se depositarán a esta cuenta.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || bankForm.bank_clabe.length !== 18}
              className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              Actualizar Datos Bancarios
            </button>
          </form>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserProfile;
