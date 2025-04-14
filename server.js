const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Load SSL certificates
const privateKey = fs.readFileSync('ssl/key.pem', 'utf8');
const certificate = fs.readFileSync('ssl/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Initialize Express server
const app = express();
const server = http.createServer(app);
const httpsServer = https.createServer(credentials, app);
const io = socketIo(server);

// Configuration
const MAX_PARTICIPANTS = 50; // Maximum number of participants per room
const PRODUCTION = process.env.NODE_ENV === 'production';

// Track active rooms and participants
const rooms = new Map(); // Map to track rooms and participants

// Serve static files
if (PRODUCTION) {
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

// Enhanced error logging in global error handler
app.use((err, req, res, next) => {
  console.error('Express error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({
    error: 'Server error',
    message: PRODUCTION ? 'An unexpected error occurred' : err.message
  });
});

// Socket.io connection handling with enhanced error handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentRoom = null;

  // Notify others about new user
  socket.broadcast.emit('user-connected', socket.id);

  // Handle room joining with capacity check
  socket.on('join-room', (roomId) => {
    try {
      // Leave current room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        if (rooms.has(currentRoom)) {
          const roomParticipants = rooms.get(currentRoom);
          roomParticipants.delete(socket.id);
          if (roomParticipants.size === 0) {
            rooms.delete(currentRoom);
          } else {
            rooms.set(currentRoom, roomParticipants);
          }
        }
      }

      // Check room capacity
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set([socket.id]));
      } else {
        const roomParticipants = rooms.get(roomId);
        if (roomParticipants.size >= MAX_PARTICIPANTS) {
          socket.emit('error', { 
            type: 'FULL_CAPACITY', 
            message: 'This room has reached maximum capacity.' 
          });
          return;
        }
        roomParticipants.add(socket.id);
        rooms.set(roomId, roomParticipants);
      }

      // Join new room
      socket.join(roomId);
      currentRoom = roomId;
      
      // Notify room participants
      socket.to(roomId).emit('user-joined', socket.id);
      
      // Send existing participants to the new user
      const participants = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);
      socket.emit('room-users', participants);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { 
        type: 'JOIN_ERROR', 
        message: 'Failed to join the room. Please try again.' 
      });
    }
  });

  // Media ready notification
  socket.on('user-media-ready', () => {
    if (currentRoom) {
      socket.to(currentRoom).emit('user-media-ready', socket.id);
    }
  });

  // Relay WebRTC signals with enhanced error handling
  socket.on('offer', (data) => {
    try {
      if (data && data.targetPeer) {
        io.to(data.targetPeer).emit('offer', {
          ...data,
          senderId: socket.id
        });
      } else {
        console.error('Invalid offer data:', data);
        socket.emit('error', { 
          type: 'INVALID_OFFER', 
          message: 'Offer data is invalid.' 
        });
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      socket.emit('error', { 
        type: 'OFFER_ERROR', 
        message: 'Failed to send offer. Please try again.' 
      });
    }
  });

  socket.on('answer', (data) => {
    try {
      if (data && data.targetPeer) {
        io.to(data.targetPeer).emit('answer', {
          ...data,
          senderId: socket.id
        });
      } else {
        console.error('Invalid answer data:', data);
        socket.emit('error', { 
          type: 'INVALID_ANSWER', 
          message: 'Answer data is invalid.' 
        });
      }
    } catch (error) {
      console.error('Error sending answer:', error);
      socket.emit('error', { 
        type: 'ANSWER_ERROR', 
        message: 'Failed to send answer. Please try again.' 
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    try {
      if (data && data.targetPeer) {
        io.to(data.targetPeer).emit('ice-candidate', {
          ...data,
          senderId: socket.id
        });
      } else {
        console.error('Invalid ICE candidate data:', data);
        socket.emit('error', { 
          type: 'INVALID_ICE_CANDIDATE', 
          message: 'ICE candidate data is invalid.' 
        });
      }
    } catch (error) {
      console.error('Error sending ICE candidate:', error);
      socket.emit('error', { 
        type: 'ICE_ERROR', 
        message: 'Failed to send ICE candidate. Please try again.' 
      });
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    try {
      if (currentRoom) {
        io.to(currentRoom).emit('chat-message', {
          ...data,
          userId: socket.id
        });
      } else {
        // For global chat
        io.emit('chat-message', {
          ...data,
          userId: socket.id
        });
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      socket.emit('error', { 
        type: 'CHAT_ERROR', 
        message: 'Failed to send message. Please try again.' 
      });
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Notify others about user disconnection
    socket.broadcast.emit('user-disconnected', socket.id);
    
    // Remove from room if in one
    if (currentRoom && rooms.has(currentRoom)) {
      const roomParticipants = rooms.get(currentRoom);
      roomParticipants.delete(socket.id);
      
      if (roomParticipants.size === 0) {
        rooms.delete(currentRoom);
      } else {
        rooms.set(currentRoom, roomParticipants);
      }
    }
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
  res.sendFile(path.join(__dirname, PRODUCTION ? 'build' : 'public', 'index.html'));
});

// Start server with graceful shutdown
const PORT = process.env.PORT || 3001;
const httpServer = server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Start HTTPS server
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
httpsServer.listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server running on https://localhost:${HTTPS_PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

function shutDown() {
  console.log('Received kill signal, shutting down gracefully');
  httpServer.close(() => {
    console.log('Closed out remaining connections');
    process.exit(0);
  });

  // Force shutdown after 10s if connections don't close
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}