// Configuration for WebRTC connections
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Add TURN servers to improve connection reliability
  {
    urls: 'turn:turn.relay.metered.ca:80',
    username: 'free',
    credential: 'free'
  },
  {
    urls: 'turn:turn.relay.metered.ca:443',
    username: 'free',
    credential: 'free'
  }
];

export class WebRTCManager {
  constructor(socket, onRemoteStream, onRemoteStreamRemoved) {
    this.socket = socket;
    this.peerConnections = {}; // Store all peer connections
    this.localStream = null;
    this.onRemoteStream = onRemoteStream;
    this.onRemoteStreamRemoved = onRemoteStreamRemoved;
    this.roomId = null;
    this.username = null;
    this.setupSocketListeners();
    
    // Add connection status monitoring with more tolerance
    this.connectionStatus = 'connected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Set up socket event listeners for WebRTC signaling
  setupSocketListeners() {
    // When a new user connects to the room
    this.socket.on('user-connected', async ({ userId, username }) => {
      console.log(`New user connected: ${username} (${userId})`);
      // Only create connection if it's not ourselves
      if (userId !== this.socket.id) {
        await this.createPeerConnection(userId, username, true);
      }
      // Signal that we have active connections
      this.connectionStatus = 'connected';
    });

    // When receiving an offer from a peer
    this.socket.on('offer', async ({ senderId, senderUsername, sdp }) => {
      console.log(`Received offer from: ${senderUsername || senderId}`);
      // Check if we already have this connection
      if (!this.peerConnections[senderId]) {
        const pc = await this.createPeerConnection(senderId, senderUsername, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          
          // Create and send answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          this.socket.emit('answer', {
            targetId: senderId,
            sdp: answer
          });
          
          // Signal that we have active connections
          this.connectionStatus = 'connected';
        } catch (error) {
          console.error(`Error setting remote description from offer:`, error);
        }
      } else {
        console.log(`Already have connection to ${senderId}, updating remote description`);
        try {
          await this.peerConnections[senderId].setRemoteDescription(new RTCSessionDescription(sdp));
          this.connectionStatus = 'connected';
        } catch (error) {
          console.error(`Error updating remote description:`, error);
        }
      }
    });

    // When receiving an answer to our offer
    this.socket.on('answer', async ({ senderId, sdp }) => {
      console.log(`Received answer from: ${senderId}`);
      const pc = this.peerConnections[senderId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log(`Set remote description successfully for ${senderId}`);
          this.connectionStatus = 'connected';
        } catch (error) {
          console.error(`Error setting remote description from answer:`, error);
        }
      } else {
        console.warn(`Received answer but no peer connection for ${senderId}`);
      }
    });

    // When receiving an ICE candidate from a peer
    this.socket.on('ice-candidate', async ({ senderId, candidate }) => {
      console.log(`Received ICE candidate from: ${senderId}`);
      const pc = this.peerConnections[senderId];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error(`Error adding ice candidate:`, error);
        }
      } else {
        console.warn(`Received ICE candidate but no peer connection for ${senderId}`);
      }
    });

    // When a user disconnects
    this.socket.on('user-disconnected', (userId) => {
      console.log(`User disconnected: ${userId}`);
      if (this.peerConnections[userId]) {
        this.peerConnections[userId].close();
        delete this.peerConnections[userId];
        this.onRemoteStreamRemoved(userId);
      }
    });
    
    // Add handlers for socket connection events for better monitoring
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
    });
    
    this.socket.on('connect_error', (error) => {
      console.log('Connection error, but not setting disconnected:', error);
      // Don't immediately set disconnected - be more tolerant
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.connectionStatus = 'disconnected';
      } else {
        this.reconnectAttempts++;
      }
    });
    
    // Socket reconnection confirmation
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      
      // Rejoin room automatically
      if (this.roomId && this.username) {
        this.socket.emit('join-room', { roomId: this.roomId, username: this.username });
      }
    });
  }

  // Get current connection status - new method to expose status
  getConnectionStatus() {
    return this.connectionStatus;
  }

  // Initialize media stream and join room
  async init(roomId, username) {
    this.roomId = roomId;
    this.username = username;
    let mediaAccessGranted = false;
    
    try {
      // Try to get media access with multiple approaches
      try {
        console.log("Requesting camera and microphone access...");
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        mediaAccessGranted = true;
        console.log("Access granted to camera and microphone");
      } catch (fullError) {
        console.warn('Full media access denied, trying audio-only', fullError);
        
        try {
          // Try audio-only
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          mediaAccessGranted = true;
          console.log("Access granted to microphone only");
        } catch (audioError) {
          console.warn('Audio access denied too, joining without media', audioError);
          // Continue without media - don't throw error
        }
      }
      
      // Join room regardless of media access
      console.log(`Joining room ${roomId} as ${username}, media: ${mediaAccessGranted ? "available" : "none"}`);
      this.socket.emit('join-room', { roomId, username });
      
      // Set connection status to connected
      this.connectionStatus = 'connected';
      
      // Request existing users to establish connections
      setTimeout(() => {
        this.socket.emit('get-room-users', { roomId });
      }, 1000);
      
      // Return whatever stream we have (or null)
      return this.localStream;
      
    } catch (error) {
      console.error('Error during initialization:', error);
      
      // Try to join room anyway as a last resort
      try {
        console.log(`Emergency join attempt for room ${roomId} as ${username}`);
        this.socket.emit('join-room', { roomId, username });
        this.connectionStatus = 'connected'; // Assume connected unless proven otherwise
        return null;
      } catch (joinError) {
        console.error('All attempts failed:', joinError);
        this.connectionStatus = 'disconnected';
        throw new Error('JOIN_FAILED');
      }
    }
  }
  
  // Create a new peer connection
  async createPeerConnection(userId, username, isInitiator) {
    try {
      // Skip creating connection with ourselves
      if (userId === this.socket.id) {
        console.log(`Skipping self-connection for ${userId}`);
        return null;
      }
      
      // If connection already exists, return it
      if (this.peerConnections[userId]) {
        console.log(`Reusing existing connection for ${userId}`);
        return this.peerConnections[userId];
      }
      
      console.log(`Creating new peer connection for ${username || userId} (initiator: ${isInitiator})`);
      
      // Create new RTCPeerConnection with more conservative config
      const pc = new RTCPeerConnection({ 
        iceServers,
        iceTransportPolicy: 'all', // Try all transports
        iceCandidatePoolSize: 10,  // Increase candidate pool
        bundlePolicy: 'max-bundle' // Reduce connection overhead
      });
      this.peerConnections[userId] = pc;
      
      // Add local stream tracks to the connection
      if (this.localStream && this.localStream.getTracks().length > 0) {
        this.localStream.getTracks().forEach(track => {
          console.log(`Adding local track to peer connection for ${userId}: ${track.kind}`);
          pc.addTrack(track, this.localStream);
        });
      } else {
        console.warn(`No local stream available to add tracks for ${userId}`);
      }
      
      // Handle incoming tracks (remote stream)
      pc.ontrack = (event) => {
        console.log(`Received ${event.track.kind} track from: ${username || userId}`);
        if (event.streams && event.streams[0]) {
          this.onRemoteStream(userId, event.streams[0], username);
        } else {
          console.warn(`Received track but no stream from ${userId}`);
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate to ${userId}`);
          this.socket.emit('ice-candidate', {
            targetId: userId,
            candidate: event.candidate
          });
        }
      };

      // Debug ICE connection state changes with more tolerance
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for ${userId}: ${pc.iceConnectionState}`);
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          this.connectionStatus = 'connected';
        } 
        else if (pc.iceConnectionState === 'failed') {
          console.log(`ICE connection failed, attempting reconnection for ${userId}`);
          // Don't immediately set disconnected - more tolerance
          setTimeout(() => {
            if (pc.iceConnectionState === 'failed') {
              // Only attempt recovery for failed connections after delay
              if (isInitiator) {
                this.restartIce(userId);
              }
            }
          }, 5000);
        }
        // Disconnected state is more temporary than failed - be more tolerant
        else if (pc.iceConnectionState === 'disconnected') {
          console.log(`ICE connection temporarily disconnected for ${userId}`);
          // Don't change overall connection status for temporary disconnections
        }
      };
      
      // If we're the initiator, create and send an offer
      if (isInitiator) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            iceRestart: false
          });
          await pc.setLocalDescription(offer);
          
          console.log(`Sending offer to ${userId}`);
          this.socket.emit('offer', {
            targetId: userId,
            sdp: offer
          });
        } catch (error) {
          console.error(`Error creating/sending offer for ${userId}:`, error);
        }
      }
      
      return pc;
    } catch (error) {
      console.error(`Error creating peer connection for ${userId}:`, error);
      throw error;
    }
  }

  // Restart ICE connection for a failed peer
  async restartIce(userId) {
    const pc = this.peerConnections[userId];
    if (pc) {
      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        
        this.socket.emit('offer', {
          targetId: userId,
          sdp: offer
        });
        
        console.log(`ICE restart offer sent to ${userId}`);
      } catch (error) {
        console.error(`Error restarting ICE for ${userId}:`, error);
      }
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = enabled;
          console.log(`Audio track ${track.id} enabled: ${enabled}`);
        });
        
        // Notify others about state change
        this.socket.emit('media-state-change', {
          audio: enabled
        });
        
        return enabled;
      }
    }
    return false;
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = enabled;
          console.log(`Video track ${track.id} enabled: ${enabled}`);
        });
        
        // Notify others about state change
        this.socket.emit('media-state-change', {
          video: enabled
        });
        
        return enabled;
      }
    }
    return false;
  }

  // Clean up all connections and streams
  disconnect() {
    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped local track: ${track.kind}`);
      });
      this.localStream = null;
    }
    
    // Close all peer connections
    Object.keys(this.peerConnections).forEach(userId => {
      try {
        this.peerConnections[userId].close();
        console.log(`Closed peer connection to ${userId}`);
      } catch (e) {
        console.error(`Error closing connection to ${userId}:`, e);
      }
    });
    this.peerConnections = {};
    
    // Remove all socket listeners
    this.socket.off('user-connected');
    this.socket.off('offer');
    this.socket.off('answer');
    this.socket.off('ice-candidate');
    this.socket.off('user-disconnected');
    this.socket.off('room-users');
    this.socket.off('connect');
    this.socket.off('connect_error');
    this.socket.off('reconnect');
    
    console.log('WebRTCManager: Disconnected and cleaned up');
  }
}