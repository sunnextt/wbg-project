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
    
    setEvents(prev => [newEvent, ...prev.slice(0, 4)])
    
    setTimeout(() => {
      setEvents(prev => prev.filter(event => event.id !== id))
    }, duration)
  }, [])

const diceRolled = useCallback((playerName, value, isSix = false) => {
  if (isSix) {
    const text = `${playerName} rolled a 6! Extra turn! 🎉`
    addGameEvent(text, 4000)
  }
}, [addGameEvent])

  const noValidMoves = useCallback((playerName) => {
    const text = `${playerName} has no valid moves. Passing turn.`
    addGameEvent(text, 9000)
    toast.info('No valid moves available')
  }, [addGameEvent])

  const needSixToStart = useCallback((playerName) => {
    const text = `${playerName} needs to roll a 6 to bring pawn out`
    addGameEvent(text, 9000)
  }, [addGameEvent])

  const turnPassed = useCallback((fromPlayer, toPlayer) => {    
    const text = `Turn passed from ${fromPlayer} to ${toPlayer}`
    addGameEvent(text, 9000)
  }, [addGameEvent])

  const pawnMoved = useCallback((playerName, pawnColor, steps) => {
    const text = `${playerName} moved ${pawnColor} pawn ${steps} steps`
    addGameEvent(text, 9000)
  }, [addGameEvent])

  const pawnCaptured = useCallback((attacker, victim, pawnColor) => {
    const text = `${attacker} captured ${victim}'s ${pawnColor} pawn and sent back to home`
    addGameEvent(text, 4000)
  }, [addGameEvent])

  const gameStarted = useCallback(() => {
    const text = 'Game started! First player rolls the dice'
    addGameEvent(text, 4000)
  }, [addGameEvent])

  return (
    <GameStatusContext.Provider value={{
      events,
      addGameEvent,
      diceRolled,
      noValidMoves,
      needSixToStart,
      turnPassed,
      pawnMoved,
      pawnCaptured,
      gameStarted
    }}>
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