// Configuration for WebRTC connections
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

export class WebRTCManager {
  constructor(socket, onRemoteStream, onRemoteStreamRemoved) {
    this.socket = socket;
    this.peerConnections = {}; // Store all peer connections
    this.localStream = null;
    this.onRemoteStream = onRemoteStream;
    this.onRemoteStreamRemoved = onRemoteStreamRemoved;
    this.setupSocketListeners();
  }

  // Set up socket event listeners for WebRTC signaling
  setupSocketListeners() {
    // When a new user connects to the room
    this.socket.on('user-connected', async ({ userId, username }) => {
      console.log(`New user connected: ${username} (${userId})`);
      await this.createPeerConnection(userId, username, true);
    });

    // When receiving an offer from a peer
    this.socket.on('offer', async ({ senderId, senderUsername, sdp }) => {
      console.log(`Received offer from: ${senderUsername || senderId}`);
      const pc = await this.createPeerConnection(senderId, senderUsername, false);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.socket.emit('answer', {
        targetId: senderId,
        sdp: answer
      });
    });

    // When receiving an answer to our offer
    this.socket.on('answer', async ({ senderId, sdp }) => {
      console.log(`Received answer from: ${senderId}`);
      const pc = this.peerConnections[senderId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    // When receiving an ICE candidate from a peer
    this.socket.on('ice-candidate', async ({ senderId, candidate }) => {
      console.log(`Received ICE candidate from: ${senderId}`);
      const pc = this.peerConnections[senderId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
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
  }

  // Initialize media stream and join room
  async init(roomId, username) {
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
      
      // Return whatever stream we have (or null)
      return this.localStream;
      
    } catch (error) {
      console.error('Error during initialization:', error);
      
      // Try to join room anyway as a last resort
      try {
        console.log(`Emergency join attempt for room ${roomId} as ${username}`);
        this.socket.emit('join-room', { roomId, username });
        return null;
      } catch (joinError) {
        console.error('All attempts failed:', joinError);
        throw new Error('JOIN_FAILED');
      }
    }
  }
  
  // Create a new peer connection
  async createPeerConnection(userId, username, isInitiator) {
    try {
      // Create new RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      this.peerConnections[userId] = pc;
      
      // Add local stream tracks to the connection
      if (this.localStream && this.localStream.getTracks().length > 0) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      }
      
      // Handle incoming tracks (remote stream)
      pc.ontrack = (event) => {
        console.log(`Received track from: ${username || userId}`);
        if (event.streams && event.streams[0]) {
          this.onRemoteStream(userId, event.streams[0], username);
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('ice-candidate', {
            targetId: userId,
            candidate: event.candidate
          });
        }
      };
      
      // If we're the initiator, create and send an offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this.socket.emit('offer', {
          targetId: userId,
          sdp: offer
        });
      }
      
      return pc;
    } catch (error) {
      console.error(`Error creating peer connection for ${userId}:`, error);
      throw error;
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = enabled;
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
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close all peer connections
    Object.values(this.peerConnections).forEach(pc => pc.close());
    this.peerConnections = {};
    
    // Remove all socket listeners
    this.socket.off('user-connected');
    this.socket.off('offer');
    this.socket.off('answer');
    this.socket.off('ice-candidate');
    this.socket.off('user-disconnected');
    this.socket.off('room-users');
  }
}