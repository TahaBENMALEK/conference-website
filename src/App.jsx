import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout';
import ConferenceView from './components/ConferenceView';
import ChatPanel from './components/ChatPanel';
import UserList from './components/UserList';
import SettingsPage from './components/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      setUserId(newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('user-connected', (id) => {
      setUsers((prevUsers) => [...prevUsers, { id, name: `User ${id.substring(0, 5)}` }]);
    });

    newSocket.on('user-disconnected', (id) => {
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
    });

    newSocket.on('chat-message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

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
    <ErrorBoundary>
      <Layout>
        <nav className="flex space-x-4 p-4 bg-gray-100 border-b border-neutral-200">
          <Link to="/" className="text-blue-500 hover:underline">Home</Link>
          <Link to="/chat" className="text-blue-500 hover:underline">Chat</Link>
          <Link to="/settings" className="text-blue-500 hover:underline">Settings</Link>
          <Link to="/participants" className="text-blue-500 hover:underline">Participants</Link>
        </nav>
        <div className="flex flex-col md:flex-row h-full">
          <Routes>
            <Route path="/" element={<ConferenceView socket={socket} userId={userId} />} />
            <Route path="/chat" element={<ChatPanel messages={messages} sendMessage={sendMessage} userId={userId} />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/participants" element={<UserList users={users} />} />
          </Routes>
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;