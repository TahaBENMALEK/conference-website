const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize Express & Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Use path.resolve to go up one directory level from src to find public
const publicPath = path.resolve(__dirname, '..', 'public');

// Serve static files from the public directory
app.use(express.static(publicPath));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Add a specific route for the catch-all that handles all other routes for SPA
app.get('/*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Keep track of users in rooms
const rooms = {};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentRoom = null;
  let currentUsername = null;

  // Join room event
  socket.on('join-room', ({ roomId, username }) => {
    // Setup user info
    currentRoom = roomId;
    currentUsername = username;
    
    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }
    
    // Add user to room
    rooms[roomId][socket.id] = {
      id: socket.id,
      username
    };
    
    // Join the room
    socket.join(roomId);
    
    // Notify others that a new user joined
    socket.to(roomId).emit('user-connected', {
      userId: socket.id,
      username
    });
    
    // Send list of users in the room to the joining user
    socket.emit('room-users', Object.values(rooms[roomId]));
    
    console.log(`${username} joined room ${roomId}`);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.targetId).emit('offer', {
      sdp: data.sdp,
      senderId: socket.id,
      senderUsername: currentUsername
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.targetId).emit('answer', {
      sdp: data.sdp,
      senderId: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.targetId).emit('ice-candidate', {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  // Handle chat messages
  socket.on('chat-message', (message) => {
    if (currentRoom) {
      io.to(currentRoom).emit('chat-message', {
        senderId: socket.id,
        senderName: currentUsername,
        message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle user media state changes (mute/unmute, video on/off)
  socket.on('media-state-change', (data) => {
    if (currentRoom) {
      socket.to(currentRoom).emit('user-media-state-changed', {
        userId: socket.id,
        ...data
      });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (currentRoom && rooms[currentRoom]) {
      // Notify others in the room
      socket.to(currentRoom).emit('user-disconnected', socket.id);
      
      // Remove user from the room
      delete rooms[currentRoom][socket.id];
      
      // Remove room if empty
      if (Object.keys(rooms[currentRoom]).length === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});