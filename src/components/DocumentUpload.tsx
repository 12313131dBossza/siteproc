'use client';

import { useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  onUploadComplete?: (document: any) => void;
  projectId?: string;
  orderId?: string;
  expenseId?: string;
  deliveryId?: string;
  category?: string;
  multiple?: boolean;
}

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'zip', 'rar'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function DocumentUpload({
  onUploadComplete,
  projectId,
  orderId,
  expenseId,
  deliveryId,
  category: defaultCategory,
  multiple = false,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState<{
    title?: string;
    description?: string;
    category?: string;
    tags?: string;
  }>({
    category: defaultCategory,
  });

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50MB limit`;
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return `File type .${extension} is not allowed`;
    }

    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const newErrors: Record<string, string> = {};

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors[file.name] = error;
      } else {
        validFiles.push(file);
      }
    });

    setErrors(newErrors);
    
    if (!multiple && validFiles.length > 0) {
      setFiles([validFiles[0]]);
      setUploadStatus({ [validFiles[0].name]: 'pending' });
    } else {
      setFiles(prev => [...prev, ...validFiles]);
      const newStatus: Record<string, 'pending'> = {};
      validFiles.forEach(f => {
        newStatus[f.name] = 'pending';
      });
      setUploadStatus(prev => ({ ...prev, ...newStatus }));
    }
  }, [multiple]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileName];
      return newStatus;
    });
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fileName];
      return newErrors;
    });
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.tags) formData.append('tags', metadata.tags);
    if (projectId) formData.append('project_id', projectId);
    if (orderId) formData.append('order_id', orderId);
    if (expenseId) formData.append('expense_id', expenseId);
    if (deliveryId) formData.append('delivery_id', deliveryId);

    setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      
      setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

      if (onUploadComplete) {
        onUploadComplete(data.document);
      }

      // Remove file from list after successful upload
      setTimeout(() => {
        removeFile(file.name);
      }, 2000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
      setErrors(prev => ({ ...prev, [file.name]: error.message }));
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(f => uploadStatus[f.name] === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Drag and drop area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          type="file"
          id="file-upload"
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-2">
          {multiple ? 'Upload multiple files' : 'Upload a file'}
        </p>
        <p className="text-xs text-gray-400">
          Supported: {ALLOWED_EXTENSIONS.slice(0, 6).join(', ')}... (Max 50MB)
        </p>
      </div>

      {/* Metadata inputs */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              value={metadata.title || ''}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={metadata.category || ''}
              onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select category</option>
              <option value="invoice">Invoice</option>
              <option value="contract">Contract</option>
              <option value="photo">Photo</option>
              <option value="report">Report</option>
              <option value="drawing">Drawing</option>
              <option value="permit">Permit</option>
              <option value="receipt">Receipt</option>
              <option value="correspondence">Correspondence</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={metadata.description || ''}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="Document description"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (Optional, comma-separated)
            </label>
            <input
              type="text"
              value={metadata.tags || ''}
              onChange={(e) => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              Files ({files.length})
            </h3>
            <button
              onClick={handleUploadAll}
              disabled={!files.some(f => uploadStatus[f.name] === 'pending')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              Upload All
            </button>
          </div>

          {files.map(file => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
            >
              {getFileIcon(file)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
                
                {uploadStatus[file.name] === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress[file.name] || 0}%` }}
                    />
                  </div>
                )}
                
                {errors[file.name] && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors[file.name]}
                  </p>
                )}
              </div>

              {uploadStatus[file.name] === 'pending' && (
                <button
                  onClick={() => removeFile(file.name)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}

              {uploadStatus[file.name] === 'uploading' && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}

              {uploadStatus[file.name] === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}

              {uploadStatus[file.name] === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
