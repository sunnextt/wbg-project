'use client'

import { useState, useEffect, useCallback } from 'react'

export const usePathRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [positions, setPositions] = useState([])

  const startRecording = () => setIsRecording(true)
  const stopRecording = () => setIsRecording(false)
  const clearPositions = () => setPositions([])

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

  return {
    isRecording,
    positions,
    startRecording,
    stopRecording,
    clearPositions,
    exportPositions,
    setPositions
  }
}

export const PathRecorderUI = ({ recorder }) => {
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      left: '10px', 
      background: 'rgba(0,0,0,0.9)', 
      color: 'white',
      padding: '15px', 
      borderRadius: '8px',
      zIndex: 10000,
      fontFamily: 'Arial, sans-serif',
      minWidth: '250px'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>🎯 Path Recorder</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}
          style={{
            padding: '10px 15px',
            background: recorder.isRecording ? '#ff4444' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {recorder.isRecording ? '⏹️ Stop' : '⏺️ Start'}
        </button>
        
        <button
          onClick={recorder.clearPositions}
          disabled={recorder.positions.length === 0}
          style={{
            padding: '10px 15px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: recorder.positions.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          🗑️ Clear
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Positions recorded: {recorder.positions.length}</strong>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => console.log('Positions:', recorder.positions)}
          disabled={recorder.positions.length === 0}
          style={{
            padding: '8px 12px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: recorder.positions.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          📋 Log to Console
        </button>

        <button
          onClick={recorder.exportPositions}
          disabled={recorder.positions.length === 0}
          style={{
            padding: '8px 12px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: recorder.positions.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          💾 Export JSON
        </button>
      </div>

      {recorder.isRecording && (
        <div style={{ 
          marginTop: '15px', 
          padding: '8px',
          background: 'rgba(255,0,0,0.2)',
          borderRadius: '3px',
          fontSize: '12px',
          color: '#ff6b6b'
        }}>
          ⚡ Click anywhere on the game board to record positions
        </div>  
      )}
    </div>
  )
}