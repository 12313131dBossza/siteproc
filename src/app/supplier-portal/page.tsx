'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  Truck,
  Package,
  Camera,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
  ChevronRight,
  LogOut,
  User,
  Building2,
  Calendar,
  MapPin,
  Upload,
  X,
  Send,
  Image as ImageIcon,
  History,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

interface Delivery {
  id: string;
  order_id: string;
  project_id: string;
  project_name: string;
  company_name: string;
  delivery_date: string;
  status: 'pending' | 'in_transit' | 'delivered';
  items: Array<{
    product_name: string;
    quantity: number;
  }>;
  address?: string;
  notes?: string;
  pod_url?: string;
}

interface Message {
  id: string;
  message: string;
  sender_type: 'company' | 'supplier';
  sender_name: string;
  created_at: string;
  is_read: boolean;
}

export default function SupplierPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [supplierInfo, setSupplierInfo] = useState<{
    name: string;
    companyName: string;
    projectName: string;
  } | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadSupplierData();
  }, []);

  const loadSupplierData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get supplier profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      // Fetch supplier's assigned deliveries
      const response = await fetch('/api/supplier/deliveries');
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
        
        if (data.deliveries?.length > 0) {
          setSupplierInfo({
            name: profile?.full_name || 'Supplier',
            companyName: data.deliveries[0].company_name || 'Company',
            projectName: data.deliveries[0].project_name || 'Project',
          });
        } else {
          setSupplierInfo({
            name: profile?.full_name || 'Supplier',
            companyName: 'No assignments',
            projectName: '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading supplier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (deliveryId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/supplier/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setDeliveries(prev => prev.map(d => 
          d.id === deliveryId ? { ...d, status: newStatus as any } : d
        ));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProof = async () => {
    if (!uploadFile || !selectedDelivery) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('delivery_id', selectedDelivery.id);

      const response = await fetch('/api/supplier/upload-proof', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setDeliveries(prev => prev.map(d => 
          d.id === selectedDelivery.id ? { ...d, pod_url: data.url, status: 'delivered' } : d
        ));
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPreview(null);
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
    } finally {
      setUploading(false);
    }
  };

  const loadMessages = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/supplier/messages?delivery_id=${deliveryId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDelivery) return;

    try {
      const response = await fetch('/api/supplier/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_id: selectedDelivery.id,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_transit': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="w-4 h-4" />;
      case 'in_transit': return <Truck className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Filter deliveries
  const activeDeliveries = deliveries.filter(d => d.status !== 'delivered');
  const pastDeliveries = deliveries.filter(d => d.status === 'delivered');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">You're working for</p>
                <h1 className="font-bold text-gray-900">{supplierInfo?.companyName}</h1>
                {supplierInfo?.projectName && (
                  <p className="text-xs text-gray-500">Project: {supplierInfo.projectName}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-32 space-y-6">
        {/* Active Deliveries Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Active Deliveries
            {activeDeliveries.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {activeDeliveries.length}
              </span>
            )}
          </h2>

          {activeDeliveries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">All caught up!</p>
              <p className="text-sm text-gray-500">No pending deliveries</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDeliveries.map(delivery => (
                <div
                  key={delivery.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Delivery Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">
                            {formatDate(delivery.delivery_date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{delivery.project_name}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(delivery.status)}`}>
                        {getStatusIcon(delivery.status)}
                        {delivery.status === 'in_transit' ? 'In Transit' : delivery.status}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-2">Items to deliver:</p>
                      <div className="space-y-1">
                        {delivery.items?.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{item.product_name}</span>
                            <span className="font-medium text-gray-900">×{item.quantity}</span>
                          </div>
                        ))}
                        {delivery.items?.length > 3 && (
                          <p className="text-xs text-gray-500">+{delivery.items.length - 3} more items</p>
                        )}
                      </div>
                    </div>

                    {/* Address if available */}
                    {delivery.address && (
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{delivery.address}</span>
                      </div>
                    )}

                    {/* Status Change Buttons */}
                    <div className="flex gap-2">
                      {delivery.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(delivery.id, 'in_transit')}
                          className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          <Truck className="w-4 h-4" />
                          Start Delivery
                        </button>
                      )}
                      {delivery.status === 'in_transit' && (
                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setShowUploadModal(true);
                          }}
                          className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          Upload Proof & Complete
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          loadMessages(delivery.id);
                          setShowChat(true);
                        }}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past 30 Days History (Collapsible) */}
        {pastDeliveries.length > 0 && (
          <section>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3"
            >
              <span className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-400" />
                Past Deliveries
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  {pastDeliveries.length}
                </span>
              </span>
              {showHistory ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showHistory && (
              <div className="space-y-2">
                {pastDeliveries.map(delivery => (
                  <div
                    key={delivery.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {formatDate(delivery.delivery_date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {delivery.items?.length || 0} items delivered
                        </p>
                      </div>
                    </div>
                    {delivery.pod_url && (
                      <a
                        href={delivery.pod_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        View Proof
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Big Upload Proof Button (Fixed at bottom for mobile) */}
      {activeDeliveries.some(d => d.status === 'in_transit') && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
          <button
            onClick={() => {
              const inTransit = activeDeliveries.find(d => d.status === 'in_transit');
              if (inTransit) {
                setSelectedDelivery(inTransit);
                setShowUploadModal(true);
              }
            }}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-green-500/30 transition-all"
          >
            <Camera className="w-6 h-6" />
            Upload Proof of Delivery
          </button>
        </div>
      )}

      {/* Upload Proof Modal */}
      {showUploadModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Upload Proof of Delivery</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadPreview(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              {uploadPreview ? (
                <div className="relative">
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setUploadFile(null);
                      setUploadPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Take a photo or choose from gallery</p>
                    <p className="text-sm text-gray-500 mt-1">Tap to open camera</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}

              {/* Delivery Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Delivering to:</p>
                <p className="font-medium text-gray-900">{selectedDelivery.project_name}</p>
                <p className="text-sm text-gray-600">{selectedDelivery.items?.length || 0} items</p>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUploadProof}
                disabled={!uploadFile || uploading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Complete Delivery
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900">Chat with Company</h3>
                <p className="text-xs text-gray-500">Re: {selectedDelivery.project_name}</p>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No messages yet</p>
                  <p className="text-xs text-gray-400">Send a message to the company</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'supplier' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.sender_type === 'supplier'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.sender_type === 'company' && (
                        <p className="text-xs font-medium text-gray-500 mb-1">{msg.sender_name}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_type === 'supplier' ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
