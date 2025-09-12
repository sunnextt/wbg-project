'use client'
import { createContext, useContext, useState, useCallback } from 'react'
import { toast } from 'react-toastify'

const GameStatusContext = createContext()

export const GameStatusProvider = ({ children }) => {
  const [events, setEvents] = useState([])

  // Add game events to display
  const addGameEvent = useCallback((text, duration = 3000) => {
    const id = Date.now() + Math.random()
    const newEvent = { id, text, duration }

    setEvents((prev) => [newEvent, ...prev.slice(0, 4)])

    setTimeout(() => {
      setEvents((prev) => prev.filter((event) => event.id !== id))
    }, duration)
  }, [])

  const diceRolled = useCallback(
    (playerName, value, isSix = false, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You' : playerName

      if (isSix) {
        if (!isCurrentUser) {
          const text = `${playerText} rolled a 6! Extra turn! 😁`
          addGameEvent(text, 4000)
        } else {
          const text = `${playerText} rolled a ${value}! He get Extra turn😤`
          addGameEvent(text, 3000)
        }
      }
    },
    [addGameEvent],
  )

  const noValidMoves = useCallback(
    (playerName, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You have' : `${playerName} has`
      const text = `${playerText} no valid moves. Passing turn.`
      addGameEvent(text, 9000)
      toast.info('No valid moves available')
    },
    [addGameEvent],
  )

  const needSixToStart = useCallback(
    (playerName, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You need' : `${playerName} needs`
      const text = `${playerText} to roll a 6 to bring a pawn out`
      addGameEvent(text, 3000)
    },
    [addGameEvent],
  )

  const turnPassed = useCallback(
    (fromPlayer, toPlayer, context = 'other') => {
      if (context === 'you_passing') {
        const text = `You passed turn to ${toPlayer}`
        addGameEvent(text, 3000)
      } else if (context === 'passed_to_you') {
        const text = `${fromPlayer} passed turn to you`
        addGameEvent(text, 3000)
      } else {
        const text = `${fromPlayer} passed turn to ${toPlayer}`
        addGameEvent(text, 3000)
      }
    },
    [addGameEvent],
  )

  const pawnMoved = useCallback(
    (playerName, pawnColor, steps, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You moved' : `${playerName} moved`
      const text = `${playerText} ${pawnColor} pawn ${steps} steps`
      addGameEvent(text, 4000)
    },
    [addGameEvent],
  )

  const pawnCaptured = useCallback(
    (attacker, victim, pawnColor, isCurrentUser = false) => {
      if (isCurrentUser) {
        const text = `You captured ${victim}'s ${pawnColor} pawn!`
        addGameEvent(text, 4000)
      } else {
        const text = `${attacker} captured ${victim}'s ${pawnColor} pawn!`
        addGameEvent(text, 4000)
      }
    },
    [addGameEvent],
  )

  const gameStarted = useCallback(() => {
    const text = 'Game started! First player rolls the dice'
    addGameEvent(text, 4000)
  }, [addGameEvent])

  return (
    <GameStatusContext.Provider
      value={{
        events,
        addGameEvent,
        diceRolled,
        noValidMoves,
        needSixToStart,
        turnPassed,
        pawnMoved,
        pawnCaptured,
        gameStarted,
      }}
    >
      {children}
    </GameStatusContext.Provider>
  )
}

export const useGameStatus = () => {
  const context = useContext(GameStatusContext)
  if (!context) {
    throw new Error('useGameStatus must be used within a GameStatusProvider')
  }
  return context
}
