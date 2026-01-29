import React, { useState } from 'react';
import { Upload, FileText, FileCode, X, CheckCircle } from 'lucide-react';
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

  const getIconColor = () => {
    if (file) return iconType === 'xml' ? 'text-blue-600' : 'text-red-600';
    if (isDragging) return 'text-partrunner-yellow';
    return 'text-gray-400';
  };

  const getIconBgColor = () => {
    if (file) return iconType === 'xml' ? 'bg-blue-100' : 'bg-red-100';
    if (isDragging) return 'bg-partrunner-yellow/20';
    return 'bg-gray-100';
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700 ml-0.5">{label}</label>
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
            relative flex flex-col items-center justify-center w-full min-h-[140px] p-6 
            border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 
            ${file 
              ? 'border-partrunner-yellow bg-partrunner-yellow/10' 
              : isDragging
                ? 'border-partrunner-yellow bg-partrunner-yellow/5 scale-[1.02]'
                : 'border-gray-200 hover:border-partrunner-yellow/50 bg-gray-50 hover:bg-white'
            }
          `}
        >
          {/* Success indicator */}
          {file && (
            <div className="absolute top-3 right-3">
              <CheckCircle className="w-5 h-5 text-partrunner-yellow-accent" />
            </div>
          )}

          {/* Icon */}
          <div className={`p-4 rounded-2xl transition-all duration-200 mb-3 ${getIconBgColor()}`}>
            {iconType === 'xml' ? (
              <FileCode size={32} className={getIconColor()} />
            ) : (
              <FileText size={32} className={getIconColor()} />
            )}
          </div>

          {/* Text */}
          {file ? (
            <div className="text-center">
              <p className="text-partrunner-black font-semibold truncate max-w-[200px]">
                {file.name}
              </p>
              <p className="text-partrunner-gray-dark text-sm mt-1">
                {formatFileSize(file.size)}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className={`font-medium ${isDragging ? 'text-partrunner-yellow-dark' : 'text-gray-600'}`}>
                {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                o haz clic para seleccionar
              </p>
              <p className="text-gray-300 text-xs mt-2 uppercase">
                Archivo {iconType.toUpperCase()}
              </p>
            </div>
          )}

          {/* Upload icon indicator */}
          {!file && !isDragging && (
            <div className="absolute bottom-3 right-3 p-2 rounded-lg bg-white border border-gray-200">
              <Upload size={16} className="text-gray-400" />
            </div>
          )}
        </label>

        {/* Remove button */}
        {file && (
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-all duration-200"
            title="Eliminar archivo"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
