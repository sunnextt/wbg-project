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
    const player = players.find((p) => p.id === playerId)
    if (!player) return false

    return player.pawns.every((pawn) => pawn.position === 'finish')
  }


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
        diceValue: 0, 
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

export default function LudoCanvas({
  gameId,
  players = [],
  gameStatus,
  currentTurn,
  currentPlayerId,
  onRollDice,
  gameState,
  onPawnMove,
  isDiceRolling
}) {
  const ludoBoardRef = useRef();
  const [triggerRoll, setTriggerRoll] = useState(false);
  const [currentTurnName, setCurrentTurnName] = useState('Unknown Player'); // Add this line

  useEffect(() => {
    const player = players.find(p => p.id === currentTurn);
    setCurrentTurnName(player?.name || 'Unknown Player');
  }, [currentTurn, players]);

const handleRollComplete = (result) => {
    setTriggerRoll(false)
    onRollDice(result)
  }

  const handleRollClick = () => {
    if (canRollDice()) {
      setTriggerRoll(true)
    }
  }

  const canRollDice = () => {
    return !isDiceRolling &&
           currentPlayerId === currentTurn &&
           gameStatus === 'playing'
  }

  const getButtonText = () => {
    if (isDiceRolling) {
      return currentPlayerId === currentTurn ? 'Rolling...' : `${currentTurnName} is rolling...`
    }
    if (gameStatus !== 'playing') return 'Game Not Started'
    if (currentPlayerId === currentTurn) return 'ROLL DICE 🎲'
    return `Waiting for ${currentTurnName}`
  }

  return (
    <div className='relative w-full h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-600'>
      <div className="absolute inset-0 bg-[url('/images/ludo-bg.jpg')] bg-cover bg-center opacity-10 blur-sm z-0 pointer-events-none" />
      
      <Canvas
        shadows
        camera={{ position: [0, 10, 0], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 10, 3]} intensity={1.2} castShadow />
        <Environment preset="sunset" />

        <group scale={[0.65, 0.65, 0.65]}>
<LudoBoard 
  ref={ludoBoardRef} 
  gameState={gameState} 
  currentPlayerId={currentPlayerId} 
  onPawnMove={onPawnMove} 
  players={players} 
/>        </group>

        {ludoBoardRef.current?.diceRef && (
          <DiceAnimator
            diceRef={ludoBoardRef.current.diceRef}
            trigger={isDiceRolling || triggerRoll}
            onFinish={handleRollComplete}
          />
        )}

        <OrbitControls
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
          target={[0, 0, 0]}
        />
      </Canvas>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleRollClick}
          disabled={!canRollDice()}
          className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
            ${canRollDice()
              ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
              : 'bg-gray-500 text-gray-200 cursor-not-allowed'
            }
            ${isDiceRolling ? 'opacity-70 scale-95' : 'hover:scale-105'}`}
        >
          {getButtonText()}
        </button>
      </div>

      {gameState?.diceValue > 0 && !isDiceRolling && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-10">
          Dice: {gameState.diceValue}
        </div>
      )}
     <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-20">
        {currentPlayerId === currentTurn ? 
          "Your turn!" : 
          `${currentTurnName}'s turn`
        }
      </div>
    </div>
  )
}

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls';

extend({ DragControls });

const LudoBoard = forwardRef((props, ref) => {
  const { nodes, materials } = useGLTF('/ludo_board_games.glb');
  const { gameState, currentPlayerId, onPawnMove, players } = props;
  const { camera, gl } = useThree();
  const groupRef = useRef();
  const diceRef = useRef();
  const controlsRef = useRef();

  useImperativeHandle(ref, () => ({
    diceRef: diceRef.current
  }));


  const initialPawns = [
    // Green pawns
    { id: 1, geo: nodes.Object_4.geometry, mat: materials.LUDO_COIN_M, pos: [2.232, 0.253, 0.711], scale: 12.073 },
    { id: 2, geo: nodes.Object_28.geometry, mat: materials.LUDO_COIN_M, pos: [1.635, 0.253, -0.001], scale: 12.073 },
    { id: 3, geo: nodes.Object_30.geometry, mat: materials.LUDO_COIN_M, pos: [0.918, 0.253, 0.688], scale: 12.073 },
    { id: 4, geo: nodes.Object_32.geometry, mat: materials.LUDO_COIN_M, pos: [1.612, 0.253, 1.37], scale: 12.073 },

    // Red pawns
    {
      id: 5,
      geo: nodes.Object_10.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-2.592, 0.253, 0.711],
      scale: 12.073,
    },
    {
      id: 6,
      geo: nodes.Object_34.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-3.2, 0.253, 0.016],
      scale: 12.073,
    },
    {
      id: 7,
      geo: nodes.Object_36.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-3.888, 0.253, 0.711],
      scale: 12.073,
    },
    {
      id: 8,
      geo: nodes.Object_38.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-3.223, 0.253, 1.37],
      scale: 12.073,
    },

    // Blue pawns
    {
      id: 9,
      geo: nodes.Object_12.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-2.592, 0.253, -4.089],
      scale: 12.073,
    },
    {
      id: 10,
      geo: nodes.Object_22.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-3.212, 0.253, -4.777],
      scale: 12.073,
    },
    {
      id: 11,
      geo: nodes.Object_24.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-3.906, 0.253, -4.089],
      scale: 12.073,
    },
    {
      id: 12,
      geo: nodes.Object_26.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-3.229, 0.253, -3.44],
      scale: 12.073,
    },

    // Yellow pawns
    {
      id: 13,
      geo: nodes.Object_14.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [0.918, 0.253, -4.106],
      scale: 12.073,
    },
    {
      id: 14,
      geo: nodes.Object_16.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [2.22, 0.253, -4.083],
      scale: 12.073,
    },
    {
      id: 15,
      geo: nodes.Object_18.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [1.607, 0.253, -4.777],
      scale: 12.073,
    },
    {
      id: 16,
      geo: nodes.Object_20.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [1.607, 0.253, -3.446],
      scale: 12.073,
    },
  ];

  const [pawns, setPawns] = useState(initialPawns);
  const activeColors = players?.map((player) => player.color) || [];
  const pawnRefs = useRef([]);

  // Expose the diceRef to parent component
  useEffect(() => {
    if (ref) {
      ref.current = {
        diceRef: diceRef.current
      };
    }
  }, [ref]);

  // Helper function to check if a pawn belongs to the current player
  const isCurrentPlayerPawn = (pawnId) => {
    if (!currentPlayerId) return false;

    const currentPlayer = players?.find((p) => p.id === currentPlayerId);
    if (!currentPlayer) return false;

    const colorMap = {
      green: { start: 1, end: 4 },
      red: { start: 5, end: 8 },
      blue: { start: 9, end: 12 },
      yellow: { start: 13, end: 16 },
    };

    const pawnColor = Object.entries(colorMap).find(
      ([_, range]) => pawnId >= range.start && pawnId <= range.end
    )?.[0];

    return pawnColor === currentPlayer.color;
  };

  useEffect(() => {
    if (gameState?.players) {
      const updatedPawns = [...initialPawns];

      gameState.players.forEach((player) => {
        player.pawns?.forEach((pawn, index) => {
          const pawnId = getPawnId(player.color, index);
          const pawnIndex = pawnId - 1;

          if (pawnIndex >= 0 && pawnIndex < updatedPawns.length) {
            if (pawn.position === 'home') {
              updatedPawns[pawnIndex].pos = [...initialPawns[pawnIndex].pos];
            } else if (pawn.position === 'finish') {
              updatedPawns[pawnIndex].pos = getFinishPosition(player.color, index);
            } else if (typeof pawn.position === 'object') {
              updatedPawns[pawnIndex].pos = [pawn.position.x, pawn.position.y, pawn.position.z];
            }
          }
        });
      });

      setPawns(updatedPawns);
    }
  }, [gameState]);

  const getPawnId = (color, index) => {
    const colorMap = {
      green: { start: 1, count: 4 },
      red: { start: 5, count: 4 },
      blue: { start: 9, count: 4 },
      yellow: { start: 13, count: 4 },
    };
    return colorMap[color]?.start + index;
  };

  const getFinishPosition = (color, pawnIndex) => {
    const finishPositions = {
      green: [
        [3.5, 0.253, 1.5],
        [3.5, 0.253, 0.5],
        [2.5, 0.253, 1.5],
        [2.5, 0.253, 0.5],
      ],
      red: [
        [-3.5, 0.253, 1.5],
        [-3.5, 0.253, 0.5],
        [-4.5, 0.253, 1.5],
        [-4.5, 0.253, 0.5],
      ],
      blue: [
        [-3.5, 0.253, -3.5],
        [-3.5, 0.253, -4.5],
        [-4.5, 0.253, -3.5],
        [-4.5, 0.253, -4.5],
      ],
      yellow: [
        [3.5, 0.253, -3.5],
        [3.5, 0.253, -4.5],
        [2.5, 0.253, -3.5],
        [2.5, 0.253, -4.5],
      ],
    };
    return finishPositions[color]?.[pawnIndex] || [0, 0, 0];
  };

  useEffect(() => {
    if (pawnRefs.current.length > 0) {
      controlsRef.current = new DragControls(pawnRefs.current, camera, gl.domElement);

      controlsRef.current.addEventListener('dragstart', (event) => {
        const pawnIndex = pawnRefs.current.findIndex((ref) => ref === event.object);
        if (pawnIndex === -1 || !isCurrentPlayerPawn(pawnIndex + 1)) {
          controlsRef.current.cancel();
          return;
        }
        event.object.material.opacity = 0.8;
      });

      controlsRef.current.addEventListener('dragend', (event) => {
        event.object.material.opacity = 1;

        const pawnIndex = pawnRefs.current.findIndex((ref) => ref === event.object);
        if (pawnIndex === -1) return;

        const newPosition = {
          x: event.object.position.x,
          y: event.object.position.y,
          z: event.object.position.z,
        };

        const pawnId = pawnIndex + 1;
        let playerColor = '';
        if (pawnId >= 1 && pawnId <= 4) playerColor = 'green';
        else if (pawnId >= 5 && pawnId <= 8) playerColor = 'red';
        else if (pawnId >= 9 && pawnId <= 12) playerColor = 'blue';
        else if (pawnId >= 13 && pawnId <= 16) playerColor = 'yellow';

        const playerPawnIndex = (pawnId - 1) % 4;

        if (onPawnMove && playerColor && currentPlayerId) {
          onPawnMove({
            playerId: currentPlayerId,
            color: playerColor,
            pawnIndex: playerPawnIndex,
            newPosition,
          });
        }
      });

      controlsRef.current.enabled = gameState?.currentTurn === currentPlayerId && gameState?.diceValue > 0;

      return () => {
        controlsRef.current?.dispose();
      };
    }
  }, [camera, gl, gameState?.currentTurn, currentPlayerId, gameState?.diceValue, onPawnMove]);

  return (
    <group {...props} dispose={null}>
      {/* Board */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        material={materials['LUDO_BOARD_UPPER.001']}
        position={[-0.841, 0.215, -1.715]}
        scale={14.023}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_8.geometry}
        material={materials.LUDO_BOARD_UPPER}
        position={[-0.841, 0.215, -1.715]}
        scale={14.023}
      />

      {/* Dice */}
      <group ref={diceRef} position={[5.178, 0.253, -1.668]} rotation={[Math.PI / 2, 0, 0]} scale={15}>
        <mesh castShadow receiveShadow geometry={nodes.Object_40.geometry} material={materials.DICE_M} />
        <mesh castShadow receiveShadow geometry={nodes.Object_41.geometry} material={materials['Material.002']} />
      </group>

      {/* Pawns */}
      <group ref={groupRef}>
       {pawns.map((pawn, index) => {
          const pawnColor = pawn.id <= 4 ? 'green' : pawn.id <= 8 ? 'red' : pawn.id <= 12 ? 'blue' : 'yellow';
          const isActive = activeColors.includes(pawnColor);

          return (
            <mesh
              key={pawn.id}
              ref={(el) => (pawnRefs.current[index] = el)}
              geometry={pawn.geo}
              material={pawn.mat}
              position={pawn.pos}
              scale={pawn.scale}
              castShadow
              receiveShadow
              visible={isActive}
              userData={{ disabled: !isActive }}
            />
          );
        })}      </group>
    </group>
  );
});

useGLTF.preload('/ludo_board_games.glb');

export default LudoBoard;

'use client'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function DiceAnimator({ diceRef, trigger, onFinish }) {
  const animationRef = useRef({
    started: false,
    duration: 1.2, 
    elapsed: 0
  })

  const originalRotation = useRef(new THREE.Euler())

  useEffect(() => {
    if (!diceRef) return

    if (trigger) {
      console.log('Starting dice animation')
      animationRef.current.started = true
      animationRef.current.elapsed = 0
      originalRotation.current.copy(diceRef.rotation)
    } else {
      animationRef.current.started = false
    }
  }, [trigger, diceRef])

  useFrame((_, delta) => {
    if (!trigger || !diceRef || !animationRef.current.started) return

    animationRef.current.elapsed += delta
    const progress = Math.min(animationRef.current.elapsed / animationRef.current.duration, 1)

    if (progress < 1) {
      // Animate spinning
      diceRef.rotation.x += delta * 10
      diceRef.rotation.y += delta * 12
      diceRef.rotation.z += delta * 8
    } else {
      // Animation complete
      const result = Math.floor(Math.random() * 6) + 1
      setDiceRotation(diceRef, result)
      animationRef.current.started = false
      onFinish?.(result)
    }
  })

  return null
}

function setDiceRotation(dice, result) {
  const rotations = {
    1: [0, Math.PI/2, 0],    
    2: [0, 0, -Math.PI/2],  
    3: [0, Math.PI, 0],     
    4: [0, 0, 0],           
    5: [0, 0, Math.PI/2],   
    6: [0, -Math.PI/2, 0]  
  }
  dice.rotation.set(...(rotations[result] || rotations[1]))
}

import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export default function Dice(props) {
  const { nodes, materials } = useGLTF('/dice.glb')
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={0.053}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial.geometry}
            material={materials.defaultMat}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_1.geometry}
            material={materials.defaultMat}
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/dice.glb')


'use client'

import { useParams } from 'next/navigation'
import useLudoGameManager from '@/components/LudoGameManager'
import LudoCanvas from '@/components/ludo/LudoCanvas'
import GameStatusBanner from '@/components/GameStatusBanner'
import GameControls from '@/components/GameControls'
import PlayerList from '@/components/PlayerList'

export default function LudoGamePage() {
  const { gameId } = useParams()
  const {
    gameState,
    players = [],
    gameStatus,
    currentTurn,
    joinGame,
    startGame,
    leaveGame,
    makeMove,
    currentPlayerId,
    isGameCreator,
    currentPlayer,
    isLoading,
    error,
    handleDiceRoll,
  } = useLudoGameManager(gameId)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-red-500 text-xl'>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-red-500 text-xl'>{error}</div>
      </div>
    )
  }

  return (
    <main className='bg-green-50 min-h-screen'>
      <div className='container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6'>
        <div className='lg:col-span-9 flex flex-col items-center'>
          <div className='w-full max-w-4xl'>
            <GameStatusBanner
              status={gameStatus}
              playerCount={players.length}
              currentTurn={currentTurn}
              players={players}
              currentPlayerId={currentPlayerId}
            />

            <LudoCanvas
              gameId={gameId}
              players={players}
              gameStatus={gameStatus}
              currentTurn={currentTurn}
              currentPlayerId={currentPlayerId}
              onRollDice={handleDiceRoll}
              gameState={gameState}
              onPawnMove={makeMove}
            />

            <GameControls
              gameStatus={gameStatus}
              players={players}
              currentPlayerId={currentPlayerId}
              isGameCreator={isGameCreator}
              currentPlayer={currentPlayer}
              onJoin={joinGame}
              onStart={startGame}
              onLeave={leaveGame}
            />
          </div>
        </div>

        <div className='lg:col-span-3 space-y-6'>
          <PlayerList players={players} currentPlayerId={currentPlayerId} />

          <section>
            <h3 className='text-md font-semibold text-gray-700 mb-2'>Game Info</h3>
            <div className='bg-white p-4 rounded-lg shadow'>
              <p>Status: {gameStatus}</p>
              <p>Players: {players.length}/4</p>
              {gameStatus === 'playing' && <p>Current Turn: {players.find((p) => p.id === currentTurn)?.name}</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}