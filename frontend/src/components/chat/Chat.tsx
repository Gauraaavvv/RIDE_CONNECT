import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { messageAPI } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  receiver?: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

interface ChatProps {
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  entityId?: string;
  entityType?: 'ride' | 'car' | 'driver' | null;
  isOpen: boolean;
  onClose: () => void;
}

const Chat: React.FC<ChatProps> = ({
  receiverId,
  receiverName,
  receiverAvatar,
  entityId,
  entityType,
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [socket, setSocket] = useState<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadMessages();
      setupSocket();
    }
  }, [isOpen, receiverId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await messageAPI.getConversation(receiverId);
      const sortedMessages = (data || []).sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sortedMessages);
      
      // Calculate unread count
      const unread = sortedMessages.filter((m: Message) => 
        !m.isRead && m.senderId !== user?.id
      ).length;
      setUnreadCount(unread);
      
      // Mark messages as seen when chat opens
      if (unread > 0) {
        sortedMessages.forEach(async (m: Message) => {
          if (!m.isRead && m.senderId !== user?.id) {
            await messageAPI.markAsRead(m._id);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    // Connect to Socket.io server
    const io = (window as any).io;
    if (io && user?.id) {
      const socketInstance = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
      setSocket(socketInstance);
      
      // Join user room immediately on connection
      socketInstance.on('connect', () => {
        socketInstance.emit('join', user?.id);
      });

      // Join user room on initial connection
      socketInstance.emit('join', user?.id);

      // Listen for new messages
      socketInstance.on('receive_message', (message: Message) => {
        if (
          (message.senderId === receiverId && message.receiverId === user?.id) ||
          (message.senderId === user?.id && message.receiverId === receiverId)
        ) {
          setMessages((prev) => [...prev, message]);
        }
      });

      // Handle reconnection
      socketInstance.on('reconnect', () => {
        socketInstance.emit('join', user?.id);
      });

      return () => {
        socketInstance.disconnect();
      };
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;

    try {
      const message = await messageAPI.send({
        receiverId,
        text: newMessage.trim(),
        entityId,
        entityType
      });

      // Emit via socket if connected
      if (socket) {
        socket.emit('send_message', {
          senderId: user.id,
          receiverId,
          text: newMessage.trim(),
          entityId,
          entityType,
          senderName: user.name
        });
      }

      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 ${
          isMinimized ? 'w-80' : 'w-96'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              {receiverAvatar ? (
                <img src={receiverAvatar} alt={receiverName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-indigo-600 font-bold">{receiverName.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">{receiverName}</h3>
              <p className="text-indigo-100 text-sm">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-5 h-5 text-white" /> : <Minimize2 className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  return (
                    <motion.div
                      key={message._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-indigo-500 text-white rounded-br-md'
                            : 'bg-white text-slate-800 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200 rounded-b-2xl">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Chat;
