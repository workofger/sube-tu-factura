import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Key,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface UserListItem {
  id: string;
  rfc: string | null;
  fiscal_name: string | null;
  email: string;
  phone: string | null;
  type: 'flotillero' | 'independiente';
  status: string;
  email_verified: boolean;
  onboarding_completed: boolean;
  onboarding_step: string | null;
  has_bank_info: boolean;
  has_fiscal_info: boolean;
  auth_status: string;
  last_login_at: string | null;
  created_at: string;
  created_by_name: string | null;
  invite_sent_at: string | null;
  invite_method: string | null;
}

interface CreateUserForm {
  type: 'flotillero' | 'independiente';
  email: string;
  phone: string;
  rfc: string;
  fiscal_name: string;
  invite_method: 'magic_link' | 'temp_password';
}

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{
    success: boolean;
    message: string;
    data?: { tempPassword?: string; inviteUrl?: string };
  } | null>(null);

  // Action menu
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateUserForm>({
    type: 'independiente',
    email: '',
    phone: '',
    rfc: '',
    fiscal_name: '',
    invite_method: 'magic_link',
  });

  const getStoredToken = (): string | null => {
    return localStorage.getItem('admin_token');
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getStoredToken();
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '10');
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (onboardingFilter) params.set('onboarding', onboardingFilter);

      const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, typeFilter, onboardingFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateResult(null);

    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setCreateResult({
        success: data.success,
        message: data.message,
        data: data.data,
      });

      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      setCreateResult({
        success: false,
        message: 'Error al crear usuario',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendInvite = async (userId: string) => {
    try {
      const token = getStoredToken();
      const response = await fetch(
        `${API_BASE_URL}/api/admin/users?action=send-invite&id=${userId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        alert(`Enlace generado:\n${data.data.inviteUrl}\n\nCópialo y envíalo al usuario.`);
        fetchUsers();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Error al enviar invitación');
    }
    setActiveMenu(null);
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const token = getStoredToken();
      const response = await fetch(
        `${API_BASE_URL}/api/admin/users?action=reset-password&id=${userId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        alert(
          `Contraseña temporal generada:\n${data.data.tempPassword}\n\nCópiala y envíala al usuario.`
        );
        fetchUsers();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert('Error al resetear contraseña');
    }
    setActiveMenu(null);
  };

  const getAuthStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      active: {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      pending_setup: {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        icon: <Clock className="w-3 h-3" />,
      },
      pending_verification: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        icon: <Mail className="w-3 h-3" />,
      },
      pending_onboarding: {
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        icon: <AlertCircle className="w-3 h-3" />,
      },
      locked: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        icon: <XCircle className="w-3 h-3" />,
      },
    };

    const labels: Record<string, string> = {
      active: 'Activo',
      pending_setup: 'Pendiente Setup',
      pending_verification: 'Verificar Email',
      pending_onboarding: 'Onboarding',
      locked: 'Bloqueado',
    };

    const style = styles[status] || styles.pending_setup;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.icon}
        {labels[status] || status}
      </span>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Usuarios</h1>
          <p className="text-slate-400">Gestiona flotilleros y drivers independientes</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreateResult(null);
            setFormData({
              type: 'independiente',
              email: '',
              phone: '',
              rfc: '',
              fiscal_name: '',
              invite_method: 'magic_link',
            });
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por email, RFC, nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </form>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Todos los tipos</option>
              <option value="flotillero">Flotilleros</option>
              <option value="independiente">Independientes</option>
            </select>
          </div>

          {/* Onboarding Filter */}
          <select
            value={onboardingFilter}
            onChange={(e) => {
              setOnboardingFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todo onboarding</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completado</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              Reintentar
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <UsersIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">No se encontraron usuarios</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Usuario</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Tipo</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Estado</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Onboarding</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Último acceso</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
                            {user.type === 'flotillero' ? (
                              <Building2 className="w-5 h-5 text-blue-400" />
                            ) : (
                              <User className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.fiscal_name || user.email}</p>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            user.type === 'flotillero'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {user.type === 'flotillero' ? (
                            <Building2 className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          {user.type === 'flotillero' ? 'Flotillero' : 'Independiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getAuthStatusBadge(user.auth_status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.onboarding_completed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Completo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-sm">
                              <Clock className="w-4 h-4" />
                              Pendiente
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {user.has_bank_info && (
                            <span className="w-2 h-2 bg-emerald-500 rounded-full" title="Banco ✓" />
                          )}
                          {user.has_fiscal_info && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" title="Fiscal ✓" />
                          )}
                          {user.email_verified && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full" title="Email ✓" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-slate-400" />
                          </button>

                          {activeMenu === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10">
                              <button
                                onClick={() => handleSendInvite(user.id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                Enviar Invitación
                              </button>
                              <button
                                onClick={() => handleResetPassword(user.id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                              >
                                <Key className="w-4 h-4" />
                                Resetear Contraseña
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
              <p className="text-slate-400 text-sm">
                Mostrando {users.length} de {total} usuarios
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <span className="text-slate-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Crear Nuevo Usuario</h2>
              <p className="text-slate-400 text-sm mt-1">
                Ingresa los datos mínimos. El usuario completará el resto en el onboarding.
              </p>
            </div>

            {createResult?.success ? (
              <div className="p-6">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Usuario creado exitosamente</span>
                  </div>
                  <p className="text-emerald-300/80 text-sm">{createResult.message}</p>
                </div>

                {createResult.data?.tempPassword && (
                  <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                    <p className="text-slate-400 text-sm mb-2">Contraseña temporal:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-800 px-3 py-2 rounded-lg text-amber-400 font-mono">
                        {createResult.data.tempPassword}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createResult.data?.tempPassword || '')}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                    <p className="text-amber-400/70 text-xs mt-2">
                      ⚠️ Guarda esta contraseña. Solo se muestra una vez.
                    </p>
                  </div>
                )}

                {createResult.data?.inviteUrl && (
                  <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                    <p className="text-slate-400 text-sm mb-2">Enlace de invitación:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createResult.data.inviteUrl}
                        className="flex-1 bg-slate-800 px-3 py-2 rounded-lg text-emerald-400 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(createResult.data?.inviteUrl || '')}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">Válido por 7 días.</p>
                  </div>
                )}

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {createResult && !createResult.success && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400">{createResult.message}</p>
                  </div>
                )}

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tipo de usuario *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'independiente' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.type === 'independiente'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-900/50 border-slate-600/50 text-slate-400'
                      }`}
                    >
                      <User className="w-5 h-5" />
                      Independiente
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'flotillero' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.type === 'flotillero'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-slate-900/50 border-slate-600/50 text-slate-400'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      Flotillero
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="55 1234 5678"
                  />
                </div>

                {/* RFC (optional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    RFC <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="XAXX010101000"
                    maxLength={13}
                  />
                </div>

                {/* Fiscal Name (optional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre / Razón Social <span className="text-slate-500">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fiscal_name}
                    onChange={(e) => setFormData({ ...formData, fiscal_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Juan Pérez García"
                  />
                </div>

                {/* Invite Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Método de acceso *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, invite_method: 'magic_link' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.invite_method === 'magic_link'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                          : 'bg-slate-900/50 border-slate-600/50 text-slate-400'
                      }`}
                    >
                      <Send className="w-5 h-5" />
                      Magic Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, invite_method: 'temp_password' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.invite_method === 'temp_password'
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                          : 'bg-slate-900/50 border-slate-600/50 text-slate-400'
                      }`}
                    >
                      <Key className="w-5 h-5" />
                      Contraseña
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    {formData.invite_method === 'magic_link'
                      ? 'Se generará un enlace único para que el usuario configure su cuenta.'
                      : 'Se generará una contraseña temporal que el usuario deberá cambiar.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Crear Usuario
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {activeMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setActiveMenu(null)} />
      )}
    </AdminLayout>
  );
};

export default Users;
