'use client'
import { io } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

let socket = null

export const useSocket = () => {
  const { token } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return

    if (!socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      let socketUrl = apiUrl
      if (apiUrl.startsWith('https://')) {
        socketUrl = apiUrl.replace('https://', 'wss://')
      } else if (apiUrl.startsWith('http://')) {
        socketUrl = apiUrl.replace('http://', 'ws://')
      }

      console.log('Connecting to:', socketUrl)
      
      socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socket.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
        setError(null)
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        setError(error.message)
        setIsConnected(false)
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

  return { socket, isConnected, error }
}