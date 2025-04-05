const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (HTML/CSS/JS)
app.use(express.static('public'));

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Relay messages to all other clients
  socket.on('message', (data) => {
    console.log(`Relaying message from ${socket.id}`);
    socket.broadcast.emit('message', data);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

// Start server on port 3000
server.listen(3000, () => {
  console.log('Signaling server running on http://localhost:3000');
});