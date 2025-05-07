import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

function ChatPanel({ socket, username, isConnected }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socketReady, setSocketReady] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if socket is ready and set up listeners
  useEffect(() => {
    if (!socket) {
      console.warn('ChatPanel: Socket is not provided');
      setSocketReady(false);
      return;
    }

    // Ensure socket ready state is updated correctly
    const updateSocketReady = () => {
      const ready = socket && socket.connected;
      console.log('ChatPanel: Updating socket ready state:', { socketConnected: socket.connected, isConnected, ready });
      setSocketReady(ready);
    };

    // Initial status check
    updateSocketReady();

    // Handle connection events
    const handleConnect = () => {
      console.log('ChatPanel: Socket connected');
      updateSocketReady();
    };

    const handleDisconnect = () => {
      console.log('ChatPanel: Socket disconnected');
      setSocketReady(false);
    };

    // Listen for incoming chat messages
    const handleChatMessage = (message) => {
      console.log('ChatPanel: Received message:', message);
      setMessages(prevMessages => [...prevMessages, message]);
    };

    // Set up event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat-message', handleChatMessage);

    // Check status regularly to catch any missed events
    const statusCheck = setInterval(updateSocketReady, 2000);

    // Clean up on unmount
    return () => {
      clearInterval(statusCheck);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat-message', handleChatMessage);
    };
  }, [socket, isConnected]);

  // Update socket status when isConnected prop changes
  useEffect(() => {
    if (socket && socket.connected && isConnected) {
      setSocketReady(true);
    } else {
      setSocketReady(false);
    }
  }, [isConnected, socket]);

  // Send a message
  const sendMessage = (e) => {
    e.preventDefault();
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !socket) {
      return;
    }

    // Check if socket is actually connected regardless of state
    if (!socket.connected) {
      console.warn('Socket appears disconnected, attempting to reconnect...');
      socket.connect();
      // Add visual feedback here
      return;
    }

    console.log('ChatPanel: Sending message:', trimmedMessage);
    
    try {
      // Send the chat message event
      socket.emit('chat-message', trimmedMessage);
      
      // Clear input immediately for better UX
      setNewMessage('');
      
      // Add temporary local message until server confirms
      const tempMessage = {
        senderId: socket.id,
        senderName: username,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
        pending: true // Mark as pending until confirmed
      };
      
      // If server doesn't echo back quickly, show locally
      const messageTimeout = setTimeout(() => {
        setMessages(prev => {
          // Only add if not already added by server echo
          if (!prev.find(m => 
            m.senderId === tempMessage.senderId && 
            m.message === tempMessage.message &&
            Math.abs(new Date(m.timestamp) - new Date(tempMessage.timestamp)) < 2000
          )) {
            return [...prev, tempMessage];
          }
          return prev;
        });
      }, 300);
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(messageTimeout);
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection status indicator */}
      {!socketReady && (
        <div className="bg-yellow-100 text-yellow-800 text-xs p-2 text-center">
          Chat connection issues. Messages may not send.
        </div>
      )}
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === socket?.id;
            
            return (
              <div 
                key={index} 
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs md:max-w-sm rounded-lg py-2 px-3 ${
                    isOwnMessage 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  } ${msg.pending ? 'opacity-70' : ''}`}
                >
                  {!isOwnMessage && (
                    <div className="font-medium text-xs mb-1">
                      {msg.senderName}
                    </div>
                  )}
                  <div className="text-sm">{msg.message}</div>
                  <div 
                    className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'} text-right mt-1 flex items-center justify-end`}
                  >
                    {formatTime(msg.timestamp)}
                    {msg.pending && (
                      <span className="ml-1 text-xs">⌛</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={socketReady ? "Type a message..." : "Reconnecting..."}
          className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          disabled={!socketReady}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || !socketReady}
          className="bg-blue-500 text-white px-3 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;