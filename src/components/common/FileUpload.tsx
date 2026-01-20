import React from 'react';
import { Upload, CheckCircle, FileText, FileCode } from 'lucide-react';
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
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
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-bold text-gray-700 ml-1">{label}</label>
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
          className={`flex items-center justify-between w-full p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 
            ${file 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 hover:border-yellow-400 bg-gray-50 hover:bg-white'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${file ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
              {iconType === 'xml' ? <FileCode size={20} /> : <FileText size={20} />}
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${file ? 'text-green-800' : 'text-gray-600'}`}>
                {file ? file.name : 'Arrastra o haz clic para subir...'}
              </span>
              <span className="text-xs text-gray-400">
                {file ? formatFileSize(file.size) : `Archivo ${iconType.toUpperCase()}`}
              </span>
            </div>
          </div>
          {file ? <CheckCircle size={20} className="text-green-500" /> : <Upload size={20} className="text-gray-400" />}
        </label>
      </div>
    </div>
  );
};
