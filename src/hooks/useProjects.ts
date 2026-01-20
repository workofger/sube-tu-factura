import { useState, useEffect } from 'react';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// API base URL
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Fallback projects in case API fails
const FALLBACK_PROJECTS: Project[] = [
  { id: '1', code: 'MERCADO_LIBRE', name: 'Mercado Libre', description: null, color: '#FFE600', is_active: true, sort_order: 1 },
  { id: '2', code: 'AMAZON', name: 'Amazon', description: null, color: '#FF9900', is_active: true, sort_order: 2 },
  { id: '3', code: 'RAPPI', name: 'Rappi', description: null, color: '#FF441F', is_active: true, sort_order: 3 },
  { id: '4', code: 'DINAMICA_FILMICA', name: 'Dinámica Fílmica', description: null, color: '#8B5CF6', is_active: true, sort_order: 4 },
  { id: '5', code: 'HOME_DEPOT', name: 'Home Depot', description: null, color: '#F97316', is_active: true, sort_order: 5 },
  { id: '6', code: 'WALMART', name: 'Walmart', description: null, color: '#0071DC', is_active: true, sort_order: 6 },
  { id: '7', code: 'OTROS', name: 'Otros', description: null, color: '#6B7280', is_active: true, sort_order: 99 },
];

export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setProjects(data.data);
      } else {
        // Use fallback if API returns unexpected format
        console.warn('Using fallback projects');
        setProjects(FALLBACK_PROJECTS);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('No se pudieron cargar los proyectos');
      // Keep fallback projects on error
      setProjects(FALLBACK_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects
  };
};

// Helper to get project options for select dropdown
export const getProjectOptions = (projects: Project[]) => {
  return projects.map(p => ({
    value: p.code,
    label: p.name,
    color: p.color
  }));
};
