import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  X,
  Save,
  FolderKanban,
  Search,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import AdminLayout from '../../components/admin/AdminLayout';

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  keywords: string[] | null;
  ai_description: string | null;
  created_at: string;
}

interface ProjectFormData {
  code: string;
  name: string;
  description: string;
  color: string;
  keywords: string;
  ai_description: string;
}

const initialFormData: ProjectFormData = {
  code: '',
  name: '',
  description: '',
  color: '#FFD840',
  keywords: '',
  ai_description: ''
};

const Projects: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const canEdit = isSuperAdmin || adminUser?.role === 'operations';
  const canDelete = isSuperAdmin;

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/admin/projects?include_inactive=${showInactive}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.data || []);
      } else {
        setError(data.message || 'Error al cargar proyectos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filter projects by search
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open modal for create/edit
  const openModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        code: project.code,
        name: project.name,
        description: project.description || '',
        color: project.color || '#FFD840',
        keywords: project.keywords?.join(', ') || '',
        ai_description: project.ai_description || ''
      });
    } else {
      setEditingProject(null);
      setFormData(initialFormData);
    }
    setModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setEditingProject(null);
    setFormData(initialFormData);
  };

  // Save project (create or update)
  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      setError('Código y nombre son requeridos');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const keywords = formData.keywords
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      const payload = {
        ...(editingProject && { id: editingProject.id }),
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        keywords,
        ai_description: formData.ai_description || null
      };

      const response = await fetch('/api/admin/projects', {
        method: editingProject ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        closeModal();
        fetchProjects();
      } else {
        setError(data.message || 'Error al guardar proyecto');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error saving project:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle project active status
  const toggleActive = async (project: Project) => {
    try {
      const response = await fetch('/api/admin/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: project.id,
          is_active: !project.is_active
        })
      });

      const data = await response.json();

      if (data.success) {
        fetchProjects();
      } else {
        setError(data.message || 'Error al actualizar proyecto');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  // Delete (deactivate) project
  const deleteProject = async (project: Project) => {
    if (!confirm(`¿Estás seguro de desactivar el proyecto "${project.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/projects?id=${project.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        fetchProjects();
      } else {
        setError(data.message || 'Error al desactivar proyecto');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-partrunner-yellow/20 rounded-xl flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-partrunner-yellow-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-partrunner-black">Proyectos</h1>
              <p className="text-partrunner-gray-dark text-sm">Administra los proyectos disponibles para facturas</p>
            </div>
          </div>
          
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-medium rounded-xl transition-colors shadow-partrunner"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light p-4 mb-6 shadow-card flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-partrunner-gray-dark" />
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-partrunner-gray-dark/50 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
              />
            </div>
          </div>
          
          <label className="flex items-center gap-2 text-sm text-partrunner-gray-dark cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-partrunner-gray-light text-partrunner-yellow focus:ring-partrunner-yellow"
            />
            Mostrar inactivos
          </label>
          
          <button
            onClick={fetchProjects}
            className="flex items-center gap-2 px-3 py-2.5 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-partrunner-bg-main rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Projects table */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light shadow-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-partrunner-gray-dark">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-partrunner-yellow-accent" />
              Cargando proyectos...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center text-partrunner-gray-dark">
              <FolderKanban className="w-12 h-12 mx-auto mb-2 text-partrunner-gray-light" />
              No se encontraron proyectos
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-partrunner-bg-main border-b border-partrunner-gray-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-partrunner-gray-dark uppercase tracking-wider">Proyecto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-partrunner-gray-dark uppercase tracking-wider">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-partrunner-gray-dark uppercase tracking-wider">Keywords</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-partrunner-gray-dark uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-partrunner-gray-dark uppercase tracking-wider">Orden</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-partrunner-gray-dark uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-partrunner-gray-light/50">
                {filteredProjects.map(project => (
                  <tr key={project.id} className={`hover:bg-partrunner-bg-main/50 transition-colors ${!project.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color || '#FFD840' }}
                        />
                        <div>
                          <p className="font-medium text-partrunner-black">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-partrunner-gray-dark truncate max-w-[200px]">{project.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-sm text-partrunner-yellow-accent bg-partrunner-yellow/10 px-2 py-1 rounded font-medium">
                        {project.code}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {project.keywords?.slice(0, 3).map((kw, i) => (
                          <span key={i} className="text-xs bg-partrunner-bg-main text-partrunner-gray-dark px-2 py-0.5 rounded">
                            {kw}
                          </span>
                        ))}
                        {(project.keywords?.length || 0) > 3 && (
                          <span className="text-xs text-partrunner-gray-dark">+{project.keywords!.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => toggleActive(project)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            project.is_active
                              ? 'bg-partrunner-yellow/20 text-partrunner-yellow-accent'
                              : 'bg-gray-100 text-partrunner-gray-dark'
                          }`}
                        >
                          {project.is_active ? (
                            <><ToggleRight className="w-4 h-4" /> Activo</>
                          ) : (
                            <><ToggleLeft className="w-4 h-4" /> Inactivo</>
                          )}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          project.is_active ? 'bg-partrunner-yellow/20 text-partrunner-yellow-accent' : 'bg-gray-100 text-partrunner-gray-dark'
                        }`}>
                          {project.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-partrunner-gray-dark">
                      {project.sort_order}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openModal(project)}
                            className="p-2 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-partrunner-bg-main rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && project.is_active && (
                          <button
                            onClick={() => deleteProject(project)}
                            className="p-2 text-partrunner-gray-dark hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
            
            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white border border-partrunner-gray-light rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-partrunner-gray-light">
                <h2 className="text-xl font-bold text-partrunner-black">
                  {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h2>
                <button onClick={closeModal} className="p-2 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-partrunner-bg-main rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-partrunner-black mb-1">Código *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="MERCADO_LIBRE"
                      className="w-full px-3 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-partrunner-black mb-1">Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-10 rounded cursor-pointer border border-partrunner-gray-light"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-3 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-partrunner-black mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Mercado Libre"
                    className="w-full px-3 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-partrunner-black mb-1">Descripción</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Entregas de Mercado Libre y Mercado Envíos"
                    className="w-full px-3 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-partrunner-black mb-1">Keywords (separadas por coma)</label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={e => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="mercado libre, meli, ml, mercado envios"
                    className="w-full px-3 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
                  />
                  <p className="text-xs text-partrunner-gray-dark mt-1">Palabras clave para matching automático con conceptos de facturas</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-partrunner-black mb-1">Descripción para IA</label>
                  <textarea
                    value={formData.ai_description}
                    onChange={e => setFormData(prev => ({ ...prev, ai_description: e.target.value }))}
                    placeholder="Descripción extendida para ayudar a la IA a identificar facturas de este proyecto..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-partrunner-gray-light bg-partrunner-bg-main">
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-partrunner-yellow hover:bg-partrunner-yellow-dark disabled:opacity-50 text-partrunner-black font-medium rounded-xl transition-colors shadow-partrunner"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Projects;
