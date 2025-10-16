require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const connectDB = require("./config/db");
const User = require("./models/User");
const admin = require("./services/firebaseAdmin");

// Initialize app & server
const app = express();
const server = http.createServer(app);

// CORS Configuration - Simplified for Heroku
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000"];

// Basic CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Increase payload size limit
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

console.log("Attempting to connect to MongoDB...");
connectDB().catch(error => {
  console.error("MongoDB connection failed:", error);
  process.exit(1);
});

// Socket.IO setup
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
  // Heroku-specific settings
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});


// --- Game & user state tracking ---
const activeGames = new Map();
const onlineUsers = new Map();

// --- Socket authentication middleware ---
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.userId = decodedToken.uid;
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  const uid = socket.userId;

  if (uid) {
    onlineUsers.set(uid, socket.id);

    // Mark user online
    User.findOneAndUpdate({ uid }, { online: true }, { new: true })
      .then(() => {
        io.emit("onlineUsers", [...onlineUsers.keys()]);
      })
      .catch((err) => console.error("Error updating user online status:", err));

    // --- Game Room Management ---
    socket.on("join-game", (gameId) => {
      socket.join(gameId);
      console.log(`User ${uid} joined game ${gameId}`);

      if (!activeGames.has(gameId)) activeGames.set(gameId, new Set());
      activeGames.get(gameId).add(uid);
    });

    socket.on("leave-game", (gameId) => {
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
    socket.on("pass-turn", (data) => {
      const { gameId } = data;
      socket.to(gameId).emit("pass-turn", { ...data, timestamp: Date.now() });
    });

    socket.on("dice-rolled", (data) => {
      const { gameId } = data;
      socket.to(gameId).emit("dice-rolled", { ...data, timestamp: Date.now() });
    });

    socket.on("game-notification", (data) => {
      const { gameId } = data;
      socket.to(gameId).emit("game-notification", { 
        ...data, 
        timestamp: Date.now() 
      });
    });

    socket.on("pawn-move", async (data) => {
      try {
        const { gameId, pawnId, newPosition, isWin, captureCount, victimPlayer } = data;

        const gameRef = admin.firestore().doc(`games/${gameId}`);
        const gameDoc = await gameRef.get();

        if (!gameDoc.exists) throw new Error("Game not found");
        if (gameDoc.data().status !== "playing") throw new Error("Game not in progress");
        if (gameDoc.data().currentTurn !== uid) throw new Error("Not your turn");

        socket.to(gameId).emit("pawn-move", {
          gameId,
          playerId: uid,
          pawnId,
          newPosition,
          timestamp: Date.now(),
          isWin,
          captureCount,
          victimPlayer,
        });
      } catch (error) {
        socket.emit("move-error", { message: error.message, pawnId: data.pawnId });
      }
    });

    socket.on("pawn-dragging", (data) => {
      const { gameId, pawnId, newPosition } = data;
      socket.to(gameId).emit("pawn-dragging", {
        gameId,
        playerId: uid,
        pawnId,
        newPosition,
        timestamp: Date.now(),
      });
    });

    socket.on("pawn-animation-start", (data) => {
      socket.to(data.gameId).emit("pawn-animation-start", data);
    });

    socket.on("pawn-animating", (data) => {
      socket.to(data.gameId).emit("pawn-animating", data);
    });

    socket.on("pawn-animation-end", (data) => {
      socket.to(data.gameId).emit("pawn-animation-end", data);
    });

    socket.on("hand-move", ({ gameId, playerId, position, state }) => {
      if (!gameId || !playerId || !position) return;
      socket.to(gameId).emit("hand-move", { playerId, position, state });
    });

    socket.on("chat-message", async (data) => {
      try {
        const { gameId, senderId, senderName, text } = data;

        const chatRef = admin
          .firestore()
          .collection("games")
          .doc(gameId)
          .collection("chat");
        await chatRef.add({
          senderId,
          senderName,
          text,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        io.to(gameId).emit("chat-message", {
          gameId,
          senderId,
          senderName,
          text,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Chat error:", error);
        socket.emit("chat-error", { message: error.message });
      }
    });

    socket.on("privateMessage", ({ to, message }) => {
      const recipientSocketId = onlineUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("privateMessage", {
          from: uid,
          message,
          timestamp: new Date(),
        });
      }
    });

    socket.on("broadcastMessage", ({ from, username, message }) => {
      socket.broadcast.emit("broadcastMessage", {
        from,
        username,
        message,
        timestamp: new Date(),
      });
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(uid);
      await User.findOneAndUpdate({ uid }, { online: false });
      io.emit("onlineUsers", [...onlineUsers.keys()]);

      activeGames.forEach((players, gameId) => {
        if (players.has(uid)) {
          players.delete(uid);
          if (players.size === 0) {
            activeGames.delete(gameId);
          } else {
            io.to(gameId).emit("player-disconnected", { playerId: uid });
          }
        }
      });

      console.log(`User disconnected: ${uid}`);
    });
  }
});


// Routes
app.use("/api/users", require("./routes/userRoutes"));

// Game status endpoint
app.get("/api/games/active", (req, res) => {
  res.json({
    activeGames: Array.from(activeGames.keys()),
    onlinePlayers: onlineUsers.size,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

module.exports = { server, io };
