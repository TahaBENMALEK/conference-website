const express = require('express');
const http = require('http');
const socketIo = require('socket.io'); // Now properly installed
// Initialize Express server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (HTML/CSS/JS)
app.use(express.static('public'));

// Socket.IO connection handler
io.on('connection', (socket) => {
  // Notify others about new user
  socket.broadcast.emit('user-connected', socket.id);

  // Relay WebRTC signals with target peer info
  socket.on('offer', (data) => {
    io.to(data.targetPeer).emit('offer', data);
  });

  socket.on('answer', (data) => {
    io.to(data.targetPeer).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.targetPeer).emit('ice-candidate', data);
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', socket.id);
  });
});

socket.on('chat-message', (data) => {
  // Broadcast to all users
  io.emit('chat-message', data);
})

// Start server on port 3000
server.listen(3000, () => {
  console.log('Signaling server running on http://localhost:3000');
});