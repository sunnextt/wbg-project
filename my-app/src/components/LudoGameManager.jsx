// components/LudoGameManager.jsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { doc, getDoc, onSnapshot, updateDoc, runTransaction, serverTimestamp, } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useSocket } from '@/lib/socket'


export default function useLudoGameManager(gameId) {
  const { user } = useAuth()
  const socket = useSocket()
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const [gameStatus, setGameStatus] = useState('loading') // loading, waiting, playing, finished
  const [currentTurn, setCurrentTurn] = useState(null)
  const [error, setError] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)
  const [lastMoveTimestamp, setLastMoveTimestamp] = useState(0)
  const [isDiceRolling, setIsDiceRolling] = useState(false)
  const [diceRollStartTime, setDiceRollStartTime] = useState(0)

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
        console.error('Game snapshot error:', err)
        setError('Failed to load game')
        setGameStatus('error')
      }
    )

    return () => unsubscribe()
  }, [gameId])

  useEffect(() => {
    if (!socket || !gameId) return

    socket.emit('join-game', gameId)

    const handlePawnMove = (data) => {
      if (data.playerId !== user?.uid) {
        setLastMoveTimestamp(data.timestamp)
        setGameState(prev => ({
          ...prev,
          players: processMove(prev.players, data.playerId, {
            pawnId: data.pawnId,
            newPosition: data.newPosition,
            action: 'move'
          })
        }))
      }
    }

    // Handle dice rolls
  const handleDiceRolled = (data) => {
    setGameState(prev => ({
      ...prev,
      diceValue: data.value,
      lastAction: {
        type: 'dice_roll',
        value: data.value,
        playerId: data.playerId,
        timestamp: new Date(data.timestamp)
      }
    }))
  }

    // Handle move errors
    const handleMoveError = (error) => {
      toast.error(`Move failed: ${error.message}`)
      if (pendingMove?.pawnId === error.pawnId) {
        setPendingMove(null)
      }
    }

    // Handle player disconnections
    const handlePlayerDisconnected = ({ playerId }) => {
      const playerName = players.find(p => p.id === playerId)?.name || 'A player'
      toast.warning(`${playerName} disconnected`)
    }

    socket.on('pawn-move', handlePawnMove)
    socket.on('dice-rolled', handleDiceRolled)
    socket.on('move-error', handleMoveError)
    socket.on('player-disconnected', handlePlayerDisconnected)

    return () => {
      socket.off('pawn-move', handlePawnMove)
      socket.off('dice-rolled', handleDiceRolled)
      socket.off('move-error', handleMoveError)
      socket.off('player-disconnected', handlePlayerDisconnected)
      socket.emit('leave-game', gameId)
    }
  }, [socket, gameId, user?.uid, players, pendingMove])

  
  // Add this socket effect for dice synchronization

  useEffect(() => {
  if (!socket || !gameId) return

  // Handle dice roll start from other players
  const handleDiceRollStart = ({ playerId, timestamp }) => {
    if (playerId !== user?.uid) {
      setIsDiceRolling(true)
      setDiceRollStartTime(timestamp)
      setGameState(prev => ({
        ...prev,
        diceValue: 0 // Reset while rolling
      }))
    }
  }

  // Handle dice roll complete from other players
  const handleDiceRollComplete = ({ playerId, value, timestamp }) => {
    setIsDiceRolling(false)
    setGameState(prev => ({
      ...prev,
      diceValue: value,
      lastAction: {
        type: 'dice_roll',
        value,
        playerId,
        timestamp
      }
    }))
  }

  socket.on('dice-roll-start', handleDiceRollStart)
  socket.on('dice-roll-complete', handleDiceRollComplete)

  return () => {
    socket.off('dice-roll-start', handleDiceRollStart)
    socket.off('dice-roll-complete', handleDiceRollComplete)
  }
}, [socket, gameId, user?.uid])

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

      const newPlayer = {
        id: user.uid,
        name: user.displayName || user.email.split('@')[0],
        color: availableColor,
        ready: false,
        position: 0,
        pawns: Array(4).fill({ position: 'home' }),
      }

      transaction.update(gameRef, {
        players: [...gameData.players, newPlayer],
      })
    })

    toast.success('Joined game successfully!')
    return true
  } catch (error) {
    console.error('Error joining game:', error)

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
    toast.error('You must be logged in to start a game');
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
    console.error('Error starting game:', error);
    toast.error('Failed to start game');
    return false;
  }
};

const leaveGame = async () => {
  if (!user) {
    toast.error('You must be logged in to leave a game');
    return false;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    
    // Use transaction for atomic operation
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
    console.error('Error leaving game:', error);
    toast.error(error.message || 'Failed to leave game');
    return false;
  }
};
const getNextPlayerId = (players, currentPlayerId) => {
    const activePlayers = players.filter((p) => !p.resigned)
    if (activePlayers.length === 0) return null

    const currentIndex = activePlayers.findIndex((p) => p.id === currentPlayerId)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    return activePlayers[nextIndex].id
  }

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

  const checkWinCondition = (players, playerId) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return false

    // Check if all pawns are in finish position
    return player.pawns.every((pawn) => pawn.position === 'finish')
  }


const handleDiceRoll = useCallback(async (diceValue) => {
  if (!user || !socket || currentTurn !== user.uid) {
    toast.error("It's not your turn to roll!")
    return
  }

  try {
    const timestamp = Date.now()
    setIsDiceRolling(true)
    setDiceRollStartTime(timestamp)

    // Notify all players that dice is rolling
    socket.emit('dice-roll-start', {
      gameId,
      playerId: user.uid,
      timestamp
    })

    // Update local state immediately
    setGameState(prev => ({
      ...prev,
      diceValue: 0 // Reset while rolling
    }))

    // Wait for animation to complete (simulated delay)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Finalize the roll
    setIsDiceRolling(false)
    
    const gameRef = doc(db, 'games', gameId)
    await updateDoc(gameRef, {
      diceValue,
      lastAction: {
        type: 'dice_roll',
        value: diceValue,
        playerId: user.uid,
        timestamp: serverTimestamp()
      }
    })

    // Notify all players of the result
    socket.emit('dice-roll-complete', {
      gameId,
      playerId: user.uid,
      value: diceValue,
      timestamp
    })

    if (diceValue === 6) {
      toast.success("You rolled a 6! Roll again")
    } else {
      const currentPlayer = gameState?.players?.find(p => p.id === user.uid)
      if (!checkValidMoves(currentPlayer?.pawns || [], diceValue)) {
        await passTurn()
      }
    }
  } catch (error) {
    console.error("Dice roll error:", error)
    toast.error(`Dice roll failed: ${error.message}`)
    setIsDiceRolling(false)
  }
}, [user, socket, gameId, currentTurn, gameState?.players])

const checkValidMoves = (pawns, diceValue) => {
  if (!Array.isArray(pawns)) {
    console.error('Invalid pawns array:', pawns)
    return false
  }

  return pawns.some(pawn => {
    // Check if pawn can move out of home (needs a 6)
    if (pawn.position === 'home') {
      return diceValue === 6
    }
    // Check if pawn is already in finish position
    if (pawn.position === 'finish') {
      return false
    }
    // For pawns on the board, any move is valid
    return true
  })
}

const passTurn = async () => {
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
    
    toast.info("Turn passed to next player")
  } catch (error) {
    console.error("Error passing turn:", error)
    toast.error("Failed to pass turn")
  }
}

const makeMove = useCallback(async (moveData) => {
  if (!user || !gameState || !socket) {
    toast.error('Connection error. Please try again.');
    return false;
  }

  // Validate it's the player's turn
  if (gameState.currentTurn !== user.uid) {
    toast.error('Not your turn!');
    return false;
  }

  // Validate move data
  if (!moveData || !moveData.pawnId || !moveData.newPosition) {
    toast.error('Invalid move data');
    return false;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const currentGameState = gameDoc.data();
      
      // Additional validation
      if (currentGameState.status !== 'playing') {
        throw new Error('Game is not in progress');
      }

      if (currentGameState.currentTurn !== user.uid) {
        throw new Error('Turn changed before move completed');
      }

      // Parse pawn information
      const [color, pawnIndexStr] = moveData.pawnId.split('-');
      const pawnIndex = parseInt(pawnIndexStr);
      
      if (isNaN(pawnIndex) || pawnIndex < 0 || pawnIndex > 3) {
        throw new Error('Invalid pawn selection');
      }

      // Find the current player
      const currentPlayer = currentGameState.players.find(p => p.id === user.uid);
      if (!currentPlayer) {
        throw new Error('Player not found in game');
      }

      // Ensure pawns exists and is an array
      const playerPawns = Array.isArray(currentPlayer.pawns) 
        ? [...currentPlayer.pawns] 
        : Array(4).fill({ position: 'home' });

      // Validate the move
      // if (!isValidMove(currentPlayer, pawnIndex, moveData.newPosition, currentGameState.diceValue)) {
      //   throw new Error('Invalid move according to game rules');
      // }

      // Update the pawn position
      playerPawns[pawnIndex] = {
        ...playerPawns[pawnIndex],
        position: moveData.newPosition
      };

      // Update players array
      const updatedPlayers = currentGameState.players.map(player => 
        player.id === user.uid 
          ? { ...player, pawns: playerPawns } 
          : player
      );

      // Check win condition
      const hasWon = checkWinCondition(updatedPlayers, user.uid);

      // Prepare update data
      const updateData = {
        players: updatedPlayers,
        lastMove: {
          playerId: user.uid,
          action: 'move',
          pawnId: moveData.pawnId,
          timestamp: serverTimestamp()
        },
        diceValue: 0, // Reset dice after move
        ...(hasWon ? {
          status: 'finished',
          winner: user.uid,
          finishedAt: serverTimestamp()
        } : {})
      };

      // Set next turn (unless player won or rolled a 6)
      if (!hasWon && currentGameState.diceValue !== 6) {
        updateData.currentTurn = getNextPlayerId(updatedPlayers, user.uid);
      }

      transaction.update(gameRef, updateData);

      // Emit move via socket
      socket.emit('pawn-move', {
        gameId,
        playerId: user.uid,
        pawnId: moveData.pawnId,
        newPosition: moveData.newPosition,
        timestamp: Date.now(),
        isWin: hasWon,
        nextTurn: updateData.currentTurn
      });
    });

    return true;
  } catch (error) {
    console.error('Move failed:', error);
    toast.error(error.message || 'Move failed');
    return false;
  }
}, [user, gameState, socket, gameId]);

const isValidMove = (player, pawnIndex, newPosition, diceValue) => {
  // Ensure pawns exists and is an array
  const pawns = Array.isArray(player.pawns) ? player.pawns : [];
  const pawn = pawns[pawnIndex];
  
  if (!pawn) return false;

  // Check if pawn is in home and needs a 6 to move out
  if (pawn.position === 'home' && diceValue !== 6) {
    return false;
  }

  // Check if pawn is already finished
  if (pawn.position === 'finish') {
    return false;
  }

  // Add additional game-specific validation here
  return true;
};


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
  isDiceRolling,
  diceRollStartTime,
    currentPlayerId,
    isCurrentPlayer: currentTurn === user?.uid,
    isGameCreator: players[0]?.id === user?.uid,
    currentPlayer: players.find((p) => p.id === user?.uid),
    lastMoveTimestamp,
    pendingMove,
  }
}