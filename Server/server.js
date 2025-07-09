require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const connectDB = require('./config/db');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Socket.IO Logic
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const uid = socket.handshake.query.uid;

  if (uid) {
    onlineUsers.set(uid, socket.id);

    // Mark user as online in DB
    User.findOneAndUpdate({ uid }, { online: true }, { new: true })
      .then(() => {
        io.emit('onlineUsers', [...onlineUsers.keys()]);
      })
      .catch((err) => console.error('Error updating user online status:', err));

    // Private messaging
    socket.on('privateMessage', ({ to, message }) => {
      const recipientSocketId = onlineUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('privateMessage', {
          from: uid,
          message,
          timestamp: new Date(),
        });
      }
    });

    // Broadcast messaging
    socket.on('broadcastMessage', ({ from, username, message }) => {
      socket.broadcast.emit('broadcastMessage', {
        from,
        username,
        message,
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (uid) {
        onlineUsers.delete(uid);
        await User.findOneAndUpdate({ uid }, { online: false });
        io.emit('onlineUsers', [...onlineUsers.keys()]);
      }
    });
  }
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { server, io };