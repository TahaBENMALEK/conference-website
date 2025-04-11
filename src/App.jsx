import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Layout from './components/Layout';
import ConferenceView from './components/ConferenceView';
import ChatPanel from './components/ChatPanel';
import UserList from './components/UserList';
import ConnectionStatus from './components/ConnectionStatus';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io();
    setSocket(newSocket);

    // Socket event handlers
    newSocket.on('connect', () => {
      setConnected(true);
      setUserId(newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('user-connected', (id) => {
      setUsers(prevUsers => [...prevUsers, { id, name: `User ${id.substring(0, 5)}` }]);
    });

    newSocket.on('user-disconnected', (id) => {
      setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
    });

    newSocket.on('chat-message', (data) => {
      setMessages(prevMessages => [...prevMessages, data]);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = (text) => {
    if (socket && text.trim() !== '') {
      const messageData = {
        id: Date.now(),
        userId,
        text,
        timestamp: new Date().toISOString(),
      };
      
      socket.emit('chat-message', messageData);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row h-full">
        <div className="flex-grow">
          <ConferenceView socket={socket} userId={userId} />
        </div>
        <div className="w-full md:w-80 lg:w-96 border-l border-neutral-200 flex flex-col">
          <UserList users={users} />
          <div className="flex-grow overflow-hidden">
            <ChatPanel messages={messages} sendMessage={sendMessage} userId={userId} />
          </div>
          <ConnectionStatus connected={connected} />
        </div>
      </div>
    </Layout>
  );
}

export default App;