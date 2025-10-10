'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import 'react-toastify/dist/ReactToastify.css'
import { useSocket } from '@/lib/socket'
import {
  isValidMove,
  checkCaptures,
  checkWinCondition,
  getNextPlayerId,
  areAllPawnsAtHome,
  isSafeSquare,
} from '../utils/ludoUtils'
import { useGameStatus } from '@/lib/GameStatusProvider'

export default function useLudoGameManager(gameId) {
  const { user } = useAuth()
  const socket = useSocket()

  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState(null)
   const [pendingMove, setPendingMove] = useState(null)

  

  const { diceRolled, needSixToStart, turnPassed, pawnMoved, pawnCaptured } = useGameStatus()

  const currentPlayerId = user?.uid || null

  // 🔹 Derived state
  const players = gameState?.players ?? []
  const gameStatus = gameState?.status ?? 'loading'
  const currentTurn = gameState?.currentTurn ?? null
  const currentPlayer = players.find((p) => p.id === currentPlayerId) || null

  // --- Firestore listener ---
  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided')
      return
    }

    const gameRef = doc(db, 'games', gameId)
    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setError('Game not found')
          setGameState(null)
          return
        }

        const data = snapshot.data()

        setGameState((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) {
            return prev
          }
          console.log('🔥 Firestore update received')
          return data
        })
        setError(null)
      },
      (err) => {
        console.error(err)
        setError('Failed to load game')
      },
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
      const nextPlayerId = getNextPlayerId(updatedPlayers, user.uid)
      const nextPlayer = updatedPlayers.find((p) => p.id === nextPlayerId)
      const currentPlayer = updatedPlayers.find((p) => p.id === user.uid)

      await updateDoc(gameRef, {
        currentTurn: nextPlayerId,
        diceValue: 0,
      })

      // Update local state immediately
      setGameState((prev) => ({
        ...prev,
        currentTurn: nextPlayerId,
        diceValue: 0,
      }))

      // Emit socket event for other players
      socket.emit('pass-turn', {
        gameId,
        playerId: user.uid,
        fromPlayer: currentPlayer?.name || 'Current player',
        toPlayer: nextPlayer?.name || 'Next player',
        nextPlayerId: nextPlayerId,
        timestamp: Date.now(),
      })

      // Show notification for local player - you're passing the turn
      turnPassed(currentPlayer?.name || 'Current player', nextPlayer?.name || 'Next player', 'you_passing')
    } catch (error) {
      toast.error('Failed to pass turn')
    }
  }, [gameId, user?.uid, turnPassed, socket])

  const handlePassTurn = useCallback(
    (data) => {
      if (data.playerId !== user?.uid) {
        setGameState((prev) => ({
          ...prev,
          currentTurn: data.nextPlayerId,
          diceValue: 0,
        }))

        let context = 'other'
        if (data.nextPlayerId === user?.uid) {
          context = 'passed_to_you'
        }

        turnPassed(data.fromPlayer, data.toPlayer, context)
      }
    },
    [user?.uid, turnPassed],
  )
  const handleRemoteMove = async (data) => {
    if (data.playerId === user?.uid) return

    const { victimPlayer } = data

    const movingPlayer = players.find((p) => p.id === data.playerId)
    if (movingPlayer) {
      pawnMoved(movingPlayer.name, movingPlayer.color, 'some', false)
    }

    if (victimPlayer) {
      pawnCaptured(movingPlayer.name, victimPlayer.name, victimPlayer.color, false)
    }
  }

 const processDiceRoll = useCallback(
  (diceValue, playerId, isLocalRoll = false) => {
    setGameState((prev) => ({
      ...prev,
      diceValue: diceValue,
      lastAction: {
        type: 'dice_roll',
        value: diceValue,
        playerId: playerId,
        timestamp: isLocalRoll ? new Date() : new Date(Date.now()),
      },
    }))

    // Notify about dice roll
    const rollingPlayer = players.find((p) => p.id === playerId)

    if (rollingPlayer) {
      diceRolled(rollingPlayer.name, diceValue, diceValue === 6, playerId === currentPlayerId)
    }

    // Check for auto-pass conditions - ONLY if dice value is NOT 6
    if (diceValue !== 6 && playerId === currentPlayerId) {
      const currentPlayer = players.find((p) => p.id === currentPlayerId)
      if (currentPlayer) {
        const allAtHome = areAllPawnsAtHome(currentPlayer)

        if (allAtHome) {
          needSixToStart(currentPlayer.name, true)

          // Auto-pass after a delay only if all pawns are at home AND didn't roll a 6
          setTimeout(() => {
            passTurn()
          }, 1000)
        }
      }
    }
  },
  [currentPlayerId, players, diceRolled, needSixToStart, passTurn],
)
  const handleDiceRolled = useCallback(
    (data) => {
      setGameState((prev) => ({
        ...prev,
        diceValue: data.value,
        isRolling: false,
        rollingPlayerId: null,
        lastAction: {
          type: 'dice_roll',
          value: data.value,
          playerId: data.playerId,
          timestamp: serverTimestamp(),
        },
      }))

      // Notify about the dice roll - this is the key fix!
      const rollingPlayer = players.find((p) => p.id === data.playerId)
      if (rollingPlayer) {
        diceRolled(rollingPlayer.name, data.value, data.value === 6, data.playerId === currentPlayerId)
      }
    },
    [players, currentPlayerId, diceRolled],
  )

  const handleMoveError = useCallback(
    (error) => {
      if (pendingMove?.pawnId === error.pawnId) {
        setPendingMove(null)
      }
    },
    [pendingMove],
  )

  const handlePlayerDisconnected = useCallback(
    ({ playerId }) => {
      const playerName = players.find((p) => p.id === playerId)?.name || 'A player'
      toast.error(`${playerName} disconnected`)
    },
    [players],
  )

  useEffect(() => {
    if (!socket || !gameId) return

    socket.emit('join-game', gameId)

    // Add all socket listeners
    socket.on('pass-turn', handlePassTurn)
    socket.on('pawn-move', handleRemoteMove)
    socket.on('dice-rolled', handleDiceRolled)
    socket.on('move-error', handleMoveError)
    socket.on('player-disconnected', handlePlayerDisconnected)

    return () => {
      // Remove all socket listeners
      socket.off('pass-turn', handlePassTurn)
      socket.off('pawn-move', handleRemoteMove)
      socket.off('dice-rolled', handleDiceRolled)
      socket.off('move-error', handleMoveError)
      socket.off('player-disconnected', handlePlayerDisconnected)
      socket.emit('leave-game', gameId)
    }
  }, [socket, gameId, user?.uid, players, pendingMove])

  const processPlayerMove = useCallback((players, playerId, pawnIndex, newPosition) => {
    return players.map((player) => {
      if (player.id !== playerId) return player

      const playerPawns = player.pawns || [
        { position: 'home' },
        { position: 'home' },
        { position: 'home' },
        { position: 'home' },
      ]

      const updatedPawns = playerPawns.map((pawn, index) => {
        if (index === pawnIndex) {
          return { ...pawn, position: newPosition }
        }
        return pawn
      })

      return { ...player, pawns: updatedPawns }
    })
  }, [])

  const processCaptures = useCallback((newPosition, movingPlayerColor, players, currentGameState, pawnCaptured) => {
    let updatedPlayers = players
    let captureCount = 0
    let victimPlayer

    if (typeof newPosition === 'object' && !isSafeSquare(newPosition)) {
      const captures = checkCaptures(newPosition, movingPlayerColor, updatedPlayers)

      if (captures.length > 0) {
        captureCount = captures.length
        updatedPlayers = updatedPlayers.map((player) => {
          const playerCaptures = captures.filter((capture) => capture.playerId === player.id)
          if (playerCaptures.length === 0) return player

          const updatedPlayerPawns = (player.pawns || []).map((pawn, index) => {
            const wasCaptured = playerCaptures.some((capture) => capture.pawnIndex === index)
            return wasCaptured ? { ...pawn, position: 'home' } : pawn
          })

          return { ...player, pawns: updatedPlayerPawns }
        })

        // Notify about captures
        const movingPlayer = currentGameState.players.find((p) => p.color === movingPlayerColor)
        captures.forEach((capture) => {
          victimPlayer = currentGameState.players.find((p) => p.id === capture.playerId)
          if (victimPlayer && movingPlayer) {
            pawnCaptured(movingPlayer.name, victimPlayer.name, victimPlayer.color)
          }
        })
      }
    }

    return { updatedPlayers, captureCount, victimPlayer }
  }, [])

  const makeMove = useCallback(
    async (moveData) => {
      if (!user || !socket) return false

      try {
        let pawnIndex

        // Parse pawn index from moveData
        if (moveData.pawnId) {
          const parts = moveData.pawnId.split('-')
          if (parts.length === 2) {
            pawnIndex = parseInt(parts[1])
          } else {
            throw new Error('Invalid pawnId format: ' + moveData.pawnId)
          }
        } else if (moveData.pawnIndex !== undefined) {
          pawnIndex = parseInt(moveData.pawnIndex)
        } else {
          throw new Error('Either pawnId or pawnIndex is required')
        }

        if (isNaN(pawnIndex) || pawnIndex < 0 || pawnIndex > 3) {
          throw new Error('Invalid pawn index: ' + pawnIndex)
        }

        const gameRef = doc(db, 'games', gameId)
        const gameDoc = await getDoc(gameRef)
        if (!gameDoc.exists()) throw new Error('Game not found')

        const currentGameState = gameDoc.data()
        if (currentGameState.currentTurn !== user.uid) {
          throw new Error('Not your turn!')
        }

        const currentPlayer = currentGameState.players.find((p) => p.id === user.uid)
        if (!currentPlayer) throw new Error('Player not found in game')

        // Ensure pawns array exists
        const currentPawn = (currentPlayer.pawns || [
          { position: 'home' },
          { position: 'home' },
          { position: 'home' },
          { position: 'home' },
        ])[pawnIndex] || { position: 'home' }

        const currentPosition = currentPawn.position

        // Validate move
        const validationResult = isValidMove(
          currentPosition,
          currentGameState.diceValue,
          currentPlayer.color,
          pawnIndex,
        )

        if (!validationResult.isValid) {
          // throw new Error(validationResult.reason || 'Invalid move')
        }

        const newPosition = validationResult.newPos

        // Process the move
        let updatedPlayers = processPlayerMove(currentGameState.players, user.uid, pawnIndex, newPosition)

        // Process captures
        const {
          updatedPlayers: playersAfterCaptures,
          captureCount,
          victimPlayer,
        } = processCaptures(newPosition, currentPlayer.color, updatedPlayers, currentGameState, pawnCaptured)

        updatedPlayers = playersAfterCaptures

        const hasWon = checkWinCondition(updatedPlayers, user.uid)

        const updateData = {
          players: updatedPlayers,
          lastMove: {
            playerId: user.uid,
            action: 'move',
            pawnIndex: pawnIndex,
            newPosition: newPosition,
            timestamp: serverTimestamp(),
          },
          diceValue: 0,
        }

        if (hasWon) {
          updateData.status = 'finished'
          updateData.winner = user.uid
          updateData.finishedAt = serverTimestamp()
        }

        await updateDoc(gameRef, updateData)

        pawnMoved(currentPlayer.name, currentPlayer.color, "some", true)

        // Emit socket event for other players
        socket.emit('pawn-move', {
          gameId,
          playerId: user.uid,
          pawnIndex: pawnIndex,
          newPosition: newPosition,
          timestamp: Date.now(),
          isWin: hasWon,
          captureCount: captureCount,
          victimPlayer,
        })

        // Update local state immediately
        setGameState((prev) => ({
          ...prev,
          players: updatedPlayers,
          diceValue: 0,
          ...(hasWon && { status: 'finished', winner: user.uid }),
        }))


        if (hasWon) {
          toast.success('🎉 You won the game!')
        } else if (captureCount > 0) {
          toast.success(`Captured ${captureCount} opponent pieces!`)
        }

        // Pass turn if needed
        if (!hasWon && currentGameState?.lastAction.value !== 6) {
          setTimeout(() => {
            passTurn()
          }, 1000)
          return
        }

        return true
      } catch (err) {
        console.log("pawn move error", err);

        toast.error(err.message || 'Move failed')
        return false
      }
    },
    [user, socket, gameId, pawnMoved, pawnCaptured, passTurn, processPlayerMove, processCaptures],
  )

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
        let availableColor
        if (gameData.players.length === 0) {
          availableColor = 'green'
        } else if (gameData.players.length === 1) {
          availableColor = 'blue'
        } else {
          const playerColors = ['green', 'red', 'blue', 'yellow']
          availableColor =
            playerColors.find((color) => !gameData.players.some((p) => p.color === color)) || playerColors[0]
        }

        const newPlayer = {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          color: availableColor,
          ready: false,
          position: 0,
          pawns: [{ position: 'home' }, { position: 'home' }, { position: 'home' }, { position: 'home' }],
        }

        transaction.update(gameRef, {
          players: [...gameData.players, newPlayer],
        })
      })

      toast.success('Joined game successfully!')

      return true
    } catch (error) {
      
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
      return false
    }

    try {
      const gameRef = doc(db, 'games', gameId)
      const gameDoc = await getDoc(gameRef)

      if (!gameDoc.exists()) {
        toast.error('Game not found')
        return false
      }

      const gameData = gameDoc.data()

      // Validate game state
      if (gameData.status !== 'waiting') {
        toast.error('Game has already started')
        return false
      }

      if (gameData.players.length < 2) {
        toast.error('Need at least 2 players to start')
        return false
      }

      // Start the game (any player can start)
      await updateDoc(gameRef, {
        status: 'playing',
        currentTurn: gameData.players[0].id, // First player starts
        startedAt: serverTimestamp(),
        diceValue: 0,
        lastMove: null,
      })

      toast.success('Game started!')

      return true
    } catch (error) {
      return false
    }
  }

  const leaveGame = async () => {
    if (!user) {
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
        const playerIndex = gameData.players.findIndex((p) => p.id === user.uid)

        if (playerIndex === -1) {
          throw new Error('You are not in this game')
        }

        // Handle last player leaving
        if (gameData.players.length === 1) {
          transaction.delete(gameRef)
          return
        }

        // Remove player from array
        const updatedPlayers = gameData.players.filter((p) => p.id !== user.uid)

        const updateData = {
          players: updatedPlayers,
        }

        // If game is active, mark as resigned
        if (gameData.status === 'playing') {
          updateData.players = updatedPlayers.map((p) => (p.id === user.uid ? { ...p, resigned: true } : p))

          // Pass turn if it was their turn
          if (gameData.currentTurn === user.uid) {
            updateData.currentTurn = getNextPlayerId(updatedPlayers, user.uid)
          }
        }

        // Transfer creator if needed
        if (gameData.creatorId === user.uid) {
          updateData.creatorId = updatedPlayers[0]?.id || ''
        }

        transaction.update(gameRef, updateData)
      })

      // Notify other players
      socket?.emit('player-left', { gameId, playerId: user.uid })
      toast.success('You have left the game')
      return true
    } catch (error) {
      return false
    }
  }

  const handleDiceRoll = useCallback(
    async (diceValue) => {
      if (!user || !socket || currentTurn !== user.uid) {
        return
      }
      try {
        const gameRef = doc(db, 'games', gameId)
        const gameDoc = await getDoc(gameRef)

        if (!gameDoc.exists()) throw new Error("Game document doesn't exist")
        const gameData = gameDoc.data()

        if (gameData.status !== 'playing') throw new Error('Game is not in playing state')
        if (gameData.currentTurn !== user.uid) throw new Error('Turn changed before roll completed')

        // Update database
        const updateData = {
          diceValue: diceValue,
          isRolling: false,
          rollingPlayerId: null,
          lastAction: {
            type: 'dice_roll',
            value: diceValue,
            playerId: user.uid,
            timestamp: serverTimestamp(),
          },
        }

        await updateDoc(gameRef, updateData)

        // Emit socket event
        socket.emit('dice-rolled', {
          gameId,
          playerId: user.uid,
          value: diceValue,
          timestamp: Date.now(),
        })

        // Process the dice roll locally
        processDiceRoll(diceValue, user.uid, true)
      } catch (error) {
        toast.error('Dice roll failed')
      }
    },
    [user, socket, gameId, currentTurn, processDiceRoll],
  )

  const checkValidMoves = (pawns, diceValue) => {
    if (!Array.isArray(pawns)) {
      return false
    }

    return pawns.some((pawn) => {
      if (pawn.position === 'home') {
        return diceValue === 6
      }
      if (pawn.position === 'finish') {
        return false
      }
      return true
    })
  }

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
    currentPlayer,
    pendingMove,
  }
}
