'use client';

import { useState, useEffect } from 'react';
import { FileText, Image, File, Download, Eye, Upload, X, Trash2 } from 'lucide-react';
import DocumentUpload from './DocumentUpload';

interface AssociatedDocumentsProps {
  projectId?: string;
  orderId?: string;
  expenseId?: string;
  deliveryId?: string;
  title?: string;
}

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  title: string | null;
  category: string | null;
  created_at: string;
  uploaded_by_profile: {
    full_name: string;
  };
}

export default function AssociatedDocuments({
  projectId,
  orderId,
  expenseId,
  deliveryId,
  title = 'Associated Documents',
}: AssociatedDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [projectId, orderId, expenseId, deliveryId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);
      if (orderId) params.append('order_id', orderId);
      if (expenseId) params.append('expense_id', expenseId);
      if (deliveryId) params.append('delivery_id', deliveryId);

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      if (!response.ok) throw new Error('Failed to get download URL');

      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to download document');
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      if (!response.ok) throw new Error('Failed to get preview URL');

      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error previewing:', error);
      alert('Failed to preview document');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;

    try {
      const response = await fetch(`/api/documents?id=${doc.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete document');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1.5 text-sm"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {showUpload && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Upload Document</p>
            <button
              onClick={() => setShowUpload(false)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <DocumentUpload
            projectId={projectId}
            orderId={orderId}
            expenseId={expenseId}
            deliveryId={deliveryId}
            onUploadComplete={(doc) => {
              setDocuments(prev => [doc, ...prev]);
              setShowUpload(false);
            }}
            multiple={true}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <File className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm">No documents attached</p>
          <p className="text-xs mt-1">Click Upload to add documents</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              {getFileIcon(doc.file_type)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.title || doc.file_name}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{doc.uploaded_by_profile?.full_name}</span>
                  <span>•</span>
                  <span>{formatDate(doc.created_at)}</span>
                  {doc.category && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{doc.category}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePreview(doc)}
                  className="p-1.5 hover:bg-gray-200 rounded"
                  title="Preview"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 hover:bg-gray-200 rounded"
                  title="Download"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 hover:bg-red-50 rounded"
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
  );
}
