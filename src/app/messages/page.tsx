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
  ArrowLeft
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface Conversation {
  id: string;
  project_id: string;
  project_name: string;
  project_code?: string;
  channel: 'company_supplier' | 'company_client';
  participant_name: string;
  participant_type: 'supplier' | 'client';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'suppliers' | 'clients'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

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
        setCurrentUserId(data.currentUserId || '');
        setUserRole(data.userRole || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversation: Conversation) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(
        `/api/messages?project_id=${conversation.project_id}&channel=${conversation.channel}${conversation.delivery_id ? `&delivery_id=${conversation.delivery_id}` : ''}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark as read
        await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: conversation.project_id,
            channel: conversation.channel,
            delivery_id: conversation.delivery_id,
          }),
        });

        // Update unread count in conversations
        setConversations(prev => prev.map(c => 
          c.id === conversation.id ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedConversation.project_id,
          channel: selectedConversation.channel,
          delivery_id: selectedConversation.delivery_id,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');

        // Update conversation preview
        setConversations(prev => prev.map(c => 
          c.id === selectedConversation.id 
            ? { ...c, last_message: newMessage.trim(), last_message_time: new Date().toISOString() }
            : c
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
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

  // Group conversations by project
  const groupedByProject = conversations.reduce((acc, conv) => {
    const key = conv.project_id;
    if (!acc[key]) {
      acc[key] = {
        project_id: conv.project_id,
        project_name: conv.project_name,
        project_code: conv.project_code,
        conversations: [],
        total_unread: 0,
      };
    }
    acc[key].conversations.push(conv);
    acc[key].total_unread += conv.unread_count;
    return acc;
  }, {} as Record<string, { project_id: string; project_name: string; project_code?: string; conversations: Conversation[]; total_unread: number }>);

  const projectGroups = Object.values(groupedByProject);

  // Filter conversations for selected project
  const projectConversations = selectedProject
    ? conversations.filter(c => {
        const matchesProject = c.project_id === selectedProject.id;
        const matchesFilter = 
          filter === 'all' ||
          (filter === 'suppliers' && c.participant_type === 'supplier') ||
          (filter === 'clients' && c.participant_type === 'client');
        const matchesSearch = 
          !searchTerm ||
          c.participant_name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesProject && matchesFilter && matchesSearch;
      })
    : [];

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  // Determine what the user can see based on role
  const isCompanyMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
  const isClient = userRole === 'viewer' || userRole === 'client';

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex bg-white">
        {/* Projects List (Left Panel) */}
        <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${
          selectedProject || selectedConversation ? 'hidden md:flex' : 'flex'
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
              {isClient ? 'Chat with your project team' : 'Chat with clients & suppliers'}
            </p>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : projectGroups.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No conversations yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Messages will appear here when you start chatting
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {projectGroups.map(group => (
                  <button
                    key={group.project_id}
                    onClick={() => {
                      setSelectedProject({
                        id: group.project_id,
                        name: group.project_name,
                        code: group.project_code,
                        status: 'active',
                      });
                      setSelectedConversation(null);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedProject?.id === group.project_id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-gray-900 truncate">
                            {group.project_name}
                          </span>
                          {group.total_unread > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full flex-shrink-0 ml-2">
                              {group.total_unread}
                            </span>
                          )}
                        </div>
                        {group.project_code && (
                          <span className="text-xs text-gray-500">{group.project_code}</span>
                        )}
                        <p className="text-sm text-gray-500 mt-0.5">
                          {group.conversations.length} conversation{group.conversations.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversations List (Middle Panel) - Only shows when project is selected */}
        {selectedProject && !selectedConversation && (
          <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="md:hidden p-1 hover:bg-gray-100 rounded"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 truncate">{selectedProject.name}</h2>
                  {selectedProject.code && (
                    <span className="text-xs text-gray-500">{selectedProject.code}</span>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filter tabs - Only for company members who can see both */}
              {isCompanyMember && (
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('suppliers')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                      filter === 'suppliers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Suppliers
                  </button>
                  <button
                    onClick={() => setFilter('clients')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                      filter === 'clients' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Clients
                  </button>
                </div>
              )}
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {projectConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No conversations in this project</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {projectConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          conv.participant_type === 'supplier'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {conv.participant_type === 'supplier' ? (
                            <Truck className="w-5 h-5" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 truncate">
                              {conv.participant_name}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatTime(conv.last_message_time)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1 capitalize">
                            {conv.participant_type}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {conv.last_message}
                          </p>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Area (Right Panel) */}
        <div className={`flex-1 flex flex-col ${
          selectedConversation ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedConversation.participant_type === 'supplier'
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  {selectedConversation.participant_type === 'supplier' ? (
                    <Truck className="w-5 h-5" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {selectedConversation.participant_name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="truncate">{selectedConversation.project_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      selectedConversation.participant_type === 'supplier'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {selectedConversation.participant_type}
                    </span>
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
                    <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
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
                              isOwn ? 'text-right text-gray-400' : 'text-gray-400'
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
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors"
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
                  {selectedProject 
                    ? 'Select a conversation to start chatting'
                    : 'Select a project to view conversations'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
