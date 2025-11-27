'use client';

import { useState, useEffect, useRef, useCallback, DragEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { AppLayout } from '@/components/app-layout';
import {
  MessageCircle, Send, Search, Truck, Building2, FolderOpen, ChevronRight,
  X, Loader2, CheckCheck, Paperclip, ArrowLeft, Smile, Reply, 
  Edit2, Trash2, Pin, FileText, Image as ImageIcon, Bookmark, Forward,
  Calendar, AtSign, Zap, Filter, ChevronDown, Mic, Square, Package,
  ExternalLink, DollarSign, MapPin, Navigation
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface Participant {
  id: string;
  name: string;
  type: 'supplier' | 'client';
  project_id: string;
  project_name: string;
}

interface Conversation {
  id: string;
  project_id: string;
  project_name: string;
  channel: 'company_supplier' | 'company_client';
  participant_id: string;
  participant_name: string;
  last_message: string;
  unread_count: number;
}

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  sender_type: 'company' | 'supplier' | 'client';
  sender_name: string;
  created_at: string;
  is_read: boolean;
  is_edited?: boolean;
  is_pinned?: boolean;
  deleted_at?: string;
  parent_message_id?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  reactions?: Reaction[];
  is_bookmarked?: boolean;
  message_type?: 'text' | 'voice' | 'order_reference' | 'location' | 'status_update';
  metadata?: any;
}

interface Order {
  id: string;
  product_name: string;
  vendor: string;
  amount: number;
  quantity: number;
  status: string;
  delivery_progress: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '🎉', '✅'];

// Quick reply templates for construction/delivery
const QUICK_TEMPLATES = [
  { label: '✅ Delivery Confirmed', text: 'Delivery has been confirmed and received in good condition.' },
  { label: '📦 Request Update', text: 'Could you please provide an update on the delivery status?' },
  { label: '📸 Photo Requested', text: 'Please send photos of the delivered items for our records.' },
  { label: '⚠️ Issue Reported', text: 'There is an issue with the delivery. Please contact us ASAP.' },
  { label: '📅 Schedule Delivery', text: 'Please confirm the delivery schedule for this order.' },
  { label: '👋 Thank You', text: 'Thank you for your prompt service!' },
];

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'company_supplier' | 'company_client' | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  
  // New feature states
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Additional feature states
  const [isDragging, setIsDragging] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(new Set());
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Voice message states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // Order reference states
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [projectOrders, setProjectOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Location sharing states
  const [sharingLocation, setSharingLocation] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadData();
  }, []);

  // Polling for messages
  useEffect(() => {
    if (!selectedProject || !selectedChannel) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const pollMessages = async () => {
      try {
        const url = `/api/messages?project_id=${selectedProject.id}&channel=${selectedChannel}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => {
            const newMsgs: Message[] = data.messages || [];
            // Only update if there are new messages (check count and last ID)
            const hasNewMessages = newMsgs.length !== prev.length || 
                (newMsgs.length > 0 && prev.length > 0 && newMsgs[newMsgs.length-1].id !== prev[prev.length-1].id);
            
            if (hasNewMessages) {
              // Merge: preserve local reaction state for existing messages
              return newMsgs.map(newMsg => {
                const existingMsg = prev.find(p => p.id === newMsg.id);
                if (existingMsg && existingMsg.reactions) {
                  // Keep local reactions if we have them (optimistic updates)
                  return { ...newMsg, reactions: existingMsg.reactions };
                }
                return newMsg;
              });
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    pollingRef.current = setInterval(pollMessages, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [selectedProject?.id, selectedChannel]);

  // Polling for typing indicators
  useEffect(() => {
    if (!selectedProject || !selectedChannel) return;

    const pollTyping = async () => {
      try {
        const res = await fetch(`/api/messages/typing?project_id=${selectedProject.id}&channel=${selectedChannel}`);
        if (res.ok) {
          const data = await res.json();
          setTypingUsers((data.typing || []).map((t: any) => t.userName));
        }
      } catch (e) { /* ignore */ }
    };

    const interval = setInterval(pollTyping, 2000);
    return () => clearInterval(interval);
  }, [selectedProject?.id, selectedChannel]);

  useEffect(() => {
    if (selectedProject && selectedChannel) {
      loadMessages(selectedProject.id, selectedChannel);
    }
  }, [selectedProject, selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
        setProjects(data.projects || []);
        setParticipants(data.participants || []);
        setCurrentUserId(data.currentUserId || '');
        setUserRole(data.userRole || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (projectId: string, channel: string) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/messages?project_id=${projectId}&channel=${channel}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, channel }),
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!selectedProject || !selectedChannel || isTyping) return;
    
    setIsTyping(true);
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: selectedProject.id, channel: selectedChannel, is_typing: true }),
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProject.id, channel: selectedChannel, is_typing: false }),
      });
    }, 3000);
  }, [selectedProject, selectedChannel, isTyping]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !editingMessage) || !selectedProject || !selectedChannel || sending) return;

    try {
      setSending(true);

      if (editingMessage) {
        // Edit existing message
        const res = await fetch(`/api/messages/${editingMessage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: newMessage.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, ...data.message } : m));
          setEditingMessage(null);
        }
      } else {
        // Send new message
        const payload: any = {
          project_id: selectedProject.id,
          channel: selectedChannel,
          message: newMessage.trim(),
        };
        if (replyTo) payload.parent_message_id = replyTo.id;
        if (isCompanyMember && selectedParticipant) payload.recipient_id = selectedParticipant.id;

        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, data.message]);
          setReplyTo(null);
        }
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    // Close emoji picker immediately
    setShowEmojiPicker(null);
    
    // Optimistic update - update UI immediately before server call
    setMessages(prev => {
      const newMessages = prev.map(msg => {
        if (msg.id !== messageId) return msg;
        
        const reactions = [...(msg.reactions || [])];
        const existingIdx = reactions.findIndex(r => r.emoji === emoji);
        
        if (existingIdx >= 0) {
          const existing = reactions[existingIdx];
          if (existing.hasReacted) {
            // Remove reaction
            if (existing.count <= 1) {
              reactions.splice(existingIdx, 1);
            } else {
              reactions[existingIdx] = { ...existing, count: existing.count - 1, hasReacted: false };
            }
          } else {
            // Add reaction
            reactions[existingIdx] = { ...existing, count: existing.count + 1, hasReacted: true };
          }
        } else {
          // New reaction
          reactions.push({ emoji, count: 1, hasReacted: true });
        }
        
        return { ...msg, reactions };
      });
      return newMessages;
    });

    // Send to server in background (fire and forget)
    fetch('/api/messages/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, emoji }),
    }).catch(err => console.error('Error adding reaction:', err));
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, message: '[This message was deleted]', deleted_at: new Date().toISOString() } : m
        ));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      const res = await fetch('/api/messages/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
      });
      if (res.ok && selectedProject && selectedChannel) {
        loadMessages(selectedProject.id, selectedChannel);
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject || !selectedChannel) return;
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload file helper (shared between input and drag-drop)
  const uploadFile = async (file: File) => {
    if (!selectedProject || !selectedChannel) return;
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', selectedProject.id);

      const res = await fetch('/api/messages/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        const payload = {
          project_id: selectedProject.id,
          channel: selectedChannel,
          message: file.name,
          attachment_url: data.attachment.url,
          attachment_name: data.attachment.name,
          attachment_type: data.attachment.type,
        };
        const msgRes = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(prev => [...prev, msgData.message]);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  // Bookmark handler
  const handleBookmark = async (messageId: string) => {
    const isBookmarked = bookmarkedMessages.has(messageId);
    
    // Optimistic update
    setBookmarkedMessages(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });

    try {
      await fetch('/api/messages/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId }),
      });
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  };

  // Forward message
  const handleForward = async (targetProjectId: string, targetChannel: string) => {
    if (!forwardingMessage) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: targetProjectId,
          channel: targetChannel,
          message: `[Forwarded] ${forwardingMessage.message}`,
          attachment_url: forwardingMessage.attachment_url,
          attachment_name: forwardingMessage.attachment_name,
          attachment_type: forwardingMessage.attachment_type,
        }),
      });
      setForwardingMessage(null);
    } catch (error) {
      console.error('Error forwarding:', error);
    }
  };

  // Insert template
  const insertTemplate = (text: string) => {
    setNewMessage(text);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  // Handle @ mentions
  const handleMention = (userName: string) => {
    const beforeAt = newMessage.substring(0, newMessage.lastIndexOf('@'));
    setNewMessage(`${beforeAt}@${userName} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  // Handle input change with mention detection
  const handleInputChange = (value: string) => {
    setNewMessage(value);
    handleTyping();
    
    // Check for @ mention
    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || value[lastAt - 1] === ' ')) {
      const afterAt = value.substring(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setMentionFilter(afterAt.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  // Get mentionable users
  const getMentionableUsers = () => {
    if (!selectedProject) return [];
    const users: { id: string; name: string; type: string }[] = [];
    
    participants
      .filter(p => p.project_id === selectedProject.id)
      .forEach(p => {
        if (p.name.toLowerCase().includes(mentionFilter)) {
          users.push({ id: p.id, name: p.name, type: p.type });
        }
      });
    
    return users.slice(0, 5);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await sendVoiceMessage(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedProject || !selectedChannel) return;
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', audioBlob, `voice-${Date.now()}.webm`);
      formData.append('project_id', selectedProject.id);

      const res = await fetch('/api/messages/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        const payload = {
          project_id: selectedProject.id,
          channel: selectedChannel,
          message: '🎤 Voice message',
          message_type: 'voice',
          attachment_url: data.attachment.url,
          attachment_name: data.attachment.name,
          attachment_type: 'audio/webm',
        };
        const msgRes = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(prev => [...prev, msgData.message]);
        }
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
    } finally {
      setUploading(false);
      setRecordingTime(0);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load orders for project
  const loadProjectOrders = async () => {
    if (!selectedProject) return;
    
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?project_id=${selectedProject.id}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Orders API response:', data);
        // API returns { success: true, data: orders }
        const orders = data.data || data.orders || [];
        console.log('Parsed orders:', orders);
        setProjectOrders(orders);
      } else {
        console.error('Orders API error:', res.status);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Send order reference message
  const sendOrderReference = async (order: any) => {
    if (!selectedProject || !selectedChannel) return;
    
    console.log('Sending order reference - raw order:', order);
    
    // Extract order info - handle different field names from API
    const productName = order.product_name || order.description || order.name || 'Order';
    const vendorName = order.vendor || order.category || order.supplier || 'Unknown Vendor';
    const orderAmount = order.amount || order.total || order.unit_price || 0;
    const orderQty = order.quantity || order.qty || order.ordered_qty || 0;
    const orderStatus = order.status || 'pending';
    const deliveryProgress = order.delivery_progress || 'not_started';
    
    console.log('Extracted order data:', { productName, vendorName, orderAmount, orderQty, orderStatus, deliveryProgress });
    
    try {
      setSending(true);
      setShowOrderPicker(false); // Close picker immediately
      
      const payload = {
        project_id: selectedProject.id,
        channel: selectedChannel,
        message: `📦 Order Reference: ${productName}`,
        message_type: 'order_reference',
        metadata: JSON.stringify({
          order_id: order.id,
          product_name: productName,
          vendor: vendorName,
          amount: orderAmount,
          quantity: orderQty,
          status: orderStatus,
          delivery_progress: deliveryProgress,
        }),
      };
      
      console.log('Order reference payload:', payload);
      
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Order reference sent:', data);
        setMessages(prev => [...prev, data.message]);
      } else {
        console.error('Failed to send order reference:', await res.text());
      }
    } catch (error) {
      console.error('Error sending order reference:', error);
    } finally {
      setSending(false);
    }
  };

  // Share current location
  const shareLocation = async () => {
    if (!selectedProject || !selectedChannel) return;
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setSharingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const payload = {
            project_id: selectedProject.id,
            channel: selectedChannel,
            message: `📍 Shared location`,
            message_type: 'location',
            metadata: JSON.stringify({
              latitude,
              longitude,
              timestamp: new Date().toISOString(),
            }),
          };
          
          const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (res.ok) {
            const data = await res.json();
            setMessages(prev => [...prev, data.message]);
          }
        } catch (error) {
          console.error('Error sharing location:', error);
        } finally {
          setSharingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please enable location services.');
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getProjectParticipants = (projectId: string, type: 'supplier' | 'client') => {
    return participants.filter(p => p.project_id === projectId && p.type === type);
  };

  const getProjectUnread = (projectId: string) => {
    return conversations.filter(c => c.project_id === projectId).reduce((sum, c) => sum + c.unread_count, 0);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const isCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
  const isSupplier = userRole === 'supplier';
  const isClient = userRole === 'viewer' || userRole === 'client';

  const filteredProjects = projects.filter(p => 
    !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter messages based on search and date
  const filteredMessages = messages.filter(msg => {
    // Message search filter
    if (messageSearch && !msg.message.toLowerCase().includes(messageSearch.toLowerCase())) {
      return false;
    }
    // Date filter
    if (dateFilter) {
      const msgDate = new Date(msg.created_at).toISOString().split('T')[0];
      if (msgDate !== dateFilter) return false;
    }
    // Show bookmarks only
    if (showBookmarks && !bookmarkedMessages.has(msg.id)) {
      return false;
    }
    return true;
  });

  const getReplyMessage = (parentId: string) => messages.find(m => m.id === parentId);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex bg-white">
        {/* Left Panel - Projects */}
        <div className={`w-full md:w-96 border-r border-gray-200 flex flex-col ${selectedProject ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              Messages
              {totalUnread > 0 && <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{totalUnread}</span>}
            </h1>
          </div>

          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No projects found</p>
              </div>
            ) : (
              filteredProjects.map(project => {
                const unreadCount = getProjectUnread(project.id);
                const isSelected = selectedProject?.id === project.id;

                return (
                  <div key={project.id} className={`bg-white border-2 rounded-xl overflow-hidden ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                          {project.code && <span className="text-xs text-gray-500">{project.code}</span>}
                        </div>
                        {unreadCount > 0 && <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{unreadCount}</span>}
                      </div>
                    </div>

                    <div className="p-2 space-y-2">
                      {(isCompanyMember || isSupplier) && (
                        isCompanyMember ? (
                          getProjectParticipants(project.id, 'supplier').length > 0 ? (
                            getProjectParticipants(project.id, 'supplier').map(participant => (
                              <button
                                key={participant.id}
                                onClick={() => { setSelectedProject(project); setSelectedChannel('company_supplier'); setSelectedParticipant(participant); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${isSelected && selectedChannel === 'company_supplier' && selectedParticipant?.id === participant.id ? 'bg-purple-100 border-2 border-purple-300' : 'bg-purple-50 hover:bg-purple-100 border-2 border-transparent'}`}
                              >
                                <div className="w-9 h-9 rounded-full bg-purple-200 flex items-center justify-center">
                                  <Truck className="w-4 h-4 text-purple-700" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <span className="font-medium text-purple-900 text-sm">{participant.name}</span>
                                </div>
                                <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">Supplier</span>
                                <ChevronRight className="w-4 h-4 text-purple-400" />
                              </button>
                            ))
                          ) : (
                            <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-gray-400">
                              <Truck className="w-4 h-4" />
                              <span className="text-sm">No suppliers assigned</span>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => { setSelectedProject(project); setSelectedChannel('company_supplier'); setSelectedParticipant(null); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg ${isSelected && selectedChannel === 'company_supplier' ? 'bg-purple-100 border-2 border-purple-300' : 'bg-purple-50 hover:bg-purple-100 border-2 border-transparent'}`}
                          >
                            <div className="w-9 h-9 rounded-full bg-purple-200 flex items-center justify-center">
                              <Truck className="w-4 h-4 text-purple-700" />
                            </div>
                            <span className="font-medium text-purple-900 text-sm">Project Team</span>
                            <ChevronRight className="w-4 h-4 text-purple-400" />
                          </button>
                        )
                      )}

                      {(isCompanyMember || isClient) && (
                        isCompanyMember ? (
                          getProjectParticipants(project.id, 'client').length > 0 ? (
                            getProjectParticipants(project.id, 'client').map(participant => (
                              <button
                                key={participant.id}
                                onClick={() => { setSelectedProject(project); setSelectedChannel('company_client'); setSelectedParticipant(participant); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${isSelected && selectedChannel === 'company_client' && selectedParticipant?.id === participant.id ? 'bg-blue-100 border-2 border-blue-300' : 'bg-blue-50 hover:bg-blue-100 border-2 border-transparent'}`}
                              >
                                <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-blue-700" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <span className="font-medium text-blue-900 text-sm">{participant.name}</span>
                                </div>
                                <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">Client</span>
                                <ChevronRight className="w-4 h-4 text-blue-400" />
                              </button>
                            ))
                          ) : (
                            <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-gray-400">
                              <Building2 className="w-4 h-4" />
                              <span className="text-sm">No clients assigned</span>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => { setSelectedProject(project); setSelectedChannel('company_client'); setSelectedParticipant(null); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg ${isSelected && selectedChannel === 'company_client' ? 'bg-blue-100 border-2 border-blue-300' : 'bg-blue-50 hover:bg-blue-100 border-2 border-transparent'}`}
                          >
                            <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-blue-700" />
                            </div>
                            <span className="font-medium text-blue-900 text-sm">Project Team</span>
                            <ChevronRight className="w-4 h-4 text-blue-400" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className={`flex-1 flex flex-col ${selectedProject && selectedChannel ? 'flex' : 'hidden md:flex'}`}>
          {selectedProject && selectedChannel ? (
            <>
              {/* Header */}
              <div className={`p-4 border-b border-gray-200 ${selectedChannel === 'company_supplier' ? 'bg-gradient-to-r from-purple-50 to-white' : 'bg-gradient-to-r from-blue-50 to-white'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedProject(null); setSelectedChannel(null); setSelectedParticipant(null); setMessages([]); }} className="p-1.5 hover:bg-gray-100 rounded-lg md:hidden">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedChannel === 'company_supplier' ? 'bg-purple-200 text-purple-700' : 'bg-blue-200 text-blue-700'}`}>
                    {selectedChannel === 'company_supplier' ? <Truck className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900">{selectedParticipant?.name || 'Project Team'}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="truncate">{selectedProject.name}</span>
                    </div>
                  </div>
                  {/* Chat action buttons */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setShowMessageSearch(!showMessageSearch)} 
                      className={`p-2 rounded-lg transition-colors ${showMessageSearch ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Search messages"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowBookmarks(!showBookmarks)} 
                      className={`p-2 rounded-lg transition-colors ${showBookmarks ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Show bookmarks"
                    >
                      <Bookmark className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowDateFilter(!showDateFilter)} 
                      className={`p-2 rounded-lg transition-colors ${dateFilter ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Filter by date"
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Search bar */}
                {showMessageSearch && (
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search in messages..."
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    {messageSearch && (
                      <button onClick={() => setMessageSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                )}

                {/* Date filter */}
                {showDateFilter && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    {dateFilter && (
                      <button onClick={() => setDateFilter('')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Active filters indicator */}
                {(messageSearch || dateFilter || showBookmarks) && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Filter className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">
                      Showing {filteredMessages.length} of {messages.length} messages
                    </span>
                    <button 
                      onClick={() => { setMessageSearch(''); setDateFilter(''); setShowBookmarks(false); }}
                      className="text-blue-600 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div 
                ref={chatContainerRef}
                className={`flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 relative ${isDragging ? 'ring-4 ring-blue-400 ring-inset bg-blue-50' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Drag & Drop overlay */}
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-100/80 flex items-center justify-center z-10 pointer-events-none">
                    <div className="text-center">
                      <Paperclip className="w-16 h-16 text-blue-500 mx-auto mb-2" />
                      <p className="text-lg font-medium text-blue-700">Drop file here to upload</p>
                    </div>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="font-medium">{messages.length === 0 ? 'No messages yet' : 'No messages match your filters'}</p>
                  </div>
                ) : (
                  <>
                    {filteredMessages.map(msg => {
                      const isOwn = msg.sender_id === currentUserId;
                      const isDeleted = !!msg.deleted_at;
                      const parentMsg = msg.parent_message_id ? getReplyMessage(msg.parent_message_id) : null;
                      const isBookmarked = bookmarkedMessages.has(msg.id);

                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                          <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                            {!isOwn && (
                              <p className="text-xs text-gray-500 mb-1 ml-1">
                                {msg.sender_name}
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${msg.sender_type === 'supplier' ? 'bg-purple-100 text-purple-700' : msg.sender_type === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                  {msg.sender_type}
                                </span>
                              </p>
                            )}

                            {parentMsg && (
                              <div className={`text-xs px-3 py-2 mb-1 rounded-lg border-l-4 ${isOwn ? 'bg-blue-700/50 border-blue-300' : 'bg-gray-100 border-gray-400'}`}>
                                <span className={`font-semibold ${isOwn ? 'text-blue-200' : 'text-gray-700'}`}>{parentMsg.sender_name}</span>
                                <p className={`truncate ${isOwn ? 'text-white' : 'text-gray-600'}`}>{parentMsg.message.substring(0, 60)}{parentMsg.message.length > 60 ? '...' : ''}</p>
                              </div>
                            )}

                            {msg.is_pinned && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                                <Pin className="w-3 h-3" /> Pinned
                              </div>
                            )}

                            <div className={`relative rounded-2xl px-4 py-2 ${isOwn ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'} ${isDeleted ? 'opacity-60 italic' : ''}`}>
                              {/* Order Reference Card */}
                              {msg.message_type === 'order_reference' && msg.metadata && !isDeleted && (() => {
                                let orderData;
                                try {
                                  orderData = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                                } catch (e) {
                                  console.error('Failed to parse order metadata:', msg.metadata);
                                  return null;
                                }
                                
                                if (!orderData) return null;
                                
                                return (
                                  <a 
                                    href={`/orders?highlight=${orderData.order_id}`} 
                                    target="_blank"
                                    className="block"
                                  >
                                    <div className={`rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${isOwn ? 'bg-blue-500/30 hover:bg-blue-500/40' : 'bg-gray-50 border hover:border-blue-300 hover:bg-blue-50'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-5 h-5" />
                                        <span className="font-semibold">Order Reference</span>
                                        <ExternalLink className="w-3 h-3 ml-auto" />
                                      </div>
                                      <div className="space-y-1 text-sm">
                                        <p className="font-medium">{orderData.product_name || 'Unknown Product'}</p>
                                        <p className={`${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>Vendor: {orderData.vendor || 'Unknown Vendor'}</p>
                                        <div className="flex items-center gap-3">
                                          <span className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            {typeof orderData.amount === 'number' ? orderData.amount.toLocaleString() : orderData.amount || '0'}
                                          </span>
                                          <span>Qty: {orderData.quantity || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                          <span className={`px-2 py-0.5 rounded text-xs ${
                                            orderData.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            orderData.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {orderData.status || 'unknown'}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-xs ${
                                            orderData.delivery_progress === 'delivered' ? 'bg-green-100 text-green-700' :
                                            orderData.delivery_progress === 'partial' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {orderData.delivery_progress || 'pending'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </a>
                                );
                              })()}

                              {/* Voice Message Player */}
                              {msg.message_type === 'voice' && msg.attachment_url && !isDeleted && (
                                <div className={`flex items-center gap-3 p-2 rounded-lg ${isOwn ? 'bg-blue-500/30' : 'bg-gray-100'}`}>
                                  <Mic className="w-5 h-5" />
                                  <audio controls className="h-8 max-w-[200px]" preload="metadata">
                                    <source src={msg.attachment_url} type="audio/webm" />
                                    Your browser does not support audio.
                                  </audio>
                                </div>
                              )}

                              {/* Location Card */}
                              {msg.message_type === 'location' && msg.metadata && !isDeleted && (() => {
                                const locData = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                                const mapsUrl = `https://www.google.com/maps?q=${locData.latitude},${locData.longitude}`;
                                return (
                                  <div className={`rounded-lg p-3 ${isOwn ? 'bg-blue-500/30' : 'bg-gray-50 border'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <MapPin className="w-5 h-5 text-red-500" />
                                      <span className="font-semibold">Shared Location</span>
                                    </div>
                                    <div className="relative rounded-lg overflow-hidden bg-gray-200 h-32 mb-2">
                                      <img 
                                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${locData.latitude},${locData.longitude}&zoom=15&size=300x150&markers=color:red%7C${locData.latitude},${locData.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}`}
                                        alt="Location map"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          // Fallback if no API key
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                        <MapPin className="w-8 h-8 text-red-500" />
                                      </div>
                                    </div>
                                    <div className={`text-xs ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
                                      {locData.latitude.toFixed(6)}, {locData.longitude.toFixed(6)}
                                    </div>
                                    <a 
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-1 mt-2 text-xs ${isOwn ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                                    >
                                      <Navigation className="w-3 h-3" />
                                      Open in Google Maps
                                    </a>
                                  </div>
                                );
                              })()}

                              {/* Status Update Card */}
                              {msg.message_type === 'status_update' && !isDeleted && (
                                <div className={`rounded-lg p-3 ${isOwn ? 'bg-blue-500/30' : 'bg-green-50 border border-green-200'}`}>
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-green-600" />
                                    <span className="text-sm">{msg.message}</span>
                                  </div>
                                </div>
                              )}

                              {/* Regular text message - hide if it's special type */}
                              {msg.message_type !== 'voice' && msg.message_type !== 'order_reference' && msg.message_type !== 'location' && msg.message_type !== 'status_update' && (!msg.attachment_url || msg.message !== msg.attachment_name) && (
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              )}

                              {/* Inline Image Preview */}
                              {msg.attachment_url && !isDeleted && msg.attachment_type?.startsWith('image/') && (
                                <div 
                                  className="mt-2 cursor-pointer"
                                  onClick={() => setImagePreview(msg.attachment_url!)}
                                >
                                  <img 
                                    src={msg.attachment_url} 
                                    alt={msg.attachment_name || 'Image'} 
                                    className="max-w-[280px] max-h-[200px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}

                              {/* File attachment (non-image, non-voice) */}
                              {msg.attachment_url && !isDeleted && !msg.attachment_type?.startsWith('image/') && !msg.attachment_type?.startsWith('audio/') && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${isOwn ? 'bg-blue-500/30 hover:bg-blue-500/40' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                                  <FileText className="w-5 h-5 flex-shrink-0" />
                                  <span className="text-sm truncate">{msg.attachment_name}</span>
                                </a>
                              )}

                              {!isDeleted && (
                                <div className={`absolute ${isOwn ? '-left-28' : '-right-28'} top-0 hidden group-hover:flex items-center gap-1 bg-white rounded-lg shadow-lg border p-1`}>
                                  <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-100 rounded" title="React">
                                    <Smile className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button onClick={() => setReplyTo(msg)} className="p-1 hover:bg-gray-100 rounded" title="Reply">
                                    <Reply className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button onClick={() => handleBookmark(msg.id)} className="p-1 hover:bg-gray-100 rounded" title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}>
                                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-gray-500'}`} />
                                  </button>
                                  <button onClick={() => setForwardingMessage(msg)} className="p-1 hover:bg-gray-100 rounded" title="Forward">
                                    <Forward className="w-4 h-4 text-gray-500" />
                                  </button>
                                  {isOwn && (
                                    <>
                                      <button onClick={() => { setEditingMessage(msg); setNewMessage(msg.message); }} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                      </button>
                                      <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 hover:bg-gray-100 rounded" title="Delete">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </button>
                                    </>
                                  )}
                                  {isCompanyMember && (
                                    <button onClick={() => handlePinMessage(msg.id)} className="p-1 hover:bg-gray-100 rounded" title={msg.is_pinned ? 'Unpin' : 'Pin'}>
                                      <Pin className={`w-4 h-4 ${msg.is_pinned ? 'text-amber-500' : 'text-gray-500'}`} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {showEmojiPicker === msg.id && (
                                <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -bottom-10 flex gap-1 bg-white rounded-full shadow-lg border p-1 z-10`}>
                                  {EMOJI_OPTIONS.map(emoji => (
                                    <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="p-1 hover:bg-gray-100 rounded-full text-lg">
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {msg.reactions.map(r => (
                                  <button key={r.emoji} onClick={() => handleReaction(msg.id, r.emoji)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${r.hasReacted ? 'bg-blue-100 border-blue-300' : 'bg-gray-100'} border`}>
                                    {r.emoji} {r.count}
                                  </button>
                                ))}
                              </div>
                            )}

                            <p className={`text-[10px] mt-1 flex items-center gap-1 ${isOwn ? 'justify-end text-gray-400' : 'text-gray-400'}`}>
                              {formatTime(msg.created_at)}
                              {msg.is_edited && <span>(edited)</span>}
                              {isOwn && msg.is_read && <CheckCheck className="w-3 h-3 text-blue-500" />}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}

                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
              </div>

              {replyTo && (
                <div className="px-4 py-2 bg-gray-100 border-t flex items-center gap-2">
                  <Reply className="w-4 h-4 text-gray-500" />
                  <div className="flex-1 text-sm truncate">
                    <span className="font-medium">{replyTo.sender_name}:</span> {replyTo.message}
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {editingMessage && (
                <div className="px-4 py-2 bg-amber-50 border-t flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-600" />
                  <span className="flex-1 text-sm text-amber-700">Editing message</span>
                  <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="p-1 hover:bg-amber-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="p-4 border-t border-gray-200 bg-white relative">
                {/* @ Mentions dropdown */}
                {showMentions && getMentionableUsers().length > 0 && (
                  <div className="absolute bottom-full left-4 mb-2 bg-white rounded-lg shadow-lg border max-h-40 overflow-y-auto w-64 z-20">
                    {getMentionableUsers().map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleMention(user.name)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <AtSign className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{user.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${user.type === 'supplier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick Templates dropdown */}
                {showTemplates && (
                  <div className="absolute bottom-full left-4 mb-2 bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto w-80 z-20">
                    <div className="p-2 border-b bg-gray-50 text-xs font-medium text-gray-500 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Quick Templates
                    </div>
                    {QUICK_TEMPLATES.map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertTemplate(template.text)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-0"
                      >
                        <div className="font-medium text-sm">{template.label}</div>
                        <div className="text-xs text-gray-500 truncate">{template.text}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Order Picker dropdown */}
                {showOrderPicker && (
                  <div className="absolute bottom-full left-4 mb-2 bg-white rounded-lg shadow-lg border max-h-72 overflow-y-auto w-96 z-30">
                    <div className="p-2 border-b bg-gray-50 text-xs font-medium text-gray-500 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Reference an Order
                    </div>
                    {loadingOrders ? (
                      <div className="p-4 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : projectOrders.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No orders found for this project
                      </div>
                    ) : (
                      projectOrders.map((order: any) => {
                        // Handle different field names from API
                        const displayName = order.product_name || order.description || order.name || 'Unnamed Order';
                        const displayVendor = order.vendor || order.category || order.supplier || '';
                        const displayAmount = order.amount || order.total || 0;
                        const displayQty = order.quantity || order.qty || 0;
                        
                        return (
                          <div
                            key={order.id}
                            onClick={() => {
                              console.log('Order clicked:', order);
                              sendOrderReference(order);
                            }}
                            className="w-full px-3 py-3 text-left hover:bg-blue-50 border-b last:border-0 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm truncate flex-1 text-gray-900">
                                {displayName}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ml-2 font-medium ${
                                order.status === 'approved' ? 'bg-green-100 text-green-700' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                order.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {order.status || 'pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              {displayVendor && <span>🏪 {displayVendor}</span>}
                              <span>💰 RM {displayAmount.toLocaleString()}</span>
                              <span>📦 Qty: {displayQty}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Voice Recording UI */}
                {isRecording ? (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-600 font-medium">Recording... {formatRecordingTime(recordingTime)}</span>
                    </div>
                    <button onClick={cancelRecording} className="p-2 hover:bg-red-100 rounded-full" title="Cancel">
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                    <button onClick={stopRecording} className="p-2 bg-red-500 hover:bg-red-600 rounded-full" title="Stop & Send">
                      <Square className="w-5 h-5 text-white fill-white" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,audio/*" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 hover:bg-gray-100 rounded-full" title="Attach file">
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5 text-gray-500" />}
                    </button>
                    <button onClick={startRecording} className="p-2 hover:bg-gray-100 rounded-full" title="Voice message">
                      <Mic className="w-5 h-5 text-gray-500" />
                    </button>
                    <button 
                      onClick={shareLocation}
                      disabled={sharingLocation}
                      className="p-2 hover:bg-gray-100 rounded-full"
                      title="Share location"
                    >
                      {sharingLocation ? <Loader2 className="w-5 h-5 animate-spin text-gray-500" /> : <MapPin className="w-5 h-5 text-gray-500" />}
                    </button>
                    <button 
                      onClick={() => { setShowOrderPicker(!showOrderPicker); if (!showOrderPicker) loadProjectOrders(); }} 
                      className={`p-2 rounded-full ${showOrderPicker ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-500'}`} 
                      title="Reference an order"
                    >
                      <Package className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowTemplates(!showTemplates)} className={`p-2 rounded-full ${showTemplates ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`} title="Quick templates">
                      <Zap className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                            handleSendMessage();
                          }
                          if (e.key === 'Escape') {
                            setShowMentions(false);
                            setShowTemplates(false);
                            setShowOrderPicker(false);
                          }
                        }}
                        placeholder={editingMessage ? 'Edit message...' : 'Type a message... (use @ to mention)'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500"
                        disabled={sending}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className={`p-2.5 rounded-full text-white ${selectedChannel === 'company_supplier' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-300`}
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Your Messages</h3>
                <p className="text-gray-500">Select a project to view conversations</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <button 
            onClick={() => setImagePreview(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setForwardingMessage(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Forward className="w-5 h-5 text-blue-600" />
                Forward Message
              </h3>
              <button onClick={() => setForwardingMessage(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-gray-50 border-b">
              <p className="text-sm text-gray-500 mb-1">Message to forward:</p>
              <div className="bg-white p-3 rounded-lg border text-sm">
                {forwardingMessage.message}
              </div>
            </div>

            <div className="p-4 max-h-60 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700 mb-3">Select destination:</p>
              {projects.map(project => (
                <div key={project.id} className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">{project.name}</p>
                  <div className="space-y-1">
                    {getProjectParticipants(project.id, 'supplier').map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleForward(project.id, 'company_supplier')}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 text-left"
                      >
                        <Truck className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">{p.name}</span>
                        <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Supplier</span>
                      </button>
                    ))}
                    {getProjectParticipants(project.id, 'client').map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleForward(project.id, 'company_client')}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-left"
                      >
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{p.name}</span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Client</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
