'use client'
import { io } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

let socket = null

export const useSocket = () => {
  const { token } = useAuth()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!token) return

    // Create socket if it doesn't exist
    if (!socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      // Determine proper WebSocket protocol
      let socketUrl = apiUrl
      if (apiUrl.startsWith('https://')) {
        socketUrl = apiUrl.replace('https://', 'wss://')
      } else if (apiUrl.startsWith('http://')) {
        socketUrl = apiUrl.replace('http://', 'ws://')
      }

      console.log('Connecting to:', socketUrl)
      
      socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket']
      })

      socket.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
      })
    }

    // Cleanup
    return () => {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connect_error')
      }
    }
  }, [token])

  return socket
}