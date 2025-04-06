// Connect to Socket.IO server
const socket = io('http://localhost:3000');
let peerConnection;

//initialize WebRTC connection and start the call
async function startCall() {
  const stream =localVideo.srcObject;
  
  //Create peer connection with STUN server
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302'}]
  });
  //add localstream tracks to connectipn
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });
  //handle incoming remote stream
  peerConnection.ontrack = (event) =>{
    document.getElementById('remoteVideo').secObject=event.streams[0];
  };

  // Exchange ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate);
    }
  };

  // Create and send offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer);
}

// Signaling handlers
socket.on('offer', async (offer) => {
  if (!peerConnection) startCall();
  await peerConnection.setRemoteDescription(offer);
  
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on('ice-candidate', async (candidate) => {
  await peerConnection.addIceCandidate(candidate);
});

// Log incoming messages
socket.on('message', (data) => {
  console.log('Received message:', data);
});

// Send test message every 2 seconds
setInterval(() => {
  const message = `Hello from ${socket.id} at ${new Date().toLocaleTimeString()}`;
  socket.emit('message', message);
}, 2000);