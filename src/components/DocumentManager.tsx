'use client';

import { useState, useEffect } from 'react';
import { FileText, Upload, X, Eye, Download, Trash2, Loader2, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from '@/lib/date-format';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  document_type: string;
  title?: string;
  description?: string;
  created_at: string;
  uploaded_by_profile?: {
    full_name: string;
  };
}

interface DocumentManagerProps {
  entityType: 'expense' | 'order' | 'delivery' | 'project';
  entityId: string;
  documentType?: 'receipt' | 'pod' | 'invoice' | 'quote' | 'contract' | 'other';
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function DocumentManager({
  entityType,
  entityId,
  documentType = 'other',
  isOpen,
  onClose,
  title = 'Documents'
}: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, entityId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        [`${entityType}_id`]: entityId,
      });
      
      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) throw new Error('Failed to load documents');
      
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB'
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      formData.append(`${entityType}_id`, entityId);
      formData.append('category', documentType);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast.success('Document uploaded successfully');
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete document');

      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleView = (doc: Document) => {
    setCurrentDoc(doc);
    setViewerOpen(true);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Upload Area */}
            <div className="mb-6">
              <input
                type="file"
                id={`doc-upload-${entityId}`}
                onChange={handleUpload}
                accept="image/*,.pdf"
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor={`doc-upload-${entityId}`}>
                <div className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  uploading ? "border-gray-200 bg-gray-50" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                )}>
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                      <p className="text-sm font-medium text-gray-900">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, PDF (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Document List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {getFileIcon(doc.file_type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.title || doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</span>
                        {doc.uploaded_by_profile && (
                          <>
                            <span>•</span>
                            <span>{doc.uploaded_by_profile.full_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(doc)}
                        className="p-2 hover:bg-white rounded-md transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 hover:bg-white rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      {viewerOpen && currentDoc && (
        <DocumentViewer
          document={currentDoc}
          onClose={() => {
            setViewerOpen(false);
            setCurrentDoc(null);
          }}
        />
      )}
    </>
  );
}

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
}

function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignedUrl();
  }, [document.id]);

  const fetchSignedUrl = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/signed-url`);
      if (!response.ok) throw new Error('Failed to get document URL');
      
      const data = await response.json();
      setSignedUrl(data.signed_url);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const isImage = document.file_type.startsWith('image/');
  const isPdf = document.file_type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{document.file_name}</h2>
          <div className="flex items-center gap-2">
            {signedUrl && (
              <a
                href={signedUrl}
                download={document.file_name}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5 text-gray-600" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : signedUrl ? (
            <div className="h-full min-h-[400px] flex items-center justify-center p-6">
              {isImage && (
                <img
                  src={signedUrl}
                  alt={document.file_name}
                  className="max-w-full max-h-full object-contain"
                />
              )}
              {isPdf && (
                <iframe
                  src={signedUrl}
                  className="w-full h-full min-h-[600px] border-0"
                  title={document.file_name}
                />
              )}
              {!isImage && !isPdf && (
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <a
                    href={signedUrl}
                    download={document.file_name}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className="text-gray-500">Failed to load document</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
