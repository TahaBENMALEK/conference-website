const { start } = require("repl");

// Connect to Socket.IO server
const socket = io('http://localhost:3000');

// ================= MULTI-USER VIDEO =================
let peers = {}; // Tracks all peer connections

// Initialize a new peer connection
function createPeerConnection(peerId) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { 
        urls: 'turn:your-turn-server.com', // Replace with your TURN server
        username: 'user',
        credential: 'password'
      }
    ]
  });

  // Add local stream if available
  if (localVideo.srcObject) {
    localVideo.srcObject.getTracks().forEach(track => {
      pc.addTrack(track, localVideo.srcObject);
    });
  }

  // Handle remote stream
  pc.ontrack = (event) => {
    const remoteVideo = document.createElement('video');
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.id = `remoteVideo-${peerId}`;
    document.body.appendChild(remoteVideo);
  };

  // ICE candidate exchange
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { 
        targetPeer: peerId, 
        candidate: event.candidate 
      });
    }
  };

  return pc;
}

// ================= SIGNALING HANDLERS =================
// When a new user joins
socket.on('user-connected', (peerId) => {
  if (peerId !== socket.id && !peers[peerId]) {
    const pc = createPeerConnection(peerId);
    peers[peerId] = pc;

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', {
          targetPeer: peerId,
          offer: pc.localDescription
        });
      });
  }
});

// When receiving an offer
socket.on('offer', async ({ targetPeer, offer }) => {
  if (!peers[targetPeer]) {
    const pc = createPeerConnection(targetPeer);
    peers[targetPeer] = pc;
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { targetPeer, answer });
  }
});

// When receiving an answer
socket.on('answer', async ({ targetPeer, answer }) => {
  if (peers[targetPeer]) {
    await peers[targetPeer].setRemoteDescription(answer);
  }
});

// ICE candidate handling
socket.on('ice-candidate', async ({ targetPeer, candidate }) => {
  if (peers[targetPeer]) {
    await peers[targetPeer].addIceCandidate(candidate);
  }
});

// Clean up disconnected peers
socket.on('user-disconnected', (peerId) => {
  if (peers[peerId]) {
    peers[peerId].close();
    delete peers[peerId];
    const videoElem = document.getElementById(`remoteVideo-${peerId}`);
    if (videoElem) videoElem.remove();
  }
});

// ================= KEEP EXISTING CHAT CODE =================
// (Your current chat implementation remains unchanged)
socket.on('message', (data) => {
  console.log('Received message:', data);
});

setInterval(() => {
  socket.emit('message', `Hello from ${socket.id}`);
}, 2000);

//Get control buttons
const startBtn = document.getElementById('startBtn');
const muteBtn = document.getElementById('muteBtn');
const hangupBtn = document.getElementById('hangupBtn');
//start call button handler
startBtn.addEventListener('click', ()=>{
  const audioTracks = localVideo.srcObject.getAudioTracks();
  audioTracks.forEach(track => {
    track.enabled = !track.enabled;
    muteBtn.textContent = track.enabled ? 'Mute' : 'Unmute';
  });
})
// Hangup button handler
hangupBtn.addEventListener('click', () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  window.location.reload();
});

// Chat functionality
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');

// Send message
function sendMessage() {
  const message = chatInput.value;
  if (message.trim()) {
    socket.emit('chat-message', {
      sender: socket.id.slice(0, 5), // Short ID
      text: message
    });
    chatInput.value = '';
  }
}

// Receive message
socket.on('chat-message', (data) => {
  const msgElement = document.createElement('div');
  msgElement.innerHTML = `<strong>${data.sender}:</strong> ${data.text}`;
  chatMessages.appendChild(msgElement);
});

// Event listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});