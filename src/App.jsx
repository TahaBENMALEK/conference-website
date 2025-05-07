import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Layout from './components/Layout';
import JoinRoomView from './components/JoinRoomView';
import ConferenceView from './components/ConferenceView';
import SettingsPage from './components/SettingsPage';
import ChatPanel from './components/ChatPanel';
import ErrorPage from './components/ErrorPage';
import UserList from './components/UserList';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState({
    username: '',
    roomId: ''
  });

  // Function to handle manual reconnection
  const handleReconnect = useCallback(() => {
    if (socket) {
      console.log('Attempting manual reconnection...');
      socket.disconnect();
      setTimeout(() => {
        socket.connect();
      }, 1000);
    }
  }, [socket]);

  // Initialize socket connection
  useEffect(() => {
    // Connect to server
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 20000,
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true
    });

    // Check initial connection state
    setConnected(newSocket.connected);

    newSocket.on('connection_established', (data) => {
      console.log('Connection established with ID:', data.id);
      setConnected(true);
      
      // Rejoin room if we were in one
      if (user.roomId && user.username) {
        newSocket.emit('join-room', { roomId: user.roomId, username: user.username }, (response) => {
          if (response && response.success) {
            console.log('Successfully rejoined room');
            newSocket.emit('get-room-users', { roomId: user.roomId });
          }
        });
      }
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnected(false);
      
      // Try to reconnect manually
      setTimeout(() => {
        console.log('Attempting manual reconnection...');
        newSocket.connect();
      }, 2000);
    });

    // Handle room users updates
    newSocket.on('room-users', (roomUsers) => {
      console.log('Room users updated:', roomUsers);
      setUsers(roomUsers);
    });

    newSocket.on('user-connected', (data) => {
      console.log('User connected:', data);
      setUsers(prev => {
        // Only add if not already in the list
        if (!prev.find(u => u.id === data.userId)) {
          return [...prev, { id: data.userId, username: data.username, isConnected: true }];
        }
        return prev;
      });
    });

    newSocket.on('user-disconnected', (userId) => {
      console.log('User disconnected:', userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    });

    // Add ping mechanism to verify connection
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping', (response) => {
          if (response && response.time) {
            setConnected(true);
          }
        });
      }
    }, 5000);

    setSocket(newSocket);
    
    // Clean up on unmount
    return () => {
      clearInterval(pingInterval);
      newSocket.disconnect();
    };
  }, []);

  // Re-subscribe to room events when user info changes
  useEffect(() => {
    if (socket && connected && user.roomId && user.username) {
      // Request updated room users list
      socket.emit('get-room-users', { roomId: user.roomId });
      
      // Setup periodic refresh of room users list to ensure sync
      const refreshInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('get-room-users', { roomId: user.roomId });
        }
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(refreshInterval);
    }
  }, [connected, user.roomId, user.username, socket]);

  // Handle joining a room
  const handleJoinRoom = (roomId, username) => {
    console.log('Joining room with:', { roomId, username });
    setUser({ username, roomId });
    
    if (socket) {
      if (!socket.connected) {
        console.warn('Socket not connected, attempting reconnect before joining room');
        socket.connect();
        
        // Wait for connection before joining
        socket.once('connect', () => {
          socket.emit('join-room', { roomId, username });
          setTimeout(() => {
            socket.emit('get-room-users', { roomId });
          }, 500);
        });
      } else {
        socket.emit('join-room', { roomId, username });
        
        // Explicitly request room users after joining
        setTimeout(() => {
          socket.emit('get-room-users', { roomId });
        }, 500);
      }
    }
  };

  // Handle leaving a room
  const handleLeaveRoom = () => {
    console.log('Leaving room:', user);
    
    if (socket && socket.connected) {
      socket.emit('leave-room');
    }
    
    setUser({ username: '', roomId: '' });
    setUsers([]); // Clear users list when leaving
    return <Navigate to="/" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          user.username && user.roomId ? (
            <Navigate to="/conference" />
          ) : (
            <JoinRoomView 
              onJoinRoom={handleJoinRoom} 
              isConnected={connected}
              onReconnect={handleReconnect}
            />
          )
        } />
        
        <Route path="/conference" element={
          user.username && user.roomId ? (
            <Layout
              isConnected={connected}
              onReconnect={handleReconnect}
            >
              <ConferenceView
                socket={socket}
                username={user.username}
                roomId={user.roomId}
                onLeave={handleLeaveRoom}
                isConnected={connected}
              />
            </Layout>
          ) : (
            <Navigate to="/" />
          )
        } />
        <Route path="/chat" element={
          user.username && user.roomId ? (
            <Layout
              isConnected={connected}
              onReconnect={handleReconnect}
            >
              <ChatPanel 
                socket={socket} 
                username={user.username} 
                isConnected={connected}
              />
            </Layout>
          ) : (
            <Navigate to="/" />
          )
        } />
        
        <Route path="/settings" element={
          user.username && user.roomId ? (
            <Layout
              isConnected={connected}
              onReconnect={handleReconnect}
            >
              <SettingsPage />
            </Layout>
          ) : (
            <Navigate to="/" />
          )
        } />
        <Route path="/participants" element={
          user.username && user.roomId ? (
            <Layout
              isConnected={connected}
              onReconnect={handleReconnect}
            >
              <UserList 
                users={users} 
                currentUserId={socket?.id} 
              />
            </Layout>
          ) : (
            <Navigate to="/" />
          )
        } />
        
        <Route path="/error" element={
          <ErrorPage 
            type="CONNECTION_FAILED" 
            onReset={() => {
              handleReconnect();
              window.location.href = '/';
            }} 
          />
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;