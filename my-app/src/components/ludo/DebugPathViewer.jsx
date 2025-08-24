'use client'

import { useState, useCallback } from 'react'

const useDebugPathViewer = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [positions, setPositions] = useState([])

  const exportPositions = useCallback(() => {
    const data = JSON.stringify(positions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ludo_path_positions.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [positions])

  const clearPositions = useCallback(() => {
    setPositions([])
  }, [])

  const recordPosition = useCallback((position) => {
    if (isRecording) {
      setPositions(prev => [...prev, position])
      console.log('Position recorded:', position)
    }
  }, [isRecording])

  return {
    isRecording,
    setIsRecording,
    positions,
    recordPosition,
    exportPositions,
    clearPositions
  }
}

export default useDebugPathViewer