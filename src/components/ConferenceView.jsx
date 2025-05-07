import React, { useState, useEffect, useRef } from 'react';
import { WebRTCManager } from '../WebRTCManager.js';
import { Mic, MicOff, Video, VideoOff, MessageSquare, Users, Settings, LogOut } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';
import VideoPanel from './VideoPanel';
import SidebarPanel from './SidebarPanel';

function ConferenceView({ socket, username, roomId, onLeave, isConnected }) {
  const [webRTCManager, setWebRTCManager] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [mediaError, setMediaError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarActiveTab, setSidebarActiveTab] = useState('chat');
  const [participants, setParticipants] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const localVideoRef = useRef(null);

  // Handle remote stream when received from WebRTC
  const handleRemoteStream = (userId, stream, username) => {
    console.log(`Received remote stream from ${username || userId}`);
    setRemoteStreams(prev => ({
      ...prev,
      [userId]: { stream, username }
    }));
  };

  // Handle remote stream removed
  const handleRemoteStreamRemoved = (userId) => {
    console.log(`Remote stream removed for ${userId}`);
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    setSocketConnected(isConnected);

    // Create WebRTCManager with proper callbacks
    const manager = new WebRTCManager(
      socket,
      handleRemoteStream,
      handleRemoteStreamRemoved
    );
    setWebRTCManager(manager);

    const initializeWebRTC = async () => {
      try {
        setIsLoading(true);
        // Use the init method instead of initialize
        const stream = await manager.init(roomId, username);
        
        if (stream) {
          setLocalStream(stream);
          // Set local video stream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          console.warn('No media stream available');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('WebRTC initialization error:', error);
        setMediaError(error.message);
        setError(error.message);
        setIsLoading(false);
      }
    };

    initializeWebRTC();

    // Socket connection status monitoring
    const handleConnect = () => {
      setSocketConnected(true);
      console.log('Socket connected in ConferenceView');
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      console.log('Socket disconnected in ConferenceView');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Room participants handling
    socket.on('room-users', (users) => {
      console.log('Received room users:', users);
      setParticipants(users);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-users');
      if (manager) {
        manager.disconnect();
      }
    };
  }, [socket, isConnected, roomId, username]);

  useEffect(() => {
    // Update local video when stream changes
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const toggleMicrophone = () => {
    if (webRTCManager) {
      const newState = !isMicEnabled;
      webRTCManager.toggleAudio(newState);
      setIsMicEnabled(newState);
    }
  };

  const toggleCamera = () => {
    if (webRTCManager) {
      const newState = !isVideoEnabled;
      webRTCManager.toggleVideo(newState);
      setIsVideoEnabled(newState);
    }
  };

  const handleLeave = () => {
    if (webRTCManager) {
      webRTCManager.disconnect();
    }
    if (onLeave) onLeave();
  };

  const toggleSidebarTab = (tab) => {
    if (sidebarActiveTab === tab && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
      setSidebarActiveTab(tab);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Joining conference...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isMediaError = error.includes('media devices');
    
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-red-500 text-lg font-semibold mb-2">Error Joining Conference</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          
          {isMediaError && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-sm text-yellow-700">
                Your browser needs permission to use your camera and microphone.
                Please check your browser settings and ensure camera/microphone access is allowed for this site.
              </p>
            </div>
          )}
          
          <div className="flex space-x-3">
            {isMediaError && (
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex-1"
              >
                Try Again
              </button>
            )}
            <button 
              onClick={onLeave} 
              className={`${isMediaError ? 'bg-gray-500' : 'bg-blue-500'} text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors flex-1`}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <header className="bg-white shadow-sm p-3">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-blue-600">
            Conference: {roomId}
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 mr-2">
              Joined as: <span className="font-medium">{username}</span>
            </span>
            <ConnectionStatus connected={socketConnected} socket={socket} />
            <button 
              onClick={handleLeave} 
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Leave Conference"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={`flex-1 ${isSidebarOpen ? 'lg:mr-80' : ''}`}>
          <VideoPanel 
            localVideoRef={localVideoRef}
            username={username}
            isVideoEnabled={isVideoEnabled}
            remoteStreams={remoteStreams}
            participants={participants}
            socketConnected={socketConnected}
          />
        </div>

        <SidebarPanel 
          isOpen={isSidebarOpen}
          activeTab={sidebarActiveTab}
          socket={socket}
          username={username}
          participants={participants}
          toggleTab={toggleSidebarTab}
        />
      </div>

      <div className="bg-white border-t border-gray-200 py-3 px-4">
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleMicrophone}
            className={`p-3 rounded-full ${isMicEnabled ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}
            title={isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full ${isVideoEnabled ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button
            onClick={() => toggleSidebarTab('chat')}
            className={`p-3 rounded-full ${sidebarActiveTab === 'chat' && isSidebarOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Toggle Chat"
          >
            <MessageSquare size={20} />
          </button>
          <button
            onClick={() => toggleSidebarTab('users')}
            className={`p-3 rounded-full ${sidebarActiveTab === 'users' && isSidebarOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Toggle Participants"
          >
            <Users size={20} />
          </button>
          <button
            className="p-3 rounded-full bg-gray-100 text-gray-600"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConferenceView;