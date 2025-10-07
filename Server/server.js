require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const connectDB = require("./config/db");
const User = require("./models/User");
const admin = require("./services/firebaseAdmin");
const { log } = require("console");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
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

    // Mark user as online in DB
    User.findOneAndUpdate({ uid }, { online: true }, { new: true })
      .then(() => {
        io.emit("onlineUsers", [...onlineUsers.keys()]);
      })
      .catch((err) => console.error("Error updating user online status:", err));

    // --- Game Room Management ---
    socket.on("join-game", (gameId) => {
      socket.join(gameId);
      console.log(`User ${uid} joined game ${gameId}`);

      // Track game activity
      if (!activeGames.has(gameId)) {
        activeGames.set(gameId, new Set());
      }
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
    socket.on("pass-turn", async (data) => {
      try {
        const { gameId } = data;
        socket.to(gameId).emit("pass-turn", {
          ...data,
          timestamp: Date.now(),
        });
      } catch (error) {
        socket.emit("pass-turn-error", {
          message: error.message,
        });
      }
    });

    socket.on("dice-rolled", async (data) => {
      try {
        const { gameId } = data;
        socket.to(gameId).emit("dice-rolled", {
          ...data,
          timestamp: Date.now(),
        });
      } catch (error) {
        socket.emit("dice-rolled-error", {
          message: error.message,
        });
      }
    });

    socket.on("pawn-move", async (data) => {
      try {
        const {
          gameId,
          pawnId,
          newPosition,
          isWin,
          captureCount,
          victimPlayer,
        } = data;

        // Validate the move
        const gameRef = admin.firestore().doc(`games/${gameId}`);
        const gameDoc = await gameRef.get();

        if (!gameDoc.exists) throw new Error("Game not found");
        if (gameDoc.data().status !== "playing")
          throw new Error("Game not in progress");
        if (gameDoc.data().currentTurn !== uid)
          throw new Error("Not your turn");

        // Broadcast to all players in the game except sender
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

        // Optional: Update Firebase here if you want server to be authoritative
      } catch (error) {
        socket.emit("move-error", {
          message: error.message,
          pawnId: data.pawnId,
        });
      }
    });

    socket.on("pawn-dragging", (data) => {
      const { gameId, pawnId, newPosition } = data;

      // Broadcast to everyone in the same game room except sender
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
    // Handle hand movement with state
    socket.on("hand-move", ({ gameId, playerId, position, state }) => {
      if (!gameId || !playerId || !position) return;
      console.log("gdddddddddddddddddddddd");
      

      socket.to(gameId).emit("hand-move", {
        playerId,
        position,
        state: state,
      });
    });

    socket.on("chat-message", async (data) => {
      try {
        const { gameId, senderId, senderName, text } = data;

        // Save to Firestore so it's persistent
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

        // Broadcast to everyone in the same game room instantly
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

    // Handle disconnection
    socket.on("disconnect", async () => {
      if (uid) {
        onlineUsers.delete(uid);
        await User.findOneAndUpdate({ uid }, { online: false });
        io.emit("onlineUsers", [...onlineUsers.keys()]);

        // Clean up game rooms
        activeGames.forEach((players, gameId) => {
          if (players.has(uid)) {
            players.delete(uid);
            if (players.size === 0) {
              activeGames.delete(gameId);
            } else {
              // Notify remaining players about the disconnect
              io.to(gameId).emit("player-disconnected", { playerId: uid });
            }
          }
        });
      }
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
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { server, io };
