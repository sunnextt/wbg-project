'use client'

import { useEffect, useRef } from 'react'

export const ClickPositionLogger = ({ onPositionRecord, isActive }) => {
  const clickCount = useRef(0)

  useEffect(() => {
    if (!isActive) return

    const handleClick = (event) => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return

      // Get canvas position and size
      const rect = canvas.getBoundingClientRect()
      
      // Calculate normalized coordinates (-1 to 1)
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1

      clickCount.current += 1
      
      // Convert to game coordinates using accurate board dimensions
      const gameX = (mouseX * 3.063) - 0.843   // (width/2) + center offset
      const gameY = 0.253                      // Fixed height
      const gameZ = (mouseY * 3.0735) - 1.7035 // (depth/2) + center offset

      const position = [gameX, gameY, gameZ]
      
      console.log(`Click ${clickCount.current}:`, {
        screen: { x: event.clientX, y: event.clientY },
        normalized: { x: mouseX, y: mouseY },
        game: position,
        boardInfo: {
          center: [-0.843, 0.253, -1.7035],
          width: 6.126,
          depth: 6.147,
          boundaries: {
            xMin: -3.906,
            xMax: 2.220,
            zMin: -4.777,
            zMax: 1.370
          }
        }
      })

      if (onPositionRecord) {
        onPositionRecord(position)
      }
    }

    // Add click listener to the entire document
    document.addEventListener('click', handleClick)
    
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [isActive, onPositionRecord])

  return null
}

// Alternative: Component with visual debugging
export const VisualClickPositionLogger = ({ isActive, onPositionRecord }) => {
  const debugRef = useRef()

  useEffect(() => {
    if (!isActive) return

    const handleClick = (event) => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Convert to game coordinates
      const gameX = (mouseX * 3.063) - 0.843
      const gameZ = (mouseY * 3.0735) - 1.7035
      const position = [gameX, 0.253, gameZ]

      // Create visual debug element
      const debugDot = document.createElement('div')
      debugDot.style.position = 'absolute'
      debugDot.style.left = `${event.clientX}px`
      debugDot.style.top = `${event.clientY}px`
      debugDot.style.width = '8px'
      debugDot.style.height = '8px'
      debugDot.style.background = 'red'
      debugDot.style.borderRadius = '50%'
      debugDot.style.zIndex = '10000'
      debugDot.style.pointerEvents = 'none'
      debugDot.innerHTML = `<span style="position:absolute;left:10px;top:10px;background:black;color:white;padding:2px;font-size:10px;">${position[0].toFixed(2)}, ${position[2].toFixed(2)}</span>`
      
      document.body.appendChild(debugDot)
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (debugDot.parentNode) {
          debugDot.parentNode.removeChild(debugDot)
        }
      }, 3000)

      if (onPositionRecord) {
        onPositionRecord(position)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isActive, onPositionRecord])

  return null
}

// Utility function for manual conversion
export const convertScreenToGamePosition = (clientX, clientY) => {
  const canvas = document.querySelector('canvas')
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1
  const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1

  const gameX = (mouseX * 3.063) - 0.843
  const gameZ = (mouseY * 3.0735) - 1.7035
  
  return [gameX, 0.253, gameZ]
}

// Utility function to check if position is within board bounds
export const isWithinBoardBounds = (position) => {
  const [x, y, z] = position
  return (
    x >= -3.906 && x <= 2.220 &&
    z >= -4.777 && z <= 1.370 &&
    y === 0.253
  )
}

// Enhanced version with boundary checking
export const AccurateClickPositionLogger = ({ onPositionRecord, isActive }) => {
  useEffect(() => {
    if (!isActive) return

    const handleClick = (event) => {
      const position = convertScreenToGamePosition(event.clientX, event.clientY)
      if (!position) return

      if (isWithinBoardBounds(position)) {
        console.log('✅ Position within board bounds:', position)
        if (onPositionRecord) {
          onPositionRecord(position)
        }
      } else {
        console.log('❌ Position outside board bounds:', position)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [isActive, onPositionRecord])

  return null
}