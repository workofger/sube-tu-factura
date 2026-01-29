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
          <span className="px-2 py-1 bg-partrunner-yellow/20 text-partrunner-yellow-accent text-xs rounded-full flex items-center gap-1 font-medium">
            <CheckCircle className="w-3 h-3" />
            Activa
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-600 text-xs rounded-full flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" />
            Expirada
          </span>
        );
      case 'revoked':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full flex items-center gap-1 font-medium">
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
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-partrunner-black mb-2">Acceso Restringido</h2>
          <p className="text-partrunner-gray-dark">
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
          <h1 className="text-2xl font-bold text-partrunner-black mb-2">API Keys</h1>
          <p className="text-partrunner-gray-dark">
            Gestiona las llaves de acceso programático a la API
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-medium rounded-xl shadow-partrunner transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva API Key
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-600">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-600"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Newly Created Key Alert */}
      {createdKey && (
        <div className="mb-6 p-6 bg-partrunner-yellow/10 border border-partrunner-yellow/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-partrunner-yellow-accent" />
            <span className="text-partrunner-black font-semibold">API Key creada exitosamente</span>
          </div>
          <p className="text-amber-600 text-sm mb-4">
            ⚠️ Copia esta key ahora. No podrás verla de nuevo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 bg-white border border-partrunner-gray-light rounded-xl text-partrunner-yellow-accent font-mono text-sm overflow-x-auto">
              {createdKey.key}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey.key)}
              className="px-4 py-3 bg-partrunner-bg-main hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2"
            >
              {keyCopied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-partrunner-yellow-accent" />
                  <span className="text-partrunner-yellow-accent">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-partrunner-gray-dark" />
                  <span className="text-partrunner-gray-dark">Copiar</span>
                </>
              )}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-4 text-partrunner-gray-dark hover:text-partrunner-black text-sm"
          >
            Entendido, ya copié la key
          </button>
        </div>
      )}

      {/* API Keys List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-partrunner-yellow-accent animate-spin" />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="bg-white rounded-2xl border border-partrunner-gray-light p-12 text-center shadow-card">
          <Key className="w-16 h-16 text-partrunner-gray-light mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-partrunner-black mb-2">No hay API Keys</h3>
          <p className="text-partrunner-gray-dark mb-6">
            Crea tu primera API key para acceder a la API de forma programática.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-partrunner"
          >
            Crear API Key
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-partrunner-gray-light shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-partrunner-gray-light bg-partrunner-bg-main">
                <th className="px-6 py-4 text-left text-sm font-semibold text-partrunner-gray-dark">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-partrunner-gray-dark">Prefijo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-partrunner-gray-dark">Permisos</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-partrunner-gray-dark">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-partrunner-gray-dark">Uso</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-partrunner-gray-dark">Último Uso</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-partrunner-gray-dark">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id} className="border-b border-partrunner-gray-light/50 hover:bg-partrunner-bg-main/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-partrunner-black font-medium">{key.name}</p>
                      {key.description && (
                        <p className="text-partrunner-gray-dark text-sm">{key.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-partrunner-bg-main rounded text-partrunner-black font-mono text-sm">
                      {key.key_prefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <span 
                          key={scope} 
                          className="px-2 py-0.5 bg-partrunner-bg-main text-partrunner-gray-dark text-xs rounded"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(key)}
                  </td>
                  <td className="px-6 py-4 text-partrunner-black">
                    {key.total_requests.toLocaleString()} requests
                  </td>
                  <td className="px-6 py-4 text-partrunner-gray-dark text-sm">
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
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="bg-white rounded-2xl border border-partrunner-gray-light p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-partrunner-black mb-4">Nueva API Key</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-partrunner-black mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Mi API Key"
                  className="w-full px-4 py-3 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-partrunner-gray-dark/50 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-partrunner-black mb-2">
                  Descripción
                </label>
                <input
                  type="text"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  placeholder="Para integración con..."
                  className="w-full px-4 py-3 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-partrunner-gray-dark/50 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-partrunner-black mb-2">
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
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors border-2 ${
                        newKeyScopes.includes(scope)
                          ? 'bg-partrunner-yellow/10 text-partrunner-yellow-accent border-partrunner-yellow'
                          : 'bg-partrunner-bg-main text-partrunner-gray-dark border-partrunner-gray-light'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-partrunner-black mb-2">
                  Expira en (días)
                </label>
                <select
                  value={newKeyExpires || ''}
                  onChange={(e) => setNewKeyExpires(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-4 py-3 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
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
                className="flex-1 py-3 bg-partrunner-bg-main hover:bg-gray-200 text-partrunner-black font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || isCreating}
                className="flex-1 py-3 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-semibold rounded-xl shadow-partrunner disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-2xl border border-partrunner-gray-light p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-partrunner-black">Revocar API Key</h2>
                <p className="text-partrunner-gray-dark text-sm">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-partrunner-gray-dark mb-6">
              ¿Estás seguro de que deseas revocar la API key <strong className="text-partrunner-black">{keyToRevoke.name}</strong>?
              Cualquier integración que use esta key dejará de funcionar inmediatamente.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setKeyToRevoke(null)}
                className="flex-1 py-3 bg-partrunner-bg-main hover:bg-gray-200 text-partrunner-black font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevokeKey}
                disabled={isRevoking}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
