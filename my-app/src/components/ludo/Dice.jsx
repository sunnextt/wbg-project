'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { doc, getDoc, onSnapshot, updateDoc, arrayRemove, runTransaction, serverTimestamp,deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useSocket } from '@/lib/socket'


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
  if (!socket || !gameId) return;

  socket.emit('join-game', gameId);

  const handlePawnMove = (data) => {
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
  };

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
    }));
  };

  const handleDiceRollStart = ({ playerId, timestamp }) => {
    if (playerId !== user?.uid) {
      setIsDiceRolling(true);
      setDiceRollStartTime(timestamp);
      setGameState(prev => ({
        ...prev,
        diceValue: 0
      }));
    }
  };

  const handleDiceRollComplete = ({ playerId, value, timestamp }) => {
    setIsDiceRolling(false);
    setGameState(prev => ({
      ...prev,
      diceValue: value,
      lastAction: {
        type: 'dice_roll',
        value,
        playerId,
        timestamp
      }
    }));
  };

  const handleMoveError = (error) => {
    toast.error(`Move failed: ${error.message}`);
    if (pendingMove?.pawnId === error.pawnId) {
      setPendingMove(null);
    }
  };

  const handlePlayerDisconnected = ({ playerId }) => {
    const playerName = players.find(p => p.id === playerId)?.name || 'A player';
    toast.warning(`${playerName} disconnected`);
  };

  socket.on('pawn-move', handlePawnMove);
  socket.on('dice-rolled', handleDiceRolled);
  socket.on('dice-roll-start', handleDiceRollStart);
  socket.on('dice-roll-complete', handleDiceRollComplete);
  socket.on('move-error', handleMoveError);
  socket.on('player-disconnected', handlePlayerDisconnected);

  return () => {
    socket.off('pawn-move', handlePawnMove);
    socket.off('dice-rolled', handleDiceRolled);
    socket.off('dice-roll-start', handleDiceRollStart);
    socket.off('dice-roll-complete', handleDiceRollComplete);
    socket.off('move-error', handleMoveError);
    socket.off('player-disconnected', handlePlayerDisconnected);
    socket.emit('leave-game', gameId);
  };
}, [socket, gameId, user?.uid, players, pendingMove]);

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
      currentTurn: gameData.players[0].id, 
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

      if (gameData.status === 'playing') {
        updateData.players = updatedPlayers.map(p => 
          p.id === user.uid ? { ...p, resigned: true } : p
        );
        
        if (gameData.currentTurn === user.uid) {
          updateData.currentTurn = getNextPlayerId(updatedPlayers, user.uid);
        }
      }

      if (gameData.creatorId === user.uid) {
        updateData.creatorId = updatedPlayers[0]?.id || '';
      }

      transaction.update(gameRef, updateData);
    });

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
  const player = players.find(p => p.id === playerId);
  if (!player) return false;

  // Check if all pawns are in finish position
  return player.pawns.every(pawn => pawn.position === 'finish');
};


const handleDiceRoll = useCallback(async () => {
  if (!user || !socket || currentTurn !== user.uid) {
    toast.error("It's not your turn to roll!");
    return;
  }

  try {
    const timestamp = Date.now();
    setIsDiceRolling(true);
    setDiceRollStartTime(timestamp);

    // Notify all players that dice is rolling
    socket.emit('dice-roll-start', {
      gameId,
      playerId: user.uid,
      timestamp
    });

    // Wait for animation to complete (simulated delay)
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Generate random result (ensure it's always 1-6)
    const diceValue = Math.floor(Math.random() * 6) + 1;
    setIsDiceRolling(false);

    // Prepare the update data
    const updateData = {
      diceValue, // This is now guaranteed to be a number
      lastAction: {
        type: 'dice_roll',
        value: diceValue,
        playerId: user.uid,
        timestamp: serverTimestamp()
      }
    };

    // Update game state
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, updateData);

    // Notify all players of the result
    socket.emit('dice-roll-complete', {
      gameId,
      playerId: user.uid,
      value: diceValue,
      timestamp
    });

    if (diceValue === 6) {
      toast.success("You rolled a 6! Roll again");
    } else {
      const currentPlayer = gameState?.players?.find(p => p.id === user.uid);
      if (!checkValidMoves(currentPlayer?.pawns || [], diceValue)) {
        await passTurn();
      }
    }
  } catch (error) {
    console.error("Dice roll error:", error);
    toast.error(`Dice roll failed: ${error.message}`);
    setIsDiceRolling(false);
  }
}, [user, socket, gameId, currentTurn, gameState?.players]);

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
    if (pawn.position === 'finish') {
      return false
    }
    return true
  })
}

const handleCaptures = (players, currentPlayerId, newPosition, currentColor) => {
  // Don't capture on safe spots or home
  if (newPosition === 'home') {
    return players;
  }

  return players.map(player => {
    // Skip current player and players of the same color (team)
    if (player.id === currentPlayerId || player.color === currentColor) {
      return player;
    }

    // Check each pawn for captures
    const updatedPawns = player.pawns.map(pawn => {
      if (pawn.position === newPosition) {
        // Capture this pawn (send it home)
        toast.success(`Captured ${player.name}'s pawn!`);
        return { ...pawn, position: 'home' };
      }
      return pawn;
    });

    return { ...player, pawns: updatedPawns };
  });
};


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

      // Get current pawn state
      const currentPawn = playerPawns[pawnIndex];
      if (!currentPawn) {
        throw new Error('Selected pawn not found');
      }

      // Validate the move based on game rules
      if (!isValidMove(
        currentPawn.position, 
        moveData.newPosition, 
        currentGameState.diceValue,
        color,
        currentGameState.players
      )) {
        throw new Error('Invalid move according to game rules');
      }

      // Check for captures
      const updatedPlayers = handleCaptures(
        currentGameState.players,
        user.uid,
        moveData.newPosition,
        color
      );

      // Update the pawn position
      const updatedPawns = [...playerPawns];
      updatedPawns[pawnIndex] = {
        ...currentPawn,
        position: moveData.newPosition
      };

      // Update current player's pawns in the players array
      const finalPlayers = updatedPlayers.map(player => 
        player.id === user.uid 
          ? { ...player, pawns: updatedPawns } 
          : player
      );

      // Check win condition
      const hasWon = checkWinCondition(finalPlayers, user.uid);

      // Prepare update data
      const updateData = {
        players: finalPlayers,
        lastMove: {
          playerId: user.uid,
          action: 'move',
          pawnId: moveData.pawnId,
          fromPosition: currentPawn.position,
          toPosition: moveData.newPosition,
          timestamp: serverTimestamp()
        },
        diceValue: 0, // Reset dice after move
      };

      // Determine if turn should pass
      let shouldPassTurn = true;
      
      // Cases where turn doesn't pass:
      // 1. Player won the game
      // 2. Player rolled a 6 (gets another turn)
      if (hasWon) {
        updateData.status = 'finished';
        updateData.winner = user.uid;
        updateData.finishedAt = serverTimestamp();
      } else if (currentGameState.diceValue === 6) {
        shouldPassTurn = false;
        toast.info("You rolled a 6! Roll again");
      }

      // If turn should pass, set next player
      if (shouldPassTurn) {
        updateData.currentTurn = getNextPlayerId(finalPlayers, user.uid);
      }

      transaction.update(gameRef, updateData);

      // Emit move via socket
      socket.emit('pawn-move', {
        gameId,
        playerId: user.uid,
        pawnId: moveData.pawnId,
        fromPosition: currentPawn.position,
        newPosition: moveData.newPosition,
        timestamp: Date.now(),
        isWin: hasWon,
        nextTurn: updateData.currentTurn,
        diceValue: 0 // Reset dice for all clients
      });
    });

    return true;
  } catch (error) {
    console.error('Move failed:', error);
    toast.error(error.message || 'Move failed');
    return false;
  }
}, [user, gameState, socket, gameId]);


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
  }
}

'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import DiceAnimator from './DiceAnimator'
import { useSocket } from '@/lib/socket'
import { toast } from 'react-toastify'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function LudoCanvas({
  gameId,
  players = [],
  gameStatus,
  currentTurn,
  currentPlayerId,
  gameState,
  onPawnMove,
}) {
  const ludoBoardRef = useRef()
  const socket = useSocket()
  const [localDiceValue, setLocalDiceValue] = useState(0)
  const [currentTurnName, setCurrentTurnName] = useState('')
  const [isRolling, setIsRolling] = useState(false)
  const [remoteRollingPlayer, setRemoteRollingPlayer] = useState(null)

  // Sync game state
  useEffect(() => {
    if (gameState?.diceValue !== undefined) {
      setLocalDiceValue(gameState.diceValue)
    }
  }, [gameState?.diceValue])

  // Update current player name
  useEffect(() => {
    const player = players.find((p) => p.id === currentTurn)
    setCurrentTurnName(player?.name || '')
  }, [currentTurn, players])

  // Socket listeners for real-time sync
  useEffect(() => {
    if (!socket) return

    const handleRemoteRollStart = (data) => {
      if (data.gameId === gameId && data.playerId !== currentPlayerId) {
        setRemoteRollingPlayer(data.playerId)
        setLocalDiceValue(0) // Reset for animation
      }
    }

    const handleDiceResult = (data) => {
      if (data.gameId === gameId) {
        setLocalDiceValue(data.value)
        setRemoteRollingPlayer(null)
      }
    }

    socket.on('remote-roll-start', handleRemoteRollStart)
    socket.on('dice-result', handleDiceResult)

    return () => {
      socket.off('remote-roll-start', handleRemoteRollStart)
      socket.off('dice-result', handleDiceResult)
    }
  }, [socket, gameId, currentPlayerId])

  const handleRollStart = () => {
    setIsRolling(true)
    setLocalDiceValue(0)
    socket.emit('remote-roll-start', {
      gameId,
      playerId: currentPlayerId,
      timestamp: Date.now()
    })
  }

  const handleRollComplete = async (result) => {
    try {
      // Update Firestore
      const gameRef = doc(db, 'games', gameId)
      await updateDoc(gameRef, {
        diceValue: result,
        lastAction: {
          type: 'dice_roll',
          value: result,
          playerId: currentPlayerId,
          timestamp: serverTimestamp()
        }
      })

      // Notify all players
      socket.emit('dice-result', {
        gameId,
        playerId: currentPlayerId,
        value: result,
        timestamp: Date.now()
      })

      setIsRolling(false)
    } catch (error) {
      console.error("Dice roll failed:", error)
      toast.error("Dice roll failed")
      setIsRolling(false)
    }
  }

  const handleRollDice = () => {
    if (canRollDice()) {
      handleRollStart()
    }
  }

  const canRollDice = () => {
    return !isRolling && 
           !remoteRollingPlayer &&
           currentPlayerId === currentTurn && 
           gameStatus === 'playing' &&
           !gameState?.diceValue
  }

  const getRollingStatus = () => {
    if (isRolling) return "You are rolling..."
    if (remoteRollingPlayer) {
      const player = players.find(p => p.id === remoteRollingPlayer)
      return `${player?.name || 'Opponent'} is rolling...`
    }
    return null
  }

  const getButtonText = () => {
    if (isRolling) return 'Rolling...'
    if (remoteRollingPlayer) return 'Wait for roll...'
    if (gameStatus !== 'playing') return 'Game Not Started'
    if (currentPlayerId !== currentTurn) return `Waiting for ${currentTurnName}`
    return gameState?.diceValue ? 'Make Your Move' : 'ROLL DICE 🎲'
  }

  const handlePawnMove = (moveData) => {
    if (onPawnMove) {
      onPawnMove({
        gameId,
        playerId: currentPlayerId,
        pawnId: `${moveData.color}-${moveData.pawnIndex}`,
        newPosition: moveData.newPosition,
        timestamp: Date.now(),
      })
    }
  }

  return (
    <div className='relative w-full h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-600'>
      <div className="absolute inset-0 bg-[url('/images/ludo-bg.jpg')] bg-cover bg-center opacity-10 blur-sm z-0 pointer-events-none" />
      
      <Canvas shadows camera={{ position: [0, 25, 0], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 10, 3]} intensity={1.2} castShadow />
        <Environment preset='sunset' />

        <group scale={[1.6, 1.6, 1.6]}>
          <LudoBoard
            position={[0, 0, 0]}
            ref={ludoBoardRef}
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            onPawnMove={handlePawnMove}
            players={players}
          />
        </group>
        
        {ludoBoardRef.current?.diceRef && (
          <DiceAnimator
            diceRef={ludoBoardRef.current.diceRef}
            trigger={isRolling || !!remoteRollingPlayer}
            onFinish={handleRollComplete}
            currentValue={localDiceValue}
            isRemoteRoll={!!remoteRollingPlayer && !isRolling}
          />
        )}

        <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} target={[0, 0, 0]} />
      </Canvas>

      {/* Game UI */}
      <div className='absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2'>
        {getRollingStatus() && (
          <div className="text-white text-lg font-semibold bg-black bg-opacity-70 px-4 py-2 rounded-full animate-pulse">
            {getRollingStatus()}
          </div>
        )}
        <button
          onClick={handleRollDice}
          className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
            ${
              canRollDice()
                ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
                : 'bg-gray-500 text-gray-200 cursor-not-allowed'
            }
            ${(isRolling || remoteRollingPlayer) ? 'opacity-70 scale-95' : 'hover:scale-105'}`}
          disabled={!canRollDice()}
        >
          {getButtonText()}
        </button>
      </div>

      {/* Dice value display */}
      {(gameState?.diceValue || localDiceValue > 0) && (
        <div className='absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-10'>
          Dice: {gameState?.diceValue || localDiceValue}
        </div>
      )}

      {/* Turn indicator */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-20">
        {currentPlayerId === currentTurn ? 
          "Your turn!" : 
          `${currentTurnName}'s turn`
        }
      </div>
    </div>
  )
}