// components/LudoGameManager.jsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { doc, getDoc, onSnapshot, updateDoc, runTransaction, serverTimestamp,deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useSocket } from '@/lib/socket'
import { TEST_STATES, loadTestState, validateGameState } from '@/utils/testUtils';


import { 
  isValidMove,
  calculateNewPosition,
  checkCaptures,
  checkWinCondition,
  getNextPlayerId,
  areAllPawnsAtHome,
  isSafeSquare
} from '../utils/ludoUtils'

export default function useLudoGameManager(gameId) {
  const { user } = useAuth()
  const socket = useSocket()
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const [gameStatus, setGameStatus] = useState('loading') 
  const [currentTurn, setCurrentTurn] = useState(null)
  const [error, setError] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)
  const [lastMoveTimestamp, setLastMoveTimestamp] = useState(0)

  const [testMode, setTestMode] = useState(false);


  const currentPlayerId = user?.uid || null

  // Real-time game state listener
  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided')
      setGameStatus('error')
      return
    }

    const gameRef = doc(db, 'games', gameId)
    const unsubscribe = onSnapshot(
      gameRef,
      (doc) => {
        if (!doc.exists()) {
          setError('Game not found')
          setGameStatus('error')
          return
        }

        const data = doc.data()
        setGameState(data)
        setPlayers(data.players || [])
        setGameStatus(data.status || 'waiting')
        setCurrentTurn(data.currentTurn || null)
        setError(null)
      },
      (err) => {
        // console.error('Game snapshot error:', err)
        setError('Failed to load game')
        setGameStatus('error')
      }
    )

    return () => unsubscribe()
  }, [gameId])

const passTurn = useCallback(async () => {
  try {
    const gameRef = doc(db, 'games', gameId)
    const gameDoc = await getDoc(gameRef)
    
    if (!gameDoc.exists()) throw new Error("Game document doesn't exist")
    
    const gameData = gameDoc.data()
    const updatedPlayers = gameData.players || []
    
    await updateDoc(gameRef, {
      currentTurn: getNextPlayerId(updatedPlayers, user.uid),
      diceValue: 0,
    })
    
    // toast.info("Turn passed to next player")
  } catch (error) {
    console.error("Error passing turn:", error)
    toast.error("Failed to pass turn")
  }
}, [gameId, user?.uid]); 


const handlePassTurn = useCallback((data) => {
  if (data.playerId === currentPlayerId) {
    passTurn();
  }
}, [currentPlayerId, passTurn]);

const handlePawnMove = useCallback((data) => {
  if (data.playerId !== user?.uid) {
    setLastMoveTimestamp(data.timestamp);
    setGameState(prev => ({
      ...prev,
      players: processMove(prev.players, data.playerId, {
        pawnId: data.pawnId,
        newPosition: data.newPosition,
        action: 'move'
      })
    }));
  }
}, [user?.uid]);

const handleDiceRolled = useCallback((data) => {
  setGameState(prev => ({
    ...prev,
    diceValue: data.value,
    lastAction: {
      type: 'dice_roll',
      value: data.value,
      playerId: data.playerId,
      timestamp: new Date(data.timestamp)
    }
  }));

  // Only check for auto-pass if it's the current player
  if (data.playerId === currentPlayerId) {
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (currentPlayer) {
      const allAtHome = areAllPawnsAtHome(currentPlayer);
      // Only auto-pass if all pawns are at home and didn't roll a 6
      if (allAtHome && data.value !== 6) {
        setTimeout(() => {
          passTurn();
        }, 1000);
      }
    }
  }
}, [currentPlayerId, players, passTurn]);

const handleMoveError = useCallback((error) => {
  console.log(error);
  
  if (pendingMove?.pawnId === error.pawnId) {
    setPendingMove(null);
  }
}, [pendingMove]);

const handlePlayerDisconnected = useCallback(({ playerId }) => {
  const playerName = players.find(p => p.id === playerId)?.name || 'A player';
  toast.warning(`${playerName} disconnected`);
}, [players]);

  useEffect(() => {
    if (!socket || !gameId) return

    socket.emit('join-game', gameId)

    // Add all socket listeners
  socket.on('pass-turn', handlePassTurn);
  socket.on('pawn-move', handlePawnMove);
  socket.on('dice-rolled', handleDiceRolled);
  socket.on('move-error', handleMoveError);
  socket.on('player-disconnected', handlePlayerDisconnected);

  return () => {
    // Remove all socket listeners
    socket.off('pass-turn', handlePassTurn);
    socket.off('pawn-move', handlePawnMove);
    socket.off('dice-rolled', handleDiceRolled);
    socket.off('move-error', handleMoveError);
    socket.off('player-disconnected', handlePlayerDisconnected);    
    socket.emit('leave-game', gameId);
  };
  }, [socket, gameId, user?.uid, players, pendingMove, passTurn])


  const joinGame = async () => {
  if (!user) {
    toast.error('You must be logged in to join a game')
    return false
  }

  try {
    const gameRef = doc(db, 'games', gameId)

    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef)

      if (!gameDoc.exists()) {
        throw new Error('Game does not exist')
      }

      const gameData = gameDoc.data()

      if (gameData.status !== 'waiting') {
        throw new Error('Game has already started')
      }

      if (gameData.players.some((p) => p.id === user.uid)) {
        throw new Error('You are already in this game')
      }

      if (gameData.players.length >= 4) {
        throw new Error('Game is full (max 4 players)')
      }

      // Color assignment logic
      let availableColor;
      if (gameData.players.length === 0) {
        availableColor = 'green'; 
      } else if (gameData.players.length === 1) {
        availableColor = 'blue';
      } else {
        const playerColors = ['green', 'red', 'blue', 'yellow'];
        availableColor = playerColors.find((color) => !gameData.players.some((p) => p.color === color)) || playerColors[0];
      }

      // const newPlayer = {
      //   id: user.uid,
      //   name: user.displayName || user.email.split('@')[0],
      //   color: availableColor,
      //   ready: false,
      //   position: 0,
      //   pawns: Array(4).fill({ position: 'home' }),
      // }

      const newPlayer = {
    id: user.uid,
    name: user.displayName || user.email.split('@')[0],
    color: availableColor,
    ready: false,
    position: 0,
    // ✅ ADD THIS: Initialize pawns array
    pawns: [
      { position: 'home' },
      { position: 'home' },
      { position: 'home' },
      { position: 'home' }
    ]
  }

      transaction.update(gameRef, {
        players: [...gameData.players, newPlayer],
      })
    })

    toast.success('Joined game successfully!')
    return true
  } catch (error) {
    // console.error('Error joining game:', error)

    if (error.message.includes('already started')) {
      toast.error('Cannot join - game already started')
    } else if (error.message.includes('already in this game')) {
      toast.warning('You are already in this game')
    } else if (error.message.includes('Game is full')) {
      toast.error('Game is full (max 4 players)')
    } else if (error.code === 'permission-denied') {
      toast.error('Failed to join: check game permissions')
    } else {
      toast.error(error.message || 'Failed to join game')
    }

    return false
  }
}
const startGame = async () => {
  if (!user) {
    return false;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      toast.error('Game not found');
      return false;
    }

    const gameData = gameDoc.data();

    // Validate game state
    if (gameData.status !== 'waiting') {
      toast.error('Game has already started');
      return false;
    }

    if (gameData.players.length < 2) {
      toast.error('Need at least 2 players to start');
      return false;
    }

    // Start the game (any player can start)
    await updateDoc(gameRef, {
      status: 'playing',
      currentTurn: gameData.players[0].id, // First player starts
      startedAt: serverTimestamp(),
      diceValue: 0,
      lastMove: null,
    });

    toast.success('Game started!');
    return true;
  } catch (error) {
    // console.error('Error starting game:', error);
    return false;
  }
};

const leaveGame = async () => {
  if (!user) {
    return false;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) {
        throw new Error('Game does not exist');
      }

      const gameData = gameDoc.data();
      const playerIndex = gameData.players.findIndex(p => p.id === user.uid);
      
      if (playerIndex === -1) {
        throw new Error('You are not in this game');
      }

      // Handle last player leaving
      if (gameData.players.length === 1) {
        transaction.delete(gameRef);
        return;
      }

      // Remove player from array
      const updatedPlayers = gameData.players.filter(p => p.id !== user.uid);

      const updateData = {
        players: updatedPlayers
      };

      // If game is active, mark as resigned
      if (gameData.status === 'playing') {
        updateData.players = updatedPlayers.map(p => 
          p.id === user.uid ? { ...p, resigned: true } : p
        );
        
        // Pass turn if it was their turn
        if (gameData.currentTurn === user.uid) {
          updateData.currentTurn = getNextPlayerId(updatedPlayers, user.uid);
        }
      }

      // Transfer creator if needed
      if (gameData.creatorId === user.uid) {
        updateData.creatorId = updatedPlayers[0]?.id || '';
      }

      transaction.update(gameRef, updateData);
    });

    // Notify other players
    socket?.emit('player-left', { gameId, playerId: user.uid });
    toast.success('You have left the game');
    return true;
  } catch (error) {
    // console.error('Error leaving game:', error);
    return false;
  }
};
  const processMove = (players, playerId, moveData) => {
    return players.map((player) => {
      if (player.id !== playerId) return player

      const updatedPawns = player.pawns.map((pawn, index) => {
        if (index === moveData.pawnIndex) {
          return { ...pawn, position: moveData.newPosition }
        }
        return pawn
      })

      return { ...player, pawns: updatedPawns }
    })
  }

const handleDiceRoll = useCallback(async (diceValue) => {
  if (!user || !socket || currentTurn !== user.uid) {
    return;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) throw new Error("Game document doesn't exist");
    const gameData = gameDoc.data();
    
    if (gameData.status !== 'playing') throw new Error("Game is not in playing state");
    if (gameData.currentTurn !== user.uid) throw new Error("Turn changed before roll completed");

    const updateData = {
      diceValue: diceValue,
      lastAction: {
        type: 'dice_roll',
        value: diceValue,
        playerId: user.uid,
        timestamp: serverTimestamp()
      }
    };

    await updateDoc(gameRef, updateData);

    socket.emit('dice-rolled', {
      gameId,
      playerId: user.uid,
      value: diceValue,
      timestamp: Date.now()
    });

    const currentPlayer = gameData.players.find(p => p.id === user.uid);
    if (currentPlayer && areAllPawnsAtHome(currentPlayer) && diceValue !== 6) {
      setTimeout(() => {
        passTurn();
      }, 1000);
    }

  } catch (error) {
    console.error("Dice roll error:", error);
    toast.error("Dice roll failed");
  }
}, [user, socket, gameId, currentTurn, passTurn]);

const checkValidMoves = (pawns, diceValue) => {
    if (!Array.isArray(pawns)) {
      console.error('Invalid pawns array:', pawns)
      return false
    }

    return pawns.some(pawn => {
      if (pawn.position === 'home') {
        return diceValue === 6
      }
      if (pawn.position === 'finish') {
        return false
      }
      return true
    })
  }

const makeMove = useCallback(async (moveData) => {
  if (!user || !socket) return false;

  try {
    console.log('moveData received:', moveData);

    let pawnIndex;
    
    if (moveData.pawnId) {
      // Parse pawnId like "green-1", "red-2", etc.
      const parts = moveData.pawnId.split('-');
      if (parts.length === 2) {
        pawnIndex = parseInt(parts[1]);
      } else {
        throw new Error('Invalid pawnId format: ' + moveData.pawnId);
      }
    } else if (moveData.pawnIndex !== undefined) {
      // Use pawnIndex directly if provided
      pawnIndex = parseInt(moveData.pawnIndex);
    } else {
      throw new Error('Either pawnId or pawnIndex is required');
    }
    
    if (isNaN(pawnIndex) || pawnIndex < 0 || pawnIndex > 3) {
      throw new Error('Invalid pawn index: ' + pawnIndex);
    }

    const gameRef = doc(db, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    if (!gameDoc.exists()) throw new Error('Game not found');

    const currentGameState = gameDoc.data();
    if (currentGameState.currentTurn !== user.uid) {
      throw new Error('Not your turn!');
    }

    const currentPlayer = currentGameState.players.find(p => p.id === user.uid);
    if (!currentPlayer) throw new Error('Player not found in game');
    
    // Ensure pawns array exists
    if (!currentPlayer.pawns || !Array.isArray(currentPlayer.pawns)) {
      currentPlayer.pawns = [
        { position: 'home' },
        { position: 'home' },
        { position: 'home' },
        { position: 'home' }
      ];
    }
    
    let currentPawn = currentPlayer.pawns[pawnIndex];
    
    // Ensure pawn object exists
    if (!currentPawn) {
      currentPlayer.pawns[pawnIndex] = { position: 'home' };
      currentPawn = currentPlayer.pawns[pawnIndex];
    }

    const currentPosition = currentPawn.position;

    // Calculate new position
    const newPosition = calculateNewPosition(
      currentPosition,
      currentGameState.diceValue,
      currentPlayer.color,
      pawnIndex
    );

    // Validate move
    const validationResult = isValidMove(
      currentPosition,
      newPosition,
      currentGameState.diceValue,
      currentPlayer.color,
      pawnIndex
    );

    if (!validationResult.isValid) {
      throw new Error(validationResult.reason || 'Invalid move');
    }

    // Update current pawn
    const updatedPawns = [...currentPlayer.pawns];
    updatedPawns[pawnIndex] = { ...currentPawn, position: newPosition };

    let updatedPlayers = currentGameState.players.map(player => 
      player.id === user.uid 
        ? { ...player, pawns: updatedPawns } 
        : player
    );

    // Handle captures (only if not on safe square)
    if (typeof newPosition === 'object' && !isSafeSquare(newPosition)) {
      const captures = checkCaptures(newPosition, currentPlayer.color, updatedPlayers);
      
      if (captures.length > 0) {
        updatedPlayers = updatedPlayers.map(player => {
          const playerCaptures = captures.filter(capture => capture.playerId === player.id);
          if (playerCaptures.length === 0) return player;
          
          const updatedPlayerPawns = player.pawns.map((pawn, index) => {
            const wasCaptured = playerCaptures.some(capture => capture.pawnIndex === index);
            return wasCaptured ? { ...pawn, position: 'home' } : pawn;
          });
          
          return { ...player, pawns: updatedPlayerPawns };
        });
      }
    }

    const hasWon = checkWinCondition(updatedPlayers, user.uid);

    const updateData = {
      players: updatedPlayers,
      lastMove: {
        playerId: user.uid,
        action: 'move',
        pawnIndex: pawnIndex,
        newPosition: newPosition,
        timestamp: serverTimestamp()
      },
      diceValue: 0, 
    };

    // Handle turn progression
    if (!hasWon && currentGameState.diceValue !== 6) {
  updateData.currentTurn = getNextPlayerId(updatedPlayers, user.uid);
}

if (hasWon) {
  updateData.status = 'finished';
  updateData.winner = user.uid;
  updateData.finishedAt = serverTimestamp();
}

    await updateDoc(gameRef, updateData);

    socket.emit('pawn-move', {
      gameId,
      playerId: user.uid,
      pawnIndex: pawnIndex,
      newPosition: newPosition,
      timestamp: Date.now(),
      isWin: hasWon,
      nextTurn: updateData.currentTurn || user.uid 
    });

    if (hasWon) {
      toast.success('🎉 You won the game!');
    } else if (validationResult.captures && validationResult.captures.length > 0) {
      toast.success(`Captured ${validationResult.captures.length} opponent pieces!`);
    }

    return true;
  } catch (err) {
    console.error('Move failed:', err);
    toast.error(err.message || 'Move failed');
    return false;
  }
}, [user, socket, gameId]);     

return {
    gameState,
    players,
    gameStatus,
    currentTurn,
    error,
    joinGame,
    startGame,
    leaveGame,
    makeMove,
    handleDiceRoll,
    checkValidMoves,
    passTurn,
    currentPlayerId,
    isCurrentPlayer: currentTurn === user?.uid,
    isGameCreator: players[0]?.id === user?.uid,
    currentPlayer: players.find((p) => p.id === user?.uid),
    lastMoveTimestamp,
    pendingMove,
// Test export function
    testMode,
    setTestMode,
    loadTestState: (testKey) => loadTestState(testKey, {
      setGameState,
      setPlayers,
      setGameStatus,
      setCurrentTurn
    }),
    validateGameState: () => validateGameState(gameState)

  }
}