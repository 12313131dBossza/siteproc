'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { 
  FileText, 
  Image, 
  File, 
  Download, 
  Eye, 
  Trash2, 
  Search, 
  Filter,
  Upload as UploadIcon,
  Tag,
  Calendar,
  User,
  FolderOpen,
  Edit,
  X
} from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';

interface Document {
  id: string;
  company_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_extension: string | null;
  storage_path: string;
  storage_bucket: string;
  title: string | null;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  project_id: string | null;
  order_id: string | null;
  expense_id: string | null;
  delivery_id: string | null;
  version: number;
  parent_document_id: string | null;
  is_latest_version: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
  projects?: { id: string; name: string; code: string };
  purchase_orders?: { id: string; po_number: string };
  expenses?: { id: string; description: string };
  deliveries?: { id: string; delivery_date: string };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);

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

  const handleSearch = () => {
    fetchDocuments();
  };

  const handleUploadComplete = (document: any) => {
    setDocuments(prev => [document, ...prev]);
    setShowUpload(false);
  };

  const handlePreview = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      if (!response.ok) throw new Error('Failed to get document URL');

      const data = await response.json();
      setPreviewUrl(data.url);
      setSelectedDoc(doc);
    } catch (error) {
      console.error('Error getting preview URL:', error);
      alert('Failed to load document preview');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      if (!response.ok) throw new Error('Failed to get download URL');

      const data = await response.json();
      
      // Fetch the file and download it directly
      const fileResponse = await fetch(data.url);
      const blob = await fileResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.file_name || `document-${doc.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to download document');
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

  const handleUpdateDocument = async (doc: Document, updates: Partial<Document>) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update document');

      const data = await response.json();
      setDocuments(prev => prev.map(d => d.id === doc.id ? data.document : d));
      setEditingDoc(null);
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update document');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryBadgeColor = (category: string | null) => {
    const colors: Record<string, string> = {
      invoice: 'bg-green-100 text-green-800',
      contract: 'bg-blue-100 text-blue-800',
      photo: 'bg-purple-100 text-purple-800',
      report: 'bg-yellow-100 text-yellow-800',
      drawing: 'bg-indigo-100 text-indigo-800',
      permit: 'bg-orange-100 text-orange-800',
      receipt: 'bg-pink-100 text-pink-800',
      correspondence: 'bg-teal-100 text-teal-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return category ? colors[category] || colors.other : colors.other;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">Manage and organize your project documents</p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Search
          </button>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
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

        {/* Upload Button */}
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium"
        >
          <UploadIcon className="h-5 w-5" />
          Upload
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
            multiple={true}
          />
        </div>
      )}

      {/* Documents Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No documents found</p>
          <button
            onClick={() => setShowUpload(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Associations
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.file_type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.title || doc.file_name}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {doc.description}
                            </p>
                          )}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doc.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.category && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(doc.category)}`}>
                          {doc.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{doc.profiles?.full_name}</p>
                        <p className="text-gray-500">{formatDate(doc.created_at)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        {doc.projects && (
                          <div className="text-blue-600">
                            Project: {doc.projects.name}
                          </div>
                        )}
                        {doc.purchase_orders && (
                          <div className="text-green-600">
                            Order: {doc.purchase_orders.po_number}
                          </div>
                        )}
                        {doc.expenses && (
                          <div className="text-purple-600">
                            Expense: {doc.expenses.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePreview(doc)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Download"
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setEditingDoc(doc)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedDoc && previewUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedDoc.title || selectedDoc.file_name}</h3>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setPreviewUrl(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {selectedDoc.file_type.startsWith('image/') ? (
                <img src={previewUrl} alt={selectedDoc.file_name} className="max-w-full h-auto" />
              ) : selectedDoc.file_type === 'application/pdf' ? (
                <iframe src={previewUrl} className="w-full h-[600px]" />
              ) : (
                <div className="text-center py-12">
                  <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownload(selectedDoc)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  defaultValue={editingDoc.title || editingDoc.file_name}
                  id="edit-title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  defaultValue={editingDoc.description || ''}
                  id="edit-description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  defaultValue={editingDoc.category || ''}
                  id="edit-category"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  defaultValue={editingDoc.tags?.join(', ') || ''}
                  id="edit-tags"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  const title = (document.getElementById('edit-title') as HTMLInputElement).value;
                  const description = (document.getElementById('edit-description') as HTMLTextAreaElement).value;
                  const category = (document.getElementById('edit-category') as HTMLSelectElement).value;
                  const tags = (document.getElementById('edit-tags') as HTMLInputElement).value;
                  
                  handleUpdateDocument(editingDoc, {
                    title,
                    description,
                    category,
                    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                  });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
}
