import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ConferenceView from './components/ConferenceView';
import ChatPanel from './components/ChatPanel';
import UserList from './components/UserList';
import SettingsPage from './components/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectionStatus from './components/ConnectionStatus';
import { ToastProvider } from './components/ToastNotification';

// Helper function to check media permissions without requesting them
const checkMediaPermissions = async () => {
  try {
    // Get permission status if supported
    if (navigator.permissions) {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' });
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
      
      return {
        camera: cameraPermission.state,
        microphone: microphonePermission.state
      };
    }
    return { camera: 'unknown', microphone: 'unknown' };
  } catch (err) {
    console.warn('Permissions API not supported:', err);
    return { camera: 'unknown', microphone: 'unknown' };
  }
};

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState('');
  const [currentRoom, setCurrentRoom] = useState('lobby'); // Default room
  const [mediaPermissionState, setMediaPermissionState] = useState({
    checked: false,
    granted: false
  });

  // Add a function to check permissions without requesting them
  const checkPermissions = async () => {
    try {
      const status = await checkMediaPermissions();
      setMediaPermissionState({
        checked: true,
        granted: status.camera === 'granted' && status.microphone === 'granted'
      });
    } catch (err) {
      console.warn('Could not check permission status:', err);
      setMediaPermissionState({
        checked: true,
        granted: false
      });
    }
  };

  // Call this in a useEffect
  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io({
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    setSocket(newSocket);

    // Handle connection events
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
      setUserId(newSocket.id);
      
      // Join default room
      newSocket.emit('join-room', currentRoom);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
    });

    // Handle user events
    newSocket.on('user-connected', (id) => {
      console.log('User connected:', id);
      setUsers((prevUsers) => {
        // Avoid duplicate users
        if (prevUsers.some(user => user.id === id)) return prevUsers;
        return [...prevUsers, { id, name: `User ${id.substring(0, 5)}` }];
      });
    });

    newSocket.on('user-disconnected', (id) => {
      console.log('User disconnected:', id);
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
    });

    // Handle room users
    newSocket.on('room-users', (userIds) => {
      console.log('Room users:', userIds);
      setUsers(userIds.map(id => ({ id, name: `User ${id.substring(0, 5)}` })));
    });

    // Handle chat messages
    newSocket.on('chat-message', (data) => {
      console.log('Chat message received:', data);
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle room changes
  useEffect(() => {
    if (socket && socket.connected) {
      socket.emit('join-room', currentRoom);
    }
  }, [currentRoom, socket]);

  const sendMessage = (text) => {
    if (socket && text.trim() !== '') {
      const messageData = {
        id: Date.now(),
        text,
        timestamp: new Date().toISOString(),
        userId
      };
      
      console.log('Sending message:', messageData);
      socket.emit('chat-message', messageData);
      
      // Add own message to local state immediately for better UX
      setMessages((prevMessages) => [
        ...prevMessages, 
        messageData
      ]);
    }
  };

  return (
    <Router>
      <ToastProvider>
        <ErrorBoundary>
          <Layout>
            <div className="flex flex-col md:flex-row h-full">
              <div className="flex-grow overflow-hidden">
                <Routes>
                  <Route path="/" element={<Navigate to="/conference" replace />} />
                  <Route 
                    path="/conference" 
                    element={
                      <ConferenceView 
                        socket={socket} 
                        userId={userId}
                        mediaPermissionState={mediaPermissionState}
                        onCheckPermissions={checkPermissions}
                      />
                    } 
                  />
                  <Route 
                    path="/chat" 
                    element={
                      <div className="h-full flex flex-col md:flex-row">
                        <div className="flex-grow">
                          <ChatPanel 
                            messages={messages} 
                            sendMessage={sendMessage} 
                            userId={userId} 
                          />
                        </div>
                        <div className="w-full md:w-64 shrink-0 border-l border-gray-200">
                          <UserList users={users} />
                        </div>
                      </div>
                    } 
                  />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/participants" element={
                    <div className="p-4">
                      <h1 className="text-2xl font-bold mb-4">Participants</h1>
                      <UserList users={users} />
                    </div>
                  } />
                </Routes>
              </div>
            </div>
            <ConnectionStatus connected={connected} />
          </Layout>
        </ErrorBoundary>
      </ToastProvider>
    </Router>
  );
}

export default App;