import React, { useState } from 'react';
import { Upload, FileText, FileCode, X } from 'lucide-react';
import { formatFileSize } from '../../utils/files';

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  iconType: 'pdf' | 'xml';
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  accept, 
  file, 
  onChange, 
  iconType 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      // Validate file type
      const fileExtension = droppedFile.name.split('.').pop()?.toLowerCase();
      if ((iconType === 'xml' && fileExtension === 'xml') || 
          (iconType === 'pdf' && fileExtension === 'pdf')) {
        onChange(droppedFile);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-0.5">{label}</label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id={`file-${label}`}
        />
        <label
          htmlFor={`file-${label}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            flex items-center justify-between w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 
            ${file 
              ? 'border-green-400 dark:border-green-500/50 bg-green-50 dark:bg-green-500/10' 
              : isDragging
                ? 'border-partrunner-yellow bg-partrunner-yellow/5 scale-[1.02]'
                : 'border-gray-200 dark:border-partrunner-gray-dark hover:border-partrunner-yellow/50 bg-gray-50 dark:bg-partrunner-black/30 hover:bg-white dark:hover:bg-partrunner-charcoal'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-colors duration-200 ${
              file 
                ? 'bg-green-200 dark:bg-green-500/20 text-green-600 dark:text-green-400' 
                : isDragging
                  ? 'bg-partrunner-yellow/20 text-partrunner-yellow'
                  : 'bg-gray-200 dark:bg-partrunner-gray-dark text-gray-500 dark:text-gray-400'
            }`}>
              {iconType === 'xml' ? <FileCode size={22} /> : <FileText size={22} />}
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-medium truncate max-w-[180px] ${
                file 
                  ? 'text-green-700 dark:text-green-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {file ? file.name : 'Arrastra o haz clic...'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {file ? formatFileSize(file.size) : `Archivo ${iconType.toUpperCase()}`}
              </span>
            </div>
          </div>
          
          {file ? (
            <button
              onClick={handleRemove}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-green-500 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
              title="Eliminar archivo"
            >
              <X size={18} />
            </button>
          ) : (
            <div className={`p-2 rounded-lg transition-colors duration-200 ${
              isDragging 
                ? 'bg-partrunner-yellow/20 text-partrunner-yellow' 
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              <Upload size={20} />
            </div>
          )}
        </label>
      </div>
    </div>
  );
};
