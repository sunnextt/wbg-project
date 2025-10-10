// 'use client'
// import { createContext, useContext, useState, useCallback } from 'react'
// import toast from 'react-hot-toast'

// const GameStatusContext = createContext()

// export const GameStatusProvider = ({ children }) => {
//   const [events, setEvents] = useState([])

//   // Add game events to display
//   const addGameEvent = useCallback((text, duration = 3000) => {
//     const id = Date.now() + Math.random()
//     const newEvent = { id, text, duration }

//     setEvents((prev) => [newEvent, ...prev.slice(0, 4)])

//     setTimeout(() => {
//       setEvents((prev) => prev.filter((event) => event.id !== id))
//     }, duration)
//   }, [])

//   const diceRolled = useCallback(
//     (playerName, value, isSix = false, isCurrentUser = false) => {
//       const playerText = isCurrentUser ? 'You' : playerName

//       if (isSix) {
//         if (isCurrentUser) {
//           const text = `${playerText} rolled a 6! Extra turn! 😁`
//           addGameEvent(text, 4000)
//         } else {
//           const text = `${playerText} rolled a ${value}! He get Extra turn😤`
//           addGameEvent(text, 3000)
//         }
//       }
//     },
//     [addGameEvent],
//   )

//   const noValidMoves = useCallback(
//     (playerName, isCurrentUser = false) => {
//       const playerText = isCurrentUser ? 'You have' : `${playerName} has`
//       const text = `${playerText} no valid moves. Passing turn.`
//       addGameEvent(text, 9000)
//       // toast.info('No valid moves available')
//     },
//     [addGameEvent],
//   )

//   const needSixToStart = useCallback(
//     (playerName, isCurrentUser = false) => {
//       const playerText = isCurrentUser ? 'You need' : `${playerName} needs`
//       const text = `${playerText} to roll a 6 to bring a pawn out`
//       addGameEvent(text, 3000)
//     },
//     [addGameEvent],
//   )

//   const turnPassed = useCallback(
//     (fromPlayer, toPlayer, context = 'other') => {
//       if (context === 'you_passing') {
//         const text = `You passed turn to ${toPlayer}`
//         addGameEvent(text, 3000)
//       } else if (context === 'passed_to_you') {
//         const text = `${fromPlayer} passed turn to you`
//         addGameEvent(text, 3000)
//       } else {
//         const text = `${fromPlayer} passed turn to ${toPlayer}`
//         addGameEvent(text, 3000)
//       }
//     },
//     [addGameEvent],
//   )

//   const pawnMoved = useCallback(
//     (playerName, pawnColor, steps, isCurrentUser = false) => {
//       const playerText = isCurrentUser ? 'You moved' : `${playerName} moved`
//       const text = `${playerText} ${pawnColor} pawn ${steps} steps`
//       addGameEvent(text, 4000)
//     },
//     [addGameEvent],
//   )

//   const pawnCaptured = useCallback(
//     (attacker, victim, pawnColor, isCurrentUser = false) => {
//       if (isCurrentUser) {
//         const text = `You captured ${victim}'s ${pawnColor} pawn!`
//         addGameEvent(text, 4000)
//       } else {
//         const text = `${attacker} captured ${victim}'s ${pawnColor} pawn!`
//         addGameEvent(text, 4000)
//       }
//     },
//     [addGameEvent],
//   )


//   return (
//     <GameStatusContext.Provider
//       value={{
//         events,
//         addGameEvent,
//         diceRolled,
//         noValidMoves,
//         needSixToStart,
//         turnPassed,
//         pawnMoved,
//         pawnCaptured,
//       }}
//     >
//       {children}
//     </GameStatusContext.Provider>
//   )
// }

// export const useGameStatus = () => {
//   const context = useContext(GameStatusContext)
//   if (!context) {
//     throw new Error('useGameStatus must be used within a GameStatusProvider')
//   }
//   return context
// }




'use client'
import { createContext, useContext, useCallback } from 'react'
import toast from 'react-hot-toast'

const GameStatusContext = createContext()

export const GameStatusProvider = ({ children }) => {
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
    },
    [],
  )

  const noValidMoves = useCallback(
    (playerName, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You have' : `${playerName} has`
      const text = `${playerText} no valid moves. Passing turn. ⏭️`
      addToQueue(text, 3000)
    },
    [],
  )

  const needSixToStart = useCallback(
    (playerName, isCurrentUser = false) => {
      const playerText = isCurrentUser ? 'You need' : `${playerName} needs`
      const text = `${playerText} to roll a 6 to bring a pawn out 🎯`
      addToQueue(text, 3000)
    },
    [],
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
    },
    [],
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
    },
    [],
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
    },
    [],
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
    },
    [],
  )

  const customEvent = useCallback(
    (text, duration = 3000) => {
      addToQueue(text, duration)
    },
    [],
  )

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
