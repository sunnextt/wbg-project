'use client'
import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
  
export const useGameStatus = () => {
  const [events, setEvents] = useState([])

  // Add game events to display
  const addGameEvent = useCallback((text, duration = 3000) => {
    const id = Date.now() + Math.random()
    const newEvent = { id, text, duration }
    
    setEvents(prev => [newEvent, ...prev.slice(0, 4)]) // Keep only last 5 events
    
    // Auto-remove after duration
    setTimeout(() => {
      setEvents(prev => prev.filter(event => event.id !== id))
    }, duration)
  }, [])

  // Specific event types
  const diceRolled = useCallback((playerName, value, isSix = false) => {
    const text = `${playerName} rolled ${isSix ? 'a ' : ''}${value}${isSix ? '! 🎉' : ''}`
    addGameEvent(text, isSix ? 4000 : 3000)
    if (isSix) toast.info(`${playerName} rolled a 6! Extra turn!`)
  }, [addGameEvent])

  const noValidMoves = useCallback((playerName) => {
    const text = `${playerName} has no valid moves. Passing turn.`
    addGameEvent(text, 3500)
    toast.info('No valid moves available')
  }, [addGameEvent])

  const needSixToStart = useCallback((playerName) => {

    const text = `${playerName} needs to roll a 6 to bring pawn out`

    addGameEvent(text, 3500)
    toast.info('Roll a 6 to move pawn out of home')
  }, [addGameEvent])

  const turnPassed = useCallback((fromPlayer, toPlayer) => {    
    const text = `Turn passed from ${fromPlayer} to ${toPlayer}`

    addGameEvent(text, 3000)
  }, [addGameEvent])

  const pawnMoved = useCallback((playerName, pawnColor, steps) => {
    const text = `${playerName} moved ${pawnColor} pawn ${steps} steps`
    addGameEvent(text, 3000)
  }, [addGameEvent])

  const pawnCaptured = useCallback((attacker, victim, pawnColor) => {
    const text = `${attacker} captured ${victim}'s ${pawnColor} pawn!`
    addGameEvent(text, 4000)
    toast.info('Capture! Pawn sent back to home')
  }, [addGameEvent])

  const gameStarted = useCallback(() => {
    const text = 'Game started! First player rolls the dice'
    addGameEvent(text, 4000)
  }, [addGameEvent])

  return {
    events,
    addGameEvent,
    diceRolled,
    noValidMoves,
    needSixToStart,
    turnPassed,
    pawnMoved,
    pawnCaptured,
    gameStarted
  }
}
