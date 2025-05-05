import React, { useState, useEffect, useRef } from 'react';
import { WebRTCManager } from '../WebRTCManager';
import { Mic, MicOff, Video, VideoOff, MessageSquare, Users, Settings, LogOut } from 'lucide-react';
import ChatPanel from './ChatPanel';
import UserList from './UserList';

function ConferenceView({ socket, username, roomId, onLeave }) {
  // State for video/audio streams and UI
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  
  // Refs
  const localVideoRef = useRef(null);
  const webRTCManagerRef = useRef(null);

  // Initialize WebRTC and join room
  useEffect(() => {
    if (!socket || !username || !roomId) {
      setError('Missing required information to join the conference');
      setIsLoading(false);
      return;
    }

    const startConference = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create WebRTC manager and set up callbacks
        const webRTCManager = new WebRTCManager(
          socket,
          // On remote stream added
          (userId, stream, username) => {
            setRemoteStreams(prev => ({
              ...prev, 
              [userId]: { stream, username }
            }));
          },
          // On remote stream removed
          (userId) => {
            setRemoteStreams(prev => {
              const newStreams = { ...prev };
              delete newStreams[userId];
              return newStreams;
            });
          }
        );
        
        webRTCManagerRef.current = webRTCManager;
        
        // Initialize and get local stream
        const stream = await webRTCManager.init(roomId, username);
        setLocalStream(stream);
        
        // Set local video
        if (localVideoRef.current && stream) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to start conference:', err);
        if (err.message === 'MEDIA_DENIED') {
          setError('Failed to access media devices. Please check your permissions.');
        } else {
          setError(err.message || 'Failed to join the conference');
        }
        setIsLoading(false);
      }
    };

    startConference();

    // Handle users in the room
    const handleRoomUsers = (users) => {
      setParticipants(users);
    };

    socket.on('room-users', handleRoomUsers);

    // Handle user connected/disconnected
    socket.on('user-connected', ({ userId, username }) => {
      setParticipants(prev => [
        ...prev,
        { id: userId, username }
      ]);
    });

    socket.on('user-disconnected', (userId) => {
      setParticipants(prev => prev.filter(user => user.id !== userId));
    });

    // Clean up on component unmount
    return () => {
      if (webRTCManagerRef.current) {
        webRTCManagerRef.current.disconnect();
      }
      socket.off('room-users', handleRoomUsers);
      socket.off('user-connected');
      socket.off('user-disconnected');
    };
  }, [socket, username, roomId]);

  // Toggle microphone
  const toggleMicrophone = () => {
    if (webRTCManagerRef.current) {
      const newState = !isMicEnabled;
      webRTCManagerRef.current.toggleAudio(newState);
      setIsMicEnabled(newState);
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (webRTCManagerRef.current) {
      const newState = !isVideoEnabled;
      webRTCManagerRef.current.toggleVideo(newState);
      setIsVideoEnabled(newState);
    }
  };

  // Handle leave conference
  const handleLeave = () => {
    if (webRTCManagerRef.current) {
      webRTCManagerRef.current.disconnect();
    }
    if (onLeave) onLeave();
  };

  // Render loading state
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

  // Render error state
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
      {/* Header */}
      <header className="bg-white shadow-sm p-3">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-blue-600">
            Conference: {roomId}
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 mr-2">
              Joined as: <span className="font-medium">{username}</span>
            </span>
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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className={`flex-1 p-3 ${isChatOpen || isUserListOpen ? 'lg:mr-80' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {/* Local video */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-sm bg-black bg-opacity-60 text-white px-2 py-1 rounded-md">
                  {username} (You)
                </div>
              </div>
            </div>

            {/* Remote videos */}
            {Object.entries(remoteStreams).map(([userId, { stream, username: remoteUsername }]) => (
              <div key={userId} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="relative aspect-video">
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    srcObject={stream}
                  />
                  <div className="absolute bottom-2 left-2 text-sm bg-black bg-opacity-60 text-white px-2 py-1 rounded-md">
                    {remoteUsername || `User ${userId.substring(0, 4)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat/Participants sidebar */}
        <div 
          className={`fixed right-0 top-0 bottom-0 w-80 bg-white shadow-lg border-l border-gray-200 z-10 transform transition-transform duration-300 ease-in-out ${
            isChatOpen || isUserListOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex border-b border-gray-200">
              <button 
                className={`flex-1 py-3 font-medium text-sm ${isChatOpen ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => { setIsChatOpen(true); setIsUserListOpen(false); }}
              >
                Chat
              </button>
              <button 
                className={`flex-1 py-3 font-medium text-sm ${isUserListOpen ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => { setIsUserListOpen(true); setIsChatOpen(false); }}
              >
                Participants ({participants.length})
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isChatOpen && <ChatPanel socket={socket} username={username} />}
              {isUserListOpen && <UserList users={participants} />}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
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
            onClick={() => { setIsChatOpen(!isChatOpen); setIsUserListOpen(false); }}
            className={`p-3 rounded-full ${isChatOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Toggle Chat"
          >
            <MessageSquare size={20} />
          </button>
          <button
            onClick={() => { setIsUserListOpen(!isUserListOpen); setIsChatOpen(false); }}
            className={`p-3 rounded-full ${isUserListOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
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