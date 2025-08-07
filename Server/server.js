require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const connectDB = require('./config/db');
const User = require('./models/User');
const admin = require('./services/firebaseAdmin')



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

// Game state tracking
const activeGames = new Map(); // Tracks active game rooms

// Socket.IO Logic
const onlineUsers = new Map();

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.userId = decodedToken.uid;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const uid = socket.userId;
  console.log(`User connected: ${uid}`);

  if (uid) {
    onlineUsers.set(uid, socket.id);

    // Mark user as online in DB
    User.findOneAndUpdate({ uid }, { online: true }, { new: true })
      .then(() => {
        io.emit('onlineUsers', [...onlineUsers.keys()]);
      })
      .catch((err) => console.error('Error updating user online status:', err));

    // --- Game Room Management ---
    socket.on('join-game', (gameId) => {
      socket.join(gameId);
      console.log(`User ${uid} joined game ${gameId}`);

      // Track game activity
      if (!activeGames.has(gameId)) {
        activeGames.set(gameId, new Set());
      }
      activeGames.get(gameId).add(uid);
    });

    socket.on('leave-game', (gameId) => {
      socket.leave(gameId);
      if (activeGames.has(gameId)) {
        activeGames.get(gameId).delete(uid);
        if (activeGames.get(gameId).size === 0) {
          activeGames.delete(gameId);
        }
      }
      console.log(`User ${uid} left game ${gameId}`);
    });

    // --- Game Events ---
    socket.on('pawn-move', async (data) => {
      try {
        const { gameId, pawnId, newPosition } = data;
        
        // Validate the move
        const gameRef = admin.firestore().doc(`games/${gameId}`);
        const gameDoc = await gameRef.get();
        
        if (!gameDoc.exists) throw new Error('Game not found');
        if (gameDoc.data().status !== 'playing') throw new Error('Game not in progress');
        if (gameDoc.data().currentTurn !== uid) throw new Error('Not your turn');

        // Broadcast to all players in the game except sender
        socket.to(gameId).emit('pawn-move', {
          gameId,
          playerId: uid,
          pawnId,
          newPosition,
          timestamp: Date.now()
        });

        // Optional: Update Firebase here if you want server to be authoritative
      } catch (error) {
        console.error('Move validation failed:', error);
        socket.emit('move-error', {
          message: error.message,
          pawnId: data.pawnId
        });
      }
    });

    socket.on('dice-roll', async (data) => {
      try {
        const { gameId, value } = data;
        
        // Validate the dice roll
        const gameRef = admin.firestore().doc(`games/${gameId}`);
        const gameDoc = await gameRef.get();
        
        if (!gameDoc.exists) throw new Error('Game not found');
        if (gameDoc.data().status !== 'playing') throw new Error('Game not in progress');
        if (gameDoc.data().currentTurn !== uid) throw new Error('Not your turn');

        // Broadcast to all players
        io.to(gameId).emit('dice-rolled', {
          gameId,
          playerId: uid,
          value,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Dice roll failed:', error);
        socket.emit('dice-error', {
          message: error.message
        });
      }
    });

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

        // Clean up game rooms
        activeGames.forEach((players, gameId) => {
          if (players.has(uid)) {
            players.delete(uid);
            if (players.size === 0) {
              activeGames.delete(gameId);
            } else {
              // Notify remaining players about the disconnect
              io.to(gameId).emit('player-disconnected', { playerId: uid });
            }
          }
        });
      }
      console.log(`User disconnected: ${uid}`);
    });
  }
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Game status endpoint
app.get('/api/games/active', (req, res) => {
  res.json({
    activeGames: Array.from(activeGames.keys()),
    onlinePlayers: onlineUsers.size
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { server, io };