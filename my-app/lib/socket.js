// src/lib/socket.js
'use client'
import { io } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

let socket

export const initializeSocket = (token) => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export const getSocket = () => {
  if (!socket) throw new Error('Socket not initialized!')
  return socket
}

export const useSocket = () => {
  const { token } = useAuth()
  const [socketInstance, setSocketInstance] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!token) return

    const socket = initializeSocket(token)

    const onConnect = () => {
      setIsConnected(true)
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    setSocketInstance(socket)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      // Don't disconnect here - we want to maintain the connection
    }
  }, [token])

  return socketInstance
}