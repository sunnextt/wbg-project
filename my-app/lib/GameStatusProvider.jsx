'use client'
import { createContext, useContext, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useSocket } from '@/lib/socket'

const GameStatusContext = createContext()

export const GameStatusProvider = ({ children }) => {
  const { socket } = useSocket()
  
  // Queue system to prevent overlapping toasts
  let toastQueue = []
  let isShowingToast = false

  const processQueue = () => {
    if (toastQueue.length > 0 && !isShowingToast) {
      isShowingToast = true
      const { text, duration } = toastQueue.shift()
      
      toast(text, {
        duration,
      })

      setTimeout(() => {
        isShowingToast = false
        processQueue()
      }, duration)
    }
  }

  const addToQueue = (text, duration = 3000) => {
    toastQueue.push({ text, duration })
    processQueue()
  }

  const diceRolled = useCallback(
    (playerName, value, isSix = false, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You' : playerName

      if (isSix) {
        if (isCurrentUser) {
          const text = `${playerText} rolled a 6! Extra turn! 🎉`
          addToQueue(text, 3000)
        } else {
          const text = `${playerText} rolled a 6! Extra turn! 🎲`
          addToQueue(text, 3000)
        }
      } else {
        const text = `${playerText} rolled a ${value}`
        addToQueue(text, 2000)
      }

      // Emit socket event for remote notifications
      if (socket && isCurrentUser) {
        socket.emit('game-notification', {
          type: 'dice_roll',
          playerName,
          value,
          isSix,
          isLocal: false, // For other players, this will be remote
          timestamp: Date.now()
        })
      }
    },
    [socket],
  )

  const noValidMoves = useCallback(
    (playerName, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You have' : `${playerName} has`
      const text = `${playerText} no valid moves. Passing turn. ⏭️`
      addToQueue(text, 3000)

      if (socket && isCurrentUser) {
        socket.emit('game-notification', {
          type: 'no_valid_moves',
          playerName,
          isLocal: false,
          timestamp: Date.now()
        })
      }
    },
    [socket],
  )

  const needSixToStart = useCallback(
    (playerName, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You need' : `${playerName} needs`
      const text = `${playerText} to roll a 6 to bring a pawn out 🎯`
      addToQueue(text, 3000)

      if (socket && isCurrentUser) {
        socket.emit('game-notification', {
          type: 'need_six',
          playerName,
          isLocal: false,
          timestamp: Date.now()
        })
      }
    },
    [socket],
  )

  const turnPassed = useCallback(
    (fromPlayer, toPlayer, context = 'other') => {
      if (context === 'you_passing') {
        const text = `You passed turn to ${toPlayer} 👋`
        addToQueue(text, 3000)
      } else if (context === 'passed_to_you') {
        const text = `${fromPlayer} passed turn to you 🎮`
        addToQueue(text, 3000)
      } else {
        const text = `${fromPlayer} passed turn to ${toPlayer} 🔄`
        addToQueue(text, 3000)
      }

      // Emit socket event when current user is passing turn
      if (socket && context === 'you_passing') {
        socket.emit('game-notification', {
          type: 'turn_passed',
          fromPlayer,
          toPlayer,
          context: 'other', // For other players, this is a regular turn pass
          timestamp: Date.now()
        })
      }
    },
    [socket],
  )

  const pawnMoved = useCallback(
    (playerName, pawnColor, steps, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You moved' : `${playerName} moved`
      const colorEmoji = {
        red: '🔴',
        blue: '🔵',
        green: '🟢',
        yellow: '🟡'
      }[pawnColor] || '⚫'
      
      const text = `${playerText} ${colorEmoji} pawn ${steps} steps ${steps > 1 ? '👣' : '👟'}`
      addToQueue(text, 3000)

      if (socket && isCurrentUser) {
        socket.emit('game-notification', {
          type: 'pawn_moved',
          playerName,
          pawnColor,
          steps,
          isLocal: false,
          timestamp: Date.now()
        })
      }
    },
    [socket],
  )

  const pawnCaptured = useCallback(
    (attacker, victim, pawnColor, isCurrentUser = false) => {
      const colorEmoji = {
        red: '🔴',
        blue: '🔵',
        green: '🟢',
        yellow: '🟡'
      }[pawnColor] || '⚫'
      
      if (isCurrentUser) {
        const text = `You captured ${victim}'s ${colorEmoji} pawn! ⚔️`
        addToQueue(text, 4000)
      } else {
        const text = `${attacker} captured ${victim}'s ${colorEmoji} pawn! 💥`
        addToQueue(text, 4000)
      }

      if (socket && isCurrentUser) {
        socket.emit('game-notification', {
          type: 'pawn_captured',
          attacker,
          victim,
          pawnColor,
          isLocal: false,
          timestamp: Date.now()
        })
      }
    },
    [socket],
  )

  const gameWon = useCallback(
    (playerName, isCurrentUser = false) => {
      if (isCurrentUser) {
        const text = `🎉 Congratulations! You won the game! 🏆`
        addToQueue(text, 5000)
      } else {
        const text = `${playerName} won the game! 👑`
        addToQueue(text, 5000)
      }

      if (socket && isCurrentUser) {
        socket.emit('game-notification', {
          type: 'game_won',
          playerName,
          isLocal: false,
          timestamp: Date.now()
        })
      }
    },
    [socket],
  )

  const customEvent = useCallback(
    (text, duration = 3000) => {
      addToQueue(text, duration)
    },
    [],
  )

  // Handle incoming notifications from socket
  const handleRemoteNotification = useCallback((data) => {
    switch (data.type) {
      case 'dice_roll':
        diceRolled(data.playerName, data.value, data.isSix, false)
        break
      case 'need_six':
        needSixToStart(data.playerName, false)
        break
      case 'turn_passed':
        turnPassed(data.fromPlayer, data.toPlayer, data.context)
        break
      case 'pawn_moved':
        pawnMoved(data.playerName, data.pawnColor, data.steps, false)
        break
      case 'pawn_captured':
        pawnCaptured(data.attacker, data.victim, data.pawnColor, false)
        break
      case 'no_valid_moves':
        noValidMoves(data.playerName, false)
        break
      case 'game_won':
        gameWon(data.playerName, false)
        break
      default:
        break
    }
  }, [diceRolled, needSixToStart, turnPassed, pawnMoved, pawnCaptured, noValidMoves, gameWon])

  // Setup socket listener for notifications
  useEffect(() => {
    if (!socket) return

    socket.on('game-notification', handleRemoteNotification)

    return () => {
      socket.off('game-notification', handleRemoteNotification)
    }
  }, [socket, handleRemoteNotification])

  return (
    <GameStatusContext.Provider
      value={{
        diceRolled,
        noValidMoves,
        needSixToStart,
        turnPassed,
        pawnMoved,
        pawnCaptured,
        gameWon,
        customEvent,
      }}
    >
      {children}
    </GameStatusContext.Provider>
  )
}

export const useGameStatus = () => {
  const context = useContext(GameStatusContext)
  if (!context) {
    throw new Error('useGameStatus context error')
  }
  return context
}