import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useSocket } from "@/lib/socket";

export default function useGameChat(gameId) {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);

  // 🔹 Listen for chat updates in Firestore
  useEffect(() => {
    if (!gameId) return;
    const q = query(
      collection(db, "games", gameId, "chat"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsub();
  }, [gameId]);

  // 🔹 Send message
  const sendMessage = useCallback(
    async (text) => {
      if (!user || !text.trim()) return;

      const message = {
        senderId: user.uid,
        senderName: user.displayName || "Player",
        text,
        timestamp: serverTimestamp(),
      };

      // Save to Firestore
      await addDoc(collection(db, "games", gameId, "chat"), message);

      // Emit socket event (instant UI for other players)
      socket.emit("chat-message", { gameId, ...message });
    },
    [user, socket, gameId]
  );

  // 🔹 Listen for socket chat
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (msg) => {
      if (msg.gameId === gameId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("chat-message", handleIncomingMessage);
    return () => {
      socket.off("chat-message", handleIncomingMessage);
    };
  }, [socket, gameId]);

  return { messages, sendMessage };
}
