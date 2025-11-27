'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { AppLayout } from '@/components/app-layout';
import {
  MessageCircle, Send, Search, Truck, Building2, FolderOpen, ChevronRight,
  X, Loader2, CheckCheck, Paperclip, ArrowLeft, Smile, Reply, 
  Edit2, Trash2, Pin, FileText, Image as ImageIcon
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
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '🎉', '✅'];

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Optimistic update - update UI immediately
    setMessages(prev => prev.map(msg => {
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
    }));
    
    setShowEmojiPicker(null);

    // Send to server in background (no await, no page refresh)
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="font-medium">No messages yet</p>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => {
                      const isOwn = msg.sender_id === currentUserId;
                      const isDeleted = !!msg.deleted_at;
                      const parentMsg = msg.parent_message_id ? getReplyMessage(msg.parent_message_id) : null;

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
                              {/* Hide message text if it's just a filename for attachment */}
                              {(!msg.attachment_url || msg.message !== msg.attachment_name) && (
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

                              {/* File attachment (non-image) */}
                              {msg.attachment_url && !isDeleted && !msg.attachment_type?.startsWith('image/') && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${isOwn ? 'bg-blue-500/30 hover:bg-blue-500/40' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                                  <FileText className="w-5 h-5 flex-shrink-0" />
                                  <span className="text-sm truncate">{msg.attachment_name}</span>
                                </a>
                              )}

                              {!isDeleted && (
                                <div className={`absolute ${isOwn ? '-left-24' : '-right-24'} top-0 hidden group-hover:flex items-center gap-1 bg-white rounded-lg shadow-lg border p-1`}>
                                  <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-100 rounded" title="React">
                                    <Smile className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button onClick={() => setReplyTo(msg)} className="p-1 hover:bg-gray-100 rounded" title="Reply">
                                    <Reply className="w-4 h-4 text-gray-500" />
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

              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 hover:bg-gray-100 rounded-full">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5 text-gray-500" />}
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className={`p-2.5 rounded-full text-white ${selectedChannel === 'company_supplier' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-300`}
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
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
    </AppLayout>
  );
}
