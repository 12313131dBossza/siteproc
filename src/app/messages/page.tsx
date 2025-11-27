'use client';

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  MessageCircle,
  Send,
  Search,
  User,
  Users,
  Truck,
  Building2,
  FolderOpen,
  ChevronRight,
  X,
  Loader2,
  Filter,
  CheckCheck,
  Clock,
  Paperclip,
  Image as ImageIcon,
  ArrowLeft,
  Plus
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code?: string;
  status: string;
  supplier_count?: number;
  client_count?: number;
}

interface Participant {
  id: string;
  name: string;
  type: 'supplier' | 'client';
  project_id: string;
  project_name: string;
  project_code?: string;
}

interface Conversation {
  id: string;
  project_id: string;
  project_name: string;
  project_code?: string;
  channel: 'company_supplier' | 'company_client';
  participant_id: string;
  participant_name: string;
  participant_type: 'supplier' | 'client' | 'company';
  last_message: string;
  last_message_time: string;
  unread_count: number;
  delivery_id?: string;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  sender_type: 'company' | 'supplier' | 'client';
  sender_name: string;
  created_at: string;
  is_read: boolean;
  attachment_url?: string;
  attachment_name?: string;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedChannel) {
      loadMessages(selectedProject.id, selectedChannel, selectedParticipant?.id);
    }
  }, [selectedProject, selectedChannel, selectedParticipant]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const loadMessages = async (projectId: string, channel: string, participantId?: string) => {
    try {
      setLoadingMessages(true);
      let url = `/api/messages?project_id=${projectId}&channel=${channel}`;
      if (participantId) {
        url += `&participant_id=${participantId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark as read
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            channel: channel,
          }),
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProject || !selectedChannel || sending) return;

    try {
      setSending(true);
      const payload: any = {
        project_id: selectedProject.id,
        channel: selectedChannel,
        message: newMessage.trim(),
      };
      
      // If company is messaging a specific participant, include recipient_id
      if (isCompanyMember && selectedParticipant) {
        payload.recipient_id = selectedParticipant.id;
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      } else {
        const err = await response.json();
        console.error('Send error:', err);
        alert(err.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get conversations for a project and channel
  const getProjectChannelConversation = (projectId: string, channel: string) => {
    return conversations.find(c => c.project_id === projectId && c.channel === channel);
  };

  // Get participants for a specific project and type
  const getProjectParticipants = (projectId: string, type: 'supplier' | 'client') => {
    return participants.filter(p => p.project_id === projectId && p.type === type);
  };

  // Get conversation for a specific participant
  const getParticipantConversation = (participantId: string, projectId: string) => {
    return conversations.find(c => c.participant_id === participantId && c.project_id === projectId);
  };

  // Count unread for a project
  const getProjectUnread = (projectId: string) => {
    return conversations
      .filter(c => c.project_id === projectId)
      .reduce((sum, c) => sum + c.unread_count, 0);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  // Determine what the user can see based on role
  const isCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
  const isSupplier = userRole === 'supplier';
  const isClient = userRole === 'viewer' || userRole === 'client';

  // Filter projects by search
  const filteredProjects = projects.filter(p => 
    !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex bg-white">
        {/* Projects List (Left Panel) - Shows project boxes */}
        <div className={`w-full md:w-96 border-r border-gray-200 flex flex-col ${
          selectedProject ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              Messages
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {totalUnread}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSupplier ? 'Chat with project team' : isClient ? 'Chat with project team' : 'Chat with clients & suppliers'}
            </p>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Project Boxes List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No projects found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {projects.length === 0 
                    ? 'Create a project to start messaging'
                    : 'Try a different search term'
                  }
                </p>
              </div>
            ) : (
              filteredProjects.map(project => {
                const supplierConv = getProjectChannelConversation(project.id, 'company_supplier');
                const clientConv = getProjectChannelConversation(project.id, 'company_client');
                const unreadCount = getProjectUnread(project.id);
                const isSelected = selectedProject?.id === project.id;

                return (
                  <div
                    key={project.id}
                    className={`bg-white border-2 rounded-xl overflow-hidden transition-all ${
                      isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Project Header */}
                    <div className="p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                          {project.code && (
                            <span className="text-xs text-gray-500">{project.code}</span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Channel Buttons */}
                    <div className="p-2 space-y-2">
                      {/* Supplier Channel - Show for Company and Suppliers */}
                      {(isCompanyMember || isSupplier) && (
                        <>
                          {isCompanyMember ? (
                            // Company sees individual suppliers
                            <>
                              {getProjectParticipants(project.id, 'supplier').length > 0 ? (
                                getProjectParticipants(project.id, 'supplier').map(participant => {
                                  const conv = getParticipantConversation(participant.id, project.id);
                                  return (
                                    <button
                                      key={participant.id}
                                      onClick={() => {
                                        setSelectedProject(project);
                                        setSelectedChannel('company_supplier');
                                        setSelectedParticipant(participant);
                                      }}
                                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                        isSelected && selectedChannel === 'company_supplier' && selectedParticipant?.id === participant.id
                                          ? 'bg-purple-100 border-2 border-purple-300'
                                          : 'bg-purple-50 hover:bg-purple-100 border-2 border-transparent'
                                      }`}
                                    >
                                      <div className="w-9 h-9 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-4 h-4 text-purple-700" />
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-purple-900 text-sm">
                                            {participant.name}
                                          </span>
                                          {conv?.unread_count ? (
                                            <span className="px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-full">
                                              {conv.unread_count}
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="text-xs text-purple-700 truncate">
                                          {conv?.last_message || 'Start a conversation'}
                                        </p>
                                      </div>
                                      <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">
                                        Supplier
                                      </span>
                                      <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-gray-400">
                                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <Truck className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm">No suppliers assigned</span>
                                </div>
                              )}
                            </>
                          ) : (
                            // Supplier sees project team
                            <button
                              onClick={() => {
                                setSelectedProject(project);
                                setSelectedChannel('company_supplier');
                                setSelectedParticipant(null);
                              }}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                isSelected && selectedChannel === 'company_supplier'
                                  ? 'bg-purple-100 border-2 border-purple-300'
                                  : 'bg-purple-50 hover:bg-purple-100 border-2 border-transparent'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                                <Truck className="w-4 h-4 text-purple-700" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-purple-900 text-sm">
                                    Project Team
                                  </span>
                                  {supplierConv?.unread_count ? (
                                    <span className="px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-full">
                                      {supplierConv.unread_count}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-purple-700 truncate">
                                  {supplierConv?.last_message || 'Start a conversation'}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Client Channel - Show for Company and Clients */}
                      {(isCompanyMember || isClient) && (
                        <>
                          {isCompanyMember ? (
                            // Company sees individual clients
                            <>
                              {getProjectParticipants(project.id, 'client').length > 0 ? (
                                getProjectParticipants(project.id, 'client').map(participant => {
                                  const conv = getParticipantConversation(participant.id, project.id);
                                  return (
                                    <button
                                      key={participant.id}
                                      onClick={() => {
                                        setSelectedProject(project);
                                        setSelectedChannel('company_client');
                                        setSelectedParticipant(participant);
                                      }}
                                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                        isSelected && selectedChannel === 'company_client' && selectedParticipant?.id === participant.id
                                          ? 'bg-blue-100 border-2 border-blue-300'
                                          : 'bg-blue-50 hover:bg-blue-100 border-2 border-transparent'
                                      }`}
                                    >
                                      <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-4 h-4 text-blue-700" />
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-blue-900 text-sm">
                                            {participant.name}
                                          </span>
                                          {conv?.unread_count ? (
                                            <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                                              {conv.unread_count}
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="text-xs text-blue-700 truncate">
                                          {conv?.last_message || 'Start a conversation'}
                                        </p>
                                      </div>
                                      <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">
                                        Client
                                      </span>
                                      <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-gray-400">
                                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm">No clients assigned</span>
                                </div>
                              )}
                            </>
                          ) : (
                            // Client sees project team
                            <button
                              onClick={() => {
                                setSelectedProject(project);
                                setSelectedChannel('company_client');
                                setSelectedParticipant(null);
                              }}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                isSelected && selectedChannel === 'company_client'
                                  ? 'bg-blue-100 border-2 border-blue-300'
                                  : 'bg-blue-50 hover:bg-blue-100 border-2 border-transparent'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-blue-700" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-blue-900 text-sm">
                                    Project Team
                                  </span>
                                  {clientConv?.unread_count ? (
                                    <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                                      {clientConv.unread_count}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-blue-700 truncate">
                                  {clientConv?.last_message || 'Start a conversation'}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area (Right Panel) */}
        <div className={`flex-1 flex flex-col ${
          selectedProject && selectedChannel ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedProject && selectedChannel ? (
            <>
              {/* Chat Header */}
              <div className={`p-4 border-b border-gray-200 ${
                selectedChannel === 'company_supplier' 
                  ? 'bg-gradient-to-r from-purple-50 to-white' 
                  : 'bg-gradient-to-r from-blue-50 to-white'
              }`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedProject(null);
                      setSelectedChannel(null);
                      setSelectedParticipant(null);
                      setMessages([]);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedChannel === 'company_supplier'
                      ? 'bg-purple-200 text-purple-700'
                      : 'bg-blue-200 text-blue-700'
                  }`}>
                    {selectedChannel === 'company_supplier' ? (
                      <Truck className="w-6 h-6" />
                    ) : (
                      <Building2 className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900">
                      {selectedParticipant?.name || (selectedChannel === 'company_supplier' ? 'Supplier Chat' : 'Client Chat')}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="truncate">{selectedProject.name}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    selectedChannel === 'company_supplier'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedParticipant?.type || (selectedChannel === 'company_supplier' ? 'Supplier' : 'Client')}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      selectedChannel === 'company_supplier'
                        ? 'bg-purple-100 text-purple-400'
                        : 'bg-blue-100 text-blue-400'
                    }`}>
                      {selectedChannel === 'company_supplier' ? (
                        <Truck className="w-8 h-8" />
                      ) : (
                        <Building2 className="w-8 h-8" />
                      )}
                    </div>
                    <p className="font-medium text-gray-900">No messages yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Send a message to start the conversation with {selectedChannel === 'company_supplier' ? 'suppliers' : 'clients'}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => {
                      const isOwn = msg.sender_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                            {!isOwn && (
                              <p className="text-xs text-gray-500 mb-1 ml-1">
                                {msg.sender_name}
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                                  msg.sender_type === 'supplier'
                                    ? 'bg-purple-100 text-purple-700'
                                    : msg.sender_type === 'client'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {msg.sender_type}
                                </span>
                              </p>
                            )}
                            <div className={`rounded-2xl px-4 py-2 ${
                              isOwn
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              {msg.attachment_url && (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-1 text-xs mt-2 ${
                                    isOwn ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-700'
                                  }`}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  {msg.attachment_name || 'Attachment'}
                                </a>
                              )}
                            </div>
                            <p className={`text-[10px] mt-1 flex items-center gap-1 ${
                              isOwn ? 'text-right text-gray-400 justify-end' : 'text-gray-400'
                            }`}>
                              {formatTime(msg.created_at)}
                              {isOwn && msg.is_read && (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={selectedParticipant?.name ? `Message ${selectedParticipant.name}...` : `Message ${selectedChannel === 'company_supplier' ? 'suppliers' : 'clients'}...`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className={`p-2.5 rounded-full transition-colors ${
                      selectedChannel === 'company_supplier'
                        ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300'
                        : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'
                    } text-white`}
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Your Messages</h3>
                <p className="text-gray-500">
                  Select a project to view conversations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
