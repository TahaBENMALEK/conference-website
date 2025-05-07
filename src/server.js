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
  },
  pingTimeout: 30000, // Increased ping timeout for more reliable connections with unstable WiFi
  pingInterval: 10000, // Check connection less frequently to reduce overhead
  connectTimeout: 45000, // More time to establish connection
  reconnectionAttempts: 10, // Try more reconnection attempts
  reconnectionDelay: 1000, // Start with shorter delays
  reconnectionDelayMax: 10000, // Max delay between reconnection attempts
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
  
  // Handle ping for connection health check - respond immediately
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle explicit requests for room users
  socket.on('get-room-users', ({ roomId }) => {
    if (rooms[roomId]) {
      console.log(`Sending room users for ${roomId} to ${socket.id}`);
      
      // Send to the requesting socket
      socket.emit('room-users', Object.values(rooms[roomId]));
      
      // Also broadcast to everyone in the room to ensure all are in sync
      socket.to(roomId).emit('room-users', Object.values(rooms[roomId]));
    } else {
      console.log(`Room ${roomId} not found when requested by ${socket.id}`);
      socket.emit('room-users', []);
    }
  });

  // Join room event
  socket.on('join-room', ({ roomId, username }) => {
    // If already in a room, leave it first
    if (currentRoom) {
      leaveCurrentRoom();
    }
    
    // Setup user info
    currentRoom = roomId;
    currentUsername = username;
    
    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {};
      console.log(`New room created: ${roomId}`);
    }
    
    // Add user to room
    rooms[roomId][socket.id] = {
      id: socket.id,
      username,
      isConnected: true
    };
    
    // Join the room
    socket.join(roomId);
    
    // Debug log
    console.log(`${username} (${socket.id}) joined room ${roomId}, total users: ${Object.keys(rooms[roomId]).length}`);
    console.log(`Users in room ${roomId}:`, Object.values(rooms[roomId]));
    
    // Notify others that a new user joined
    socket.to(roomId).emit('user-connected', {
      userId: socket.id,
      username
    });
    
    // Send list of users in the room to the joining user
    socket.emit('room-users', Object.values(rooms[roomId]));
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    console.log(`Relaying offer from ${socket.id} to ${data.targetId}`);
    socket.to(data.targetId).emit('offer', {
      sdp: data.sdp,
      senderId: socket.id,
      senderUsername: currentUsername
    });
  });

  socket.on('answer', (data) => {
    console.log(`Relaying answer from ${socket.id} to ${data.targetId}`);
    socket.to(data.targetId).emit('answer', {
      sdp: data.sdp,
      senderId: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    console.log(`Relaying ICE candidate from ${socket.id} to ${data.targetId}`);
    socket.to(data.targetId).emit('ice-candidate', {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  // Handle chat messages
  socket.on('chat-message', (message) => {
    if (currentRoom) {
      console.log(`Chat message from ${currentUsername} (${socket.id}) in room ${currentRoom}: ${message.substring(0, 20)}...`);
      
      // Création d'un objet message complet
      const messageObject = {
        senderId: socket.id,
        senderName: currentUsername,
        message: message,
        timestamp: new Date().toISOString()
      };
      
      // Envoi à tous les utilisateurs dans la salle
      io.to(currentRoom).emit('chat-message', messageObject);
    }
  });

  // Handle user media state changes (mute/unmute, video on/off)
  socket.on('media-state-change', (data) => {
    if (currentRoom) {
      console.log(`Media state change from ${socket.id} in room ${currentRoom}:`, data);
      socket.to(currentRoom).emit('user-media-state-changed', {
        userId: socket.id,
        ...data
      });
    }
  });

  // Function to handle leaving the current room
  const leaveCurrentRoom = () => {
    if (currentRoom && rooms[currentRoom]) {
      console.log(`${currentUsername} (${socket.id}) leaving room ${currentRoom}`);
      
      // Notify others in the room
      socket.to(currentRoom).emit('user-disconnected', socket.id);
      
      // Remove user from the room
      delete rooms[currentRoom][socket.id];
      socket.leave(currentRoom);
      
      // Remove room if empty
      if (Object.keys(rooms[currentRoom]).length === 0) {
        console.log(`Room ${currentRoom} is now empty, removing it`);
        delete rooms[currentRoom];
      } else {
        // Update room users list for remaining participants
        console.log(`Updating room users for ${currentRoom} after departure`);
        io.to(currentRoom).emit('room-users', Object.values(rooms[currentRoom]));
      }
      
      // Clear user's room info
      currentRoom = null;
    }
  };

  // Explicit leave room event
  socket.on('leave-room', () => {
    leaveCurrentRoom();
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    leaveCurrentRoom();
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});