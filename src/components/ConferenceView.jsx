import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Settings, Mic, MicOff, Video, VideoOff } from 'lucide-react';

const ConferenceView = ({ socket, userId }) => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});

  useEffect(() => {
    if (!socket) return;

    // Initialize media
    initializeMedia();

    // Handle WebRTC signaling events
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);

    return () => {
      // Cleanup
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      
      // Stop all media tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close all peer connections
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [socket, userId]);

  const initializeMedia = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Fix for Safari
        localVideoRef.current.play().catch(e => console.error('Error playing local video:', e));
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError(err.name === 'NotAllowedError' ? 'MEDIA_DENIED' : 'CONNECTION_FAILED');
      setIsLoading(false);
    }
  };

  const handleUserConnected = (peerId) => {
    console.log('User connected:', peerId);
    if (peerId !== userId && localStream) {
      createPeerConnection(peerId);
    }
  };

  const handleUserDisconnected = (peerId) => {
    console.log('User disconnected:', peerId);
    
    // Close and remove the peer connection
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
    
    // Remove peer from state
    setPeers(prev => {
      const newPeers = {...prev};
      delete newPeers[peerId];
      return newPeers;
    });
  };

  const createPeerConnection = (peerId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all' // Use 'relay' for NAT traversal in production
    });

    // Add local tracks to peer connection
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetPeer: peerId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state change: ${peerConnection.connectionState}`);
      if (peerConnection.connectionState === 'failed') {
        peerConnection.restartIce();
      }
    };

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setPeers(prev => ({
          ...prev,
          [peerId]: {
            stream: event.streams[0],
            isMuted: false,
            isVideoOff: false
          }
        }));
      }
    };

    // Store the peer connection
    peerConnections.current[peerId] = peerConnection;

    // Create offer
    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', {
          targetPeer: peerId,
          description: peerConnection.localDescription
        });
      })
      .catch(err => console.error('Error creating offer:', err));
  };

  const handleOffer = async (data) => {
    if (data.senderId === userId) return;
    
    try {
      // Create peer connection if it doesn't exist
      if (!peerConnections.current[data.senderId]) {
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceTransportPolicy: 'all' // Use 'relay' for NAT traversal in production
        });

        // Add local tracks
        if (localStream) {
          localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
          });
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              targetPeer: data.senderId,
              candidate: event.candidate
            });
          }
        };

        // Handle remote tracks
        peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setPeers(prev => ({
              ...prev,
              [data.senderId]: {
                stream: event.streams[0],
                isMuted: false,
                isVideoOff: false
              }
            }));
          }
        };

        peerConnections.current[data.senderId] = peerConnection;
      }

      const pc = peerConnections.current[data.senderId];
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(data.description));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer to peer
      socket.emit('answer', {
        targetPeer: data.senderId,
        description: pc.localDescription
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (data) => {
    if (data.senderId === userId) return;
    
    try {
      const pc = peerConnections.current[data.senderId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.description));
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (data) => {
    if (data.senderId === userId) return;
    
    try {
      const pc = peerConnections.current[data.senderId];
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Render error states
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">
            {error === 'MEDIA_DENIED' && '🎥❌'}
            {error === 'CONNECTION_FAILED' && '🔌❌'}
            {error === 'PEER_DISCONNECTED' && '👥❌'}
          </div>
          <h2 className="text-xl font-bold mb-2">
            {error === 'MEDIA_DENIED' && 'Camera/Microphone Access Denied'}
            {error === 'CONNECTION_FAILED' && 'Connection Failed'}
            {error === 'PEER_DISCONNECTED' && 'Peer Disconnected'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error === 'MEDIA_DENIED' && 'Please allow access to your camera and microphone to join the conference.'}
            {error === 'CONNECTION_FAILED' && 'Unable to connect to the conference. Please check your internet connection.'}
            {error === 'PEER_DISCONNECTED' && 'A participant has disconnected unexpectedly.'}
          </p>
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            onClick={initializeMedia}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700">Setting up your media devices...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Video grid */}
      <div className="flex-grow p-2 bg-gray-900 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 auto-rows-fr">
          {/* Local video */}
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'invisible' : ''}`}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-xl text-white">You</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-60 px-2 py-1 rounded text-white text-sm">
              You (Local)
            </div>
          </div>

          {/* Remote videos */}
          {Object.entries(peers).map(([peerId, { stream, isMuted, isVideoOff }]) => (
            <div key={peerId} className="relative rounded-lg overflow-hidden bg-black">
              <video
                autoPlay
                playsInline
                ref={el => {
                  if (el) el.srcObject = stream;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-60 px-2 py-1 rounded text-white text-sm">
                User {peerId.substring(0, 5)}
              </div>
              {isMuted && (
                <div className="absolute top-2 right-2 bg-red-500 p-1 rounded-full">
                  <MicOff size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className="h-16 bg-gray-800 flex items-center justify-center px-4">
        <div className="flex space-x-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {isMuted ? <MicOff className="text-white" /> : <Mic className="text-white" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {isVideoOff ? <VideoOff className="text-white" /> : <Video className="text-white" />}
          </button>
          <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
            <Settings className="text-white" />
          </button>
          <button className="p-3 rounded-full bg-green-600 hover:bg-green-700">
            <PlusCircle className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceView;