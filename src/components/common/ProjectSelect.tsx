import React from 'react';
import { Briefcase } from 'lucide-react';
import { Project } from '../../hooks/useProjects';

interface ProjectSelectProps {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  label?: string;
}

export const ProjectSelect: React.FC<ProjectSelectProps> = ({
  projects,
  value,
  onChange,
  loading = false,
  label = 'Proyecto'
}) => {
  const selectedProject = projects.find(p => p.code === value || p.name === value);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>
      <div className="relative">
        {/* Color indicator */}
        {selectedProject && (
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: selectedProject.color }}
          />
        )}
        {!selectedProject && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Briefcase size={16} />
          </div>
        )}
        
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className={`
            w-full bg-white border-2 border-gray-200 rounded-lg 
            py-2.5 pl-9 pr-10 outline-none 
            focus:border-yellow-400 transition-all duration-200 
            appearance-none text-gray-700 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            ${selectedProject ? 'font-medium' : ''}
          `}
          style={{
            borderLeftColor: selectedProject?.color || undefined,
            borderLeftWidth: selectedProject ? '4px' : '2px'
          }}
        >
          <option value="" disabled>
            {loading ? 'Cargando...' : 'Seleccionar proyecto...'}
          </option>
          {projects.map((project) => (
            <option 
              key={project.id} 
              value={project.code}
            >
              {project.name}
            </option>
          ))}
        </select>
        
        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
      
      {/* Project description tooltip */}
      {selectedProject?.description && (
        <p className="text-xs text-gray-500 ml-1 mt-0.5">
          {selectedProject.description}
        </p>
      )}
    </div>
  );
};
