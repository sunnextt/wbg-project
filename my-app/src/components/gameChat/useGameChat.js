import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useSocket } from "@/lib/socket";

export default function useGameChat(gameId, gameStatus) {
  const { user } = useAuth();
  const {socket} = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  // Only set up chat listener if game is playing
  useEffect(() => {
    if (!gameId || gameStatus !== 'playing') {
      setMessages([]); 
      return;
    }
    
    const q = query(
      collection(db, "games", gameId, "chat"),
      orderBy("timestamp", "asc")
    );
    
    const unsub = onSnapshot(
      q, 
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({ 
          ...doc.data() 
        }));
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        setError("Failed to load messages");
        console.error("Chat subscription error:", err);
      }
    );
    
    return () => unsub();
  }, [gameId, gameStatus]);

  // Send message - only works if game is playing
  const sendMessage = useCallback(
    async (text) => {
      if (!user || !text.trim()) {
        return;
      }

      if (gameStatus !== 'playing') {
        setError("Game hasn't started yet");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const message = {
          senderId: user.uid,
          senderName: user.displayName || "Player",
          text: text.trim(),
          timestamp: serverTimestamp(),
        };

        // Emit via socket
        if (socket) {
          socket.emit("chat-message", { gameId, ...message });
        }

      } catch (err) {
        setError("Failed to send message");
        console.error("Error sending message:", err);
      } finally {
        setLoading(false);
      }
    },
    [user, socket, gameId, gameStatus]
  );

  // Socket listener - only active when game is playing
  useEffect(() => {
    if (!socket || !gameId || gameStatus !== 'playing') return;

    const handleIncomingMessage = (msg) => {
      if (msg.gameId === gameId) {
        setMessages((prev) => {
          if (!prev.some(m => m.id === msg.id)) {
            return [...prev, msg];
          }
          return prev;
        });
      }
    };

    socket.on("chat-message", handleIncomingMessage);
    return () => {
      socket.off("chat-message", handleIncomingMessage);
    };
  }, [socket, gameId, gameStatus]);


  return { messages, sendMessage, loading, error, gameStatus };
}