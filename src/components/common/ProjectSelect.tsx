import React from 'react';
import { Briefcase, ChevronDown, Lock } from 'lucide-react';
import { Project } from '../../hooks/useProjects';

interface ProjectSelectProps {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  label?: string;
  disabled?: boolean;
}

export const ProjectSelect: React.FC<ProjectSelectProps> = ({
  projects,
  value,
  onChange,
  loading = false,
  label = 'Proyecto',
  disabled = false
}) => {
  const selectedProject = projects.find(p => p.code === value || p.name === value);
  const isLocked = disabled || loading;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-0.5 flex items-center gap-1.5">
        {label}
        {disabled && <Lock size={12} className="text-gray-400 dark:text-gray-500" />}
      </label>
      <div className="relative group">
        {/* Color indicator */}
        {selectedProject && (
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-partrunner-charcoal shadow-sm z-10"
            style={{ backgroundColor: selectedProject.color }}
          />
        )}
        {!selectedProject && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
            <Briefcase size={16} />
          </div>
        )}
        
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLocked}
          className={`
            w-full rounded-xl py-2.5 pl-9 pr-10 outline-none appearance-none transition-all duration-200
            ${isLocked
              ? 'bg-gray-100 dark:bg-partrunner-black/50 border-2 border-gray-200 dark:border-partrunner-gray-dark text-gray-500 dark:text-gray-500 cursor-default'
              : 'bg-white dark:bg-partrunner-charcoal border-2 border-gray-200 dark:border-partrunner-gray-dark text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-partrunner-yellow/30 focus:border-partrunner-yellow focus:ring-2 focus:ring-partrunner-yellow/20 cursor-pointer'
            }
            ${selectedProject && !isLocked ? 'font-medium' : ''}
          `}
          style={{
            borderLeftColor: selectedProject?.color || undefined,
            borderLeftWidth: selectedProject ? '4px' : '2px'
          }}
        >
          <option value="" disabled className="text-gray-400">
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
        <div className={`absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none transition-colors duration-200
          ${isLocked ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400 group-focus-within:text-partrunner-yellow'}
        `}>
          <ChevronDown size={18} />
        </div>
      </div>
      
      {/* Project description */}
      {selectedProject?.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">
          {selectedProject.description}
        </p>
      )}
    </div>
  );
};
