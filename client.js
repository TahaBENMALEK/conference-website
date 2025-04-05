// Connect to Socket.IO server
const socket = io('http://localhost:3000');

// Log incoming messages
socket.on('message', (data) => {
  console.log('Received message:', data);
});

// Send test message every 2 seconds
setInterval(() => {
  const message = `Hello from ${socket.id} at ${new Date().toLocaleTimeString()}`;
  socket.emit('message', message);
}, 2000);