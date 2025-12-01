'use client';

import { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  ZoomIn,
  Grid,
  Calendar,
  Loader2
} from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  category?: string;
  created_at: string;
  file_name: string;
  source_type?: 'document' | 'delivery';
  delivery_id?: string;
  delivery_date?: string;
}

interface ProjectPhotoGalleryProps {
  projectId: string;
}

export default function ProjectPhotoGallery({ projectId }: ProjectPhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'documents' | 'deliveries'>('all');

  useEffect(() => {
    fetchPhotos();
  }, [projectId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      
      // Fetch photos from documents (images associated with this project)
      const [docsResponse, deliveriesResponse] = await Promise.all([
        fetch(`/api/documents?project_id=${projectId}`),
        fetch(`/api/deliveries?project_id=${projectId}`)
      ]);

      const allPhotos: Photo[] = [];

      // Process document photos
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        const docPhotos = (docsData.documents || [])
          .filter((doc: any) => imageTypes.includes(doc.file_type))
          .map((doc: any) => ({
            id: doc.id,
            url: '', // Will be fetched on demand
            title: doc.title || doc.file_name,
            description: doc.description,
            category: doc.category,
            created_at: doc.created_at,
            file_name: doc.file_name,
            source_type: 'document' as const,
          }));
        
        allPhotos.push(...docPhotos);
      }

      // Process delivery POD photos
      if (deliveriesResponse.ok) {
        const deliveriesData = await deliveriesResponse.json();
        
        const deliveryPhotos = (deliveriesData.deliveries || [])
          .filter((d: any) => d.pod_url)
          .map((d: any) => ({
            id: `delivery-${d.id}`,
            url: d.pod_url,
            title: `Delivery Proof - ${d.delivery_date || 'N/A'}`,
            description: `Proof of delivery for ${d.items?.length || 0} items`,
            category: 'delivery',
            created_at: d.delivered_at || d.created_at,
            file_name: 'proof-of-delivery.jpg',
            source_type: 'delivery' as const,
            delivery_id: d.id,
            delivery_date: d.delivery_date,
          }));
        
        allPhotos.push(...deliveryPhotos);
      }

      // Sort by date, newest first
      allPhotos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = async (photo: Photo): Promise<string> => {
    if (photo.url) return photo.url;
    
    // Fetch signed URL for document photos
    if (photo.source_type === 'document') {
      try {
        const response = await fetch(`/api/documents/${photo.id}`);
        if (response.ok) {
          const data = await response.json();
          return data.url;
        }
      } catch (error) {
        console.error('Error getting photo URL:', error);
      }
    }
    return '';
  };

  const handlePhotoClick = async (index: number) => {
    const photo = filteredPhotos[index];
    if (!photo.url && photo.source_type === 'document') {
      const url = await getPhotoUrl(photo);
      setPhotos(prev => prev.map(p => 
        p.id === photo.id ? { ...p, url } : p
      ));
    }
    setSelectedIndex(index);
  };

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      handlePhotoClick(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < filteredPhotos.length - 1) {
      handlePhotoClick(selectedIndex + 1);
    }
  };

  const handleDownload = async (photo: Photo) => {
    const url = photo.url || await getPhotoUrl(photo);
    if (url) {
      try {
        // Fetch the file and download it directly
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = photo.title || photo.file_name || `photo-${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback: try to download via anchor tag with download attribute
        const link = document.createElement('a');
        link.href = url;
        link.download = photo.title || photo.file_name || `photo-${photo.id}.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredPhotos = photos.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'documents') return p.source_type === 'document';
    if (filter === 'deliveries') return p.source_type === 'delivery';
    return true;
  });

  const selectedPhoto = selectedIndex !== null ? filteredPhotos[selectedIndex] : null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Photo Gallery</h3>
            <span className="text-sm text-gray-500">({filteredPhotos.length} photos)</span>
          </div>
          
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'all' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('documents')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'documents' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setFilter('deliveries')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'deliveries' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Deliveries
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No photos found</p>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => handlePhotoClick(index)}
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.title || photo.file_name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.png';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                {/* Category badge */}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    photo.source_type === 'delivery'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {photo.source_type === 'delivery' ? 'POD' : photo.category || 'Photo'}
                  </span>
                </div>
                
                {/* Date */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(photo.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {selectedIndex !== null && selectedIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/10 rounded-full"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {selectedIndex !== null && selectedIndex < filteredPhotos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/10 rounded-full"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div 
            className="max-w-[90vw] max-h-[80vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedPhoto.url ? (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title || selectedPhoto.file_name}
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center w-64 h-64 bg-gray-800 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between text-white">
              <div>
                <h4 className="font-medium">{selectedPhoto.title || selectedPhoto.file_name}</h4>
                {selectedPhoto.description && (
                  <p className="text-sm text-gray-300">{selectedPhoto.description}</p>
                )}
                <p className="text-sm text-gray-400">
                  {formatDate(selectedPhoto.created_at)}
                  {selectedIndex !== null && ` • ${selectedIndex + 1} of ${filteredPhotos.length}`}
                </p>
              </div>
              <button
                onClick={() => handleDownload(selectedPhoto)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
