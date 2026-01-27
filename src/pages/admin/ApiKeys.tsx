import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  listApiKeys, 
  createApiKey, 
  revokeApiKey, 
  ApiKeyInfo,
  CreateApiKeyResponse 
} from '../../services/adminService';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const ApiKeys: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';

  const [isLoading, setIsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create key modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['public', 'admin']);
  const [newKeyExpires, setNewKeyExpires] = useState<number | null>(null);

  // Newly created key (shown once)
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // Revoke confirmation
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyInfo | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadApiKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await listApiKeys();

    if (response.success && response.data) {
      setApiKeys(response.data);
    } else {
      setError(response.message || 'Error al cargar API keys');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setIsCreating(true);

    const response = await createApiKey({
      name: newKeyName.trim(),
      description: newKeyDescription.trim() || undefined,
      scopes: newKeyScopes,
      expires_in_days: newKeyExpires || undefined,
    });

    if (response.success && response.data) {
      setCreatedKey(response.data);
      setShowCreateModal(false);
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyScopes(['public', 'admin']);
      setNewKeyExpires(null);
      loadApiKeys();
    } else {
      setError(response.message || 'Error al crear API key');
    }

    setIsCreating(false);
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;

    setIsRevoking(true);

    const response = await revokeApiKey(keyToRevoke.id);

    if (response.success) {
      setKeyToRevoke(null);
      loadApiKeys();
    } else {
      setError(response.message || 'Error al revocar API key');
    }

    setIsRevoking(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const getStatusBadge = (key: ApiKeyInfo) => {
    switch (key.status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Activa
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Expirada
          </span>
        );
      case 'revoked':
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Revocada
          </span>
        );
    }
  };

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Acceso Restringido</h2>
          <p className="text-slate-400">
            Solo los administradores con rol super_admin pueden gestionar API keys.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">API Keys</h1>
          <p className="text-slate-400">
            Gestiona las llaves de acceso programático a la API
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva API Key
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Newly Created Key Alert */}
      {createdKey && (
        <div className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 font-semibold">API Key creada exitosamente</span>
          </div>
          <p className="text-amber-300 text-sm mb-4">
            ⚠️ Copia esta key ahora. No podrás verla de nuevo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 bg-slate-900 rounded-xl text-emerald-400 font-mono text-sm overflow-x-auto">
              {createdKey.key}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey.key)}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-2"
            >
              {keyCopied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span className="text-slate-300">Copiar</span>
                </>
              )}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-4 text-slate-400 hover:text-slate-300 text-sm"
          >
            Entendido, ya copié la key
          </button>
        </div>
      )}

      {/* API Keys List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 text-center">
          <Key className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No hay API Keys</h3>
          <p className="text-slate-400 mb-6">
            Crea tu primera API key para acceder a la API de forma programática.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl"
          >
            Crear API Key
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Prefijo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Permisos</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Uso</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Último Uso</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{key.name}</p>
                      {key.description && (
                        <p className="text-slate-400 text-sm">{key.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-slate-900 rounded text-slate-300 font-mono text-sm">
                      {key.key_prefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <span 
                          key={scope} 
                          className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(key)}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {key.total_requests.toLocaleString()} requests
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {key.last_used_at 
                      ? new Date(key.last_used_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Nunca'
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    {key.status === 'active' && (
                      <button
                        onClick={() => setKeyToRevoke(key)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Revocar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Nueva API Key</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Mi API Key"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción
                </label>
                <input
                  type="text"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  placeholder="Para integración con..."
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Permisos
                </label>
                <div className="flex flex-wrap gap-2">
                  {['public', 'admin', 'export', 'user'].map((scope) => (
                    <button
                      key={scope}
                      onClick={() => {
                        if (newKeyScopes.includes(scope)) {
                          setNewKeyScopes(newKeyScopes.filter(s => s !== scope));
                        } else {
                          setNewKeyScopes([...newKeyScopes, scope]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        newKeyScopes.includes(scope)
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-slate-700 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Expira en (días)
                </label>
                <select
                  value={newKeyExpires || ''}
                  onChange={(e) => setNewKeyExpires(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Sin expiración</option>
                  <option value="30">30 días</option>
                  <option value="90">90 días</option>
                  <option value="180">180 días</option>
                  <option value="365">1 año</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || isCreating}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Crear Key
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {keyToRevoke && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Revocar API Key</h2>
                <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              ¿Estás seguro de que deseas revocar la API key <strong className="text-white">{keyToRevoke.name}</strong>?
              Cualquier integración que use esta key dejará de funcionar inmediatamente.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setKeyToRevoke(null)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevokeKey}
                disabled={isRevoking}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Revocando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Revocar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ApiKeys;
