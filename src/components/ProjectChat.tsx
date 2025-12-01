'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  User, 
  Reply, 
  X, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Paperclip
} from 'lucide-react';

interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  message: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  parent_message_id?: string;
  is_read: boolean;
  created_at: string;
  reply_count?: number;
  sender: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface ProjectChatProps {
  projectId: string;
  currentUserId: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function ProjectChat({ 
  projectId, 
  currentUserId,
  isExpanded = true,
  onToggle 
}: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [threadMessages, setThreadMessages] = useState<Record<string, Message[]>>({});
  const [loadingThreads, setLoadingThreads] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      fetchMessages();
      markAsRead();
    }
  }, [projectId, isExpanded]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/messages?parent_id=null`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (parentId: string) => {
    try {
      setLoadingThreads(prev => new Set(prev).add(parentId));
      const response = await fetch(`/api/projects/${projectId}/messages?parent_id=${parentId}`);
      if (response.ok) {
        const data = await response.json();
        setThreadMessages(prev => ({ ...prev, [parentId]: data.messages || [] }));
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
    } finally {
      setLoadingThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/projects/${projectId}/messages`, { method: 'PATCH' });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          parent_message_id: replyingTo?.id || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (replyingTo) {
          // Add to thread
          setThreadMessages(prev => ({
            ...prev,
            [replyingTo.id]: [...(prev[replyingTo.id] || []), data.message],
          }));
          // Update reply count
          setMessages(prev => prev.map(m => 
            m.id === replyingTo.id 
              ? { ...m, reply_count: (m.reply_count || 0) + 1 }
              : m
          ));
          setReplyingTo(null);
        } else {
          // Add to main messages
          setMessages(prev => [...prev, data.message]);
        }
        
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        if (!threadMessages[messageId]) {
          fetchThreadMessages(messageId);
        }
      }
      return newSet;
    });
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

  const renderMessage = (msg: Message, isThread = false) => {
    const isOwn = msg.sender_id === currentUserId;
    const isThreadExpanded = expandedThreads.has(msg.id);
    
    return (
      <div key={msg.id} className={`${isThread ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isOwn ? 'bg-blue-600' : 'bg-gray-400'
          }`}>
            {msg.sender?.avatar_url ? (
              <img 
                src={msg.sender.avatar_url} 
                alt={msg.sender.full_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>

          {/* Message content */}
          <div className={`flex-1 max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
            <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm font-medium text-gray-900">
                {msg.sender?.full_name || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
            </div>
            
            <div className={`inline-block rounded-lg px-4 py-2 ${
              isOwn 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
              
              {msg.attachment_url && (
                <a 
                  href={msg.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-xs mt-2 ${
                    isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <Paperclip className="w-3 h-3" />
                  {msg.attachment_name || 'Attachment'}
                </a>
              )}
            </div>

            {/* Actions */}
            {!isThread && (
              <div className={`flex items-center gap-3 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <button 
                  onClick={() => setReplyingTo(msg)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
                
                {(msg.reply_count || 0) > 0 && (
                  <button 
                    onClick={() => toggleThread(msg.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {isThreadExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Hide replies
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Thread replies */}
        {!isThread && isThreadExpanded && (
          <div className="mt-3 space-y-3">
            {loadingThreads.has(msg.id) ? (
              <div className="ml-8 flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading replies...
              </div>
            ) : (
              threadMessages[msg.id]?.map(reply => renderMessage(reply, true))
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-20 right-6 md:bottom-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-40 flex items-center gap-2"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="hidden md:inline">Chat</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-[calc(100%-2rem)] md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Project Chat</h3>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="w-12 h-12 mb-2 text-gray-400" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map(msg => renderMessage(msg))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="text-gray-400">Replying to </span>
            <span className="font-medium">{replyingTo.sender?.full_name}</span>
          </div>
          <button 
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={replyingTo ? "Write a reply..." : "Type a message..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full transition-colors"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
