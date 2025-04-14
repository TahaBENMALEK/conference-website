import React, { useEffect, useState, useRef, useCallback } from 'react';
import ErrorPage from './ErrorPage';

function ConferenceView({ socket, userId, mediaPermissionState, onCheckPermissions }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  // Initialize media and WebRTC connection
  const initializeMedia = useCallback(async () => {
    if (isInitializing) return;
    
    try {
      setIsInitializing(true);
      setError(null);
      
      // Get local media stream - this will trigger permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Check permissions again after successful stream acquisition
      if (onCheckPermissions) {
        onCheckPermissions();
      }

      // Initialize peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Add local tracks to connection
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            targetPeer: socket.id === 'user1' ? 'user2' : 'user1', // Simplified for 2 users
            candidate: event.candidate
          });
        }
      };

      // Listen for signaling events
      setupSocketListeners();
      setIsInitializing(false);
    } catch (err) {
      console.error('Error initializing media:', err);
      setError('Failed to access camera/microphone. Please check permissions and try again.');
      setIsInitializing(false);
    }
  }, [socket, onCheckPermissions, isInitializing]);

  // Setup socket listeners for WebRTC signaling
  const setupSocketListeners = useCallback(() => {
    if (!socket || !peerConnection.current) return;

    // For the initiating user (user1)
    socket.on('user-connected', async (id) => {
      if (id !== userId) {
        try {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          
          socket.emit('offer', {
            targetPeer: id,
            sdp: peerConnection.current.localDescription
          });
        } catch (err) {
          console.error('Error creating offer:', err);
          setError('Error initiating call');
        }
      }
    });

    // For the receiving user (user2)
    socket.on('offer', async (data) => {
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.sdp)
        );
        
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        socket.emit('answer', {
          targetPeer: data.senderId,
          sdp: peerConnection.current.localDescription
        });
      } catch (err) {
        console.error('Error handling offer:', err);
        setError('Error accepting call');
      }
    });

    socket.on('answer', async (data) => {
      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.sdp)
        );
      } catch (err) {
        console.error('Error handling answer:', err);
        setError('Error completing call');
      }
    });

    socket.on('ice-candidate', async (data) => {
      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });
  }, [socket, userId]);

  // Initialize on component load if permission already granted
  useEffect(() => {
    if (mediaPermissionState.granted) {
      initializeMedia();
    }
  }, [mediaPermissionState.granted, initializeMedia]);

  // Update remote video when stream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [localStream]);

  // Show error state with retry button
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => initializeMedia()}
          disabled={isInitializing}
        >
          {isInitializing ? 'Requesting Permissions...' : 'Request Camera/Microphone Permission'}
        </button>
      </div>
    );
  }

  // Show permission request UI if not granted
  if (!mediaPermissionState.granted && !localStream) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded mb-4">
          <p>Camera and microphone access is required for video conferencing</p>
        </div>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => initializeMedia()}
          disabled={isInitializing}
        >
          {isInitializing ? 'Requesting Permissions...' : 'Grant Camera/Microphone Access'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">
        Video Conference (2 Users)
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local video */}
        <div className="border rounded-lg shadow-sm p-4 bg-white">
          <h2 className="text-lg font-semibold text-gray-700 text-center mb-2">
            Your Video
          </h2>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        {/* Remote video */}
        <div className="border rounded-lg shadow-sm p-4 bg-white">
          <h2 className="text-lg font-semibold text-gray-700 text-center mb-2">
            Remote Video
          </h2>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Waiting for other participants...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConferenceView;