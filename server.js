const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Initialize Express server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
// Replace your static file serving with:
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  

// Socket.IO connection handler 
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Notify others about new user
  socket.broadcast.emit('user-connected', socket.id);
  
  // Relay WebRTC signals with target peer info
  socket.on('offer', (data) => {
    if (data && data.targetPeer) {
      io.to(data.targetPeer).emit('offer', {
        ...data,
        senderId: socket.id
      });
    }
  });
  
  socket.on('answer', (data) => {
    if (data && data.targetPeer) {
      io.to(data.targetPeer).emit('answer', {
        ...data,
        senderId: socket.id
      });
    }
  });
  
  socket.on('ice-candidate', (data) => {
    if (data && data.targetPeer) {
      io.to(data.targetPeer).emit('ice-candidate', {
        ...data,
        senderId: socket.id
      });
    }
  });
  
  // Handle chat messages
  socket.on('chat-message', (data) => {
    io.emit('chat-message', data);
  });
  
  // Handle disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    socket.broadcast.emit('user-disconnected', socket.id);
  });

  // Error handling for invalid events
  socket.on('error', (err) => {
    console.error(`Socket error from ${socket.id}:`, err);
  });
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA fallback - catch-all handler
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});