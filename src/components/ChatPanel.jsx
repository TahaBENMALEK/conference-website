import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

const ChatPanel = ({ messages, sendMessage, userId }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      // Emit typing start event (you can add this to socket)
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout
    const newTimeout = setTimeout(() => {
      setIsTyping(false);
      // Emit typing stop event (you can add this to socket)
    }, 1000);
    
    setTypingTimeout(newTimeout);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
      // Reset typing indicator
      setIsTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, just show a message with the file name
      // In a real implementation, you'd upload the file and send a link
      sendMessage(`[File: ${file.name}]`);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateStr = date.toLocaleDateString();
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      
      groups[dateStr].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Chat</h2>
      </div>
      
      {/* Messages area */}
      <div className="flex-grow p-3 overflow-y-auto">
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date} className="mb-4">
            <div className="flex items-center justify-center my-2">
              <div className="bg-gray-200 rounded-full px-3 py-1 text-xs text-gray-600">
                {date === new Date().toLocaleDateString() ? 'Today' : date}
              </div>
            </div>
            
            {msgs.map((message) => (
              <div 
                key={message.id} 
                className={`flex mb-2 ${message.userId === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xs sm:max-w-sm md:max-w-md rounded-lg px-3 py-2 ${
                    message.userId === userId 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="text-sm break-words">{message.text}</div>
                  <div 
                    className={`text-xs ${
                      message.userId === userId ? 'text-blue-100' : 'text-gray-500'
                    } text-right mt-1`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
        <div className="flex items-center">
          <button 
            type="button" 
            onClick={handleFileSelect}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          
          <button 
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Smile size={20} />
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-grow mx-2 p-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button 
            type="submit" 
            disabled={!inputValue.trim()}
            className={`p-2 rounded-full ${
              inputValue.trim() 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;