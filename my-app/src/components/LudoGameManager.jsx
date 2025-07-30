// components/LudoGameManager.jsx
'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { doc, getDoc, onSnapshot, updateDoc, arrayRemove, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function useLudoGameManager(gameId) {
  const { user } = useAuth()
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const [gameStatus, setGameStatus] = useState('loading') // loading, waiting, playing, finished
  const [currentTurn, setCurrentTurn] = useState(null)
  const [error, setError] = useState(null)

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
      },
    )

    return () => unsubscribe()
  }, [gameId])

  // Join game function
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

        // Validate game state
        if (gameData.status !== 'waiting') {
          throw new Error('Game has already started')
        }

        if (gameData.players.some((p) => p.id === user.uid)) {
          throw new Error('You are already in this game')
        }

        if (gameData.players.length >= 4) {
          throw new Error('Game is full (max 4 players)')
        }

        // Determine available color
        const playerColors = ['red', 'blue', 'green', 'yellow']
        const availableColor =
          playerColors.find((color) => !gameData.players.some((p) => p.color === color)) || playerColors[0]

        // Create new player object
        const newPlayer = {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          color: availableColor,
          ready: false,
          position: 0,
          pawns: Array(4).fill({ position: 'home' }),
        }

        // Update the players array
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

  // Start game function
  const startGame = async () => {
    if (!user) {
      toast.error('You must be logged in to start a game')
      return false
    }

    if (players.length < 2) {
      toast.error('Need at least 2 players to start')
      return false
    }

    if (players[0].id !== user.uid) {
      toast.error('Only the game creator can start the game')
      return false
    }

    try {
      const gameRef = doc(db, 'games', gameId)
      await updateDoc(gameRef, {
        status: 'playing',
        currentTurn: players[0].id, // First player starts
        startedAt: new Date(),
        diceValue: 0,
        lastMove: null,
      })
      toast.success('Game started!')
      return true
    } catch (error) {
      console.error('Error starting game:', error)
      toast.error('Failed to start game')
      return false
    }
  }

  // Leave game function
  const leaveGame = async () => {
    if (!user) return false

    try {
      const gameRef = doc(db, 'games', gameId)
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef)
        if (!gameDoc.exists()) throw new Error('Game does not exist')

        const playerToRemove = gameDoc.data().players.find((p) => p.id === user.uid)
        if (!playerToRemove) throw new Error('You are not in this game')

        if (gameDoc.data().status === 'waiting') {
          transaction.update(gameRef, {
            players: arrayRemove(playerToRemove),
          })
        } else {
          const updatedPlayers = gameDoc.data().players.map((p) => (p.id === user.uid ? { ...p, resigned: true } : p))
          transaction.update(gameRef, {
            players: updatedPlayers,
            currentTurn:
              gameDoc.data().currentTurn === user.uid
                ? getNextPlayerId(gameDoc.data().players, user.uid)
                : gameDoc.data().currentTurn,
          })
        }
      })

      toast.info('You left the game')
      return true
    } catch (error) {
      console.error('Error leaving game:', error)
      toast.error(error.message || 'Failed to leave game')
      return false
    }
  }

  const makeMove = async (moveData) => {
    if (!user || !gameState) return false
    if (gameState.currentTurn !== user.uid) {
      toast.error('Not your turn!')
      return false
    }

    logMove(moveData)

    try {
      const gameRef = doc(db, 'games', gameId)
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef)
        if (!gameDoc.exists()) throw new Error('Game does not exist')
        if (gameDoc.data().status !== 'playing') throw new Error('Game is not in progress')
        if (gameDoc.data().currentTurn !== user.uid) throw new Error('Not your turn')

        const updatedPlayers = processMove(gameDoc.data().players, user.uid, moveData)

        transaction.update(gameRef, {
          players: updatedPlayers,
          currentTurn: getNextPlayerId(updatedPlayers, user.uid),
          lastMove: {
            playerId: user.uid,
            action: moveData.action,
            timestamp: new Date(),
          },
          diceValue: 0,
        })

        if (checkWinCondition(updatedPlayers, user.uid)) {
          transaction.update(gameRef, {
            status: 'finished',
            winner: user.uid,
            finishedAt: new Date(),
          })
        }
      })

      return true
    } catch (error) {
      console.error('Error making move:', error)
      toast.error(error.message || 'Failed to make move')
      return false
    }
  }

  // Helper functions
  const getNextPlayerId = (players, currentPlayerId) => {
    const activePlayers = players.filter((p) => !p.resigned)
    if (activePlayers.length === 0) return null

    const currentIndex = activePlayers.findIndex((p) => p.id === currentPlayerId)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    return activePlayers[nextIndex].id
  }

  const processMove = (players, playerId, moveData) => {
    // Implement your game-specific move logic here
    return players.map((player) => {
      if (player.id !== playerId) return player

      // Example pawn movement logic
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

    // Example win condition: all pawns in finish position
    return player.pawns.every((pawn) => pawn.position === 'finish')
  }

 const handleDiceRoll = async (diceValue) => {
  if (!user || currentTurn !== user.uid) {
    toast.error("It's not your turn to roll!")
    return
  }

  if (typeof diceValue !== 'number' || diceValue < 1 || diceValue > 6) {
    toast.error("Invalid dice roll value")
    console.error("Invalid dice value passed:", diceValue)
    return
  }

  try {
    const gameRef = doc(db, 'games', gameId)

    const gameDoc = await getDoc(gameRef)
    if (!gameDoc.exists()) throw new Error("Game document doesn't exist")

    if (gameDoc.data().status !== 'playing') throw new Error("Game is not in playing state")
    if (gameDoc.data().currentTurn !== user.uid) throw new Error("Turn changed before roll completed")

    await updateDoc(gameRef, {
      diceValue,
      lastAction: {
        type: 'dice_roll',
        value: diceValue,
        playerId: user.uid,
        timestamp: serverTimestamp()
      }
    })

    if (diceValue === 6) {
      toast.success("You rolled a 6! Roll again")
    } else {
      const hasMoves = checkValidMoves(players, user.uid, diceValue)
      if (!hasMoves) await passTurn()
    }
  } catch (error) {
    console.error("Dice roll error details:", {
      error,
      gameId,
      currentTurn,
      userUid: user?.uid,
      diceValue
    })
    toast.error(`Dice roll failed: ${error.message}`)
  }
}


  const checkValidMoves = (players, playerId, diceValue) => {
    const player = players.find((p) => p.id === playerId)
    return player.pawns.some(
      (pawn) =>
        (pawn.position === 'home' && diceValue === 6) || (pawn.position !== 'home' && pawn.position !== 'finish'),
    )
  }

  const passTurn = async () => {
    const gameRef = doc(db, 'games', gameId)
    await updateDoc(gameRef, {
      currentTurn: getNextPlayerId(players, user.uid),
      diceValue: 0,
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
    currentPlayer: players.find((p) => p.id === user?.uid),
  }
}
