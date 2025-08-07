'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { io } from 'socket.io-client'
import { useAuth } from '@/lib/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

export default function SidebarUsers() {
  const { user, token, loading: authLoading } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])
  const [openChats, setOpenChats] = useState([])
  const [minimizedChats, setMinimizedChats] = useState([])
  const [messages, setMessages] = useState({})
  const [broadcastMessages, setBroadcastMessages] = useState([])
  const [messageInput, setMessageInput] = useState({})
  const [showBroadcastChat, setShowBroadcastChat] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [authError, setAuthError] = useState(null)
  const socketRef = useRef(null)
  const messagesEndRef = useRef({})

  useEffect(() => {
    if (!user || !token) return

    // Initialize socket connection with proper authentication
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: {
        token: token // Send the Firebase auth token
      },
      query: {
        uid: user.uid // Still include UID in query for legacy support if needed
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    // Connection established
    socket.on('connect', () => {
      console.log('Socket connected')
      setSocketConnected(true)
      setAuthError(null)
    })

    // Connection error
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err)
      setSocketConnected(false)
      
      // Specific handling for authentication errors
      if (err.message.includes('Authentication error') || err.message.includes('Unauthorized')) {
        setAuthError('Authentication failed. Please refresh the page.')
      }
    })

    // Disconnected
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setSocketConnected(false)
    })

    // Online users update
    socket.on('onlineUsers', (userIds) => {
      fetchUserDetails(userIds)
    })

    // Private messages
    socket.on('privateMessage', ({ from, message, timestamp }) => {
      setMessages((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { from, message, timestamp }],
      }))
    })

    // Broadcast messages
    socket.on('broadcastMessage', ({ from, username, message, timestamp }) => {
      setBroadcastMessages((prev) => [...prev, { from, username, message, timestamp }])
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect')
        socketRef.current.off('connect_error')
        socketRef.current.off('disconnect')
        socketRef.current.off('onlineUsers')
        socketRef.current.off('privateMessage')
        socketRef.current.off('broadcastMessage')
        socketRef.current.disconnect()
      }
    }
  }, [user, token])

  const fetchUserDetails = async (userIds) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const promises = userIds.map((uid) =>
        axios.get(`${apiUrl}/api/users/${uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      const responses = await Promise.all(promises)
      const users = responses.map((res) => ({
        id: res.data.uid,
        username: res.data.username || 'Unknown',
        role: res.data.role,
      }))
      setOnlineUsers(users.filter((u) => u.id !== user?.uid))
    } catch (err) {
      console.error('Failed to fetch user details:', err)
    }
  }


  const scrollToBottom = (chatId) => {
    messagesEndRef.current[chatId]?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    Object.keys(messages).forEach((chatId) => scrollToBottom(chatId))
    scrollToBottom('broadcast')
  }, [messages, broadcastMessages])

  const toggleChat = (targetUser) => {
    if (openChats.find((chat) => chat.id === targetUser.id)) return
    setOpenChats([...openChats, targetUser])
    setMinimizedChats(minimizedChats.filter((id) => id !== targetUser.id))
    if (!messages[targetUser.id]) {
      setMessages((prev) => ({ ...prev, [targetUser.id]: [] }))
    }
  }

  const closeChat = (id) => {
    setOpenChats(openChats.filter((chat) => chat.id !== id))
    setMinimizedChats(minimizedChats.filter((chatId) => chatId !== id))
    if (id === 'broadcast') setShowBroadcastChat(false)
  }

  const toggleMinimizeChat = (id) => {
    setMinimizedChats((prev) => (prev.includes(id) ? prev.filter((chatId) => chatId !== id) : [...prev, id]))
  }

  const sendPrivateMessage = (targetUserId, e) => {
    e.preventDefault()
    const message = messageInput[targetUserId]?.trim()
    if (message && socketRef.current) {
      socketRef.current.emit('privateMessage', {
        to: targetUserId,
        message,
      })
      setMessages((prev) => ({
        ...prev,
        [targetUserId]: [...(prev[targetUserId] || []), { from: user.uid, message, timestamp: new Date() }],
      }))
      setMessageInput((prev) => ({ ...prev, [targetUserId]: '' }))
    }
  }

  const sendBroadcastMessage = (e) => {
    e.preventDefault()
    const message = messageInput['broadcast']?.trim()
    if (message && socketRef.current) {
      socketRef.current.emit('broadcastMessage', {
        from: user.uid,
        username: user.displayName || user.email.split('@')[0] || 'You',
        message,
      })
      setBroadcastMessages((prev) => [
        ...prev,
        {
          from: user.uid,
          username: user.displayName || user.email.split('@')[0] || 'You',
          message,
          timestamp: new Date(),
        },
      ])
      setMessageInput((prev) => ({ ...prev, broadcast: '' }))
    }
  }

  if (authLoading || !user) return null

  return (
    <>
         <div className='bg-white p-4 rounded-lg shadow-lg w-full max-h-[500px] overflow-y-auto'>
        <div className='flex justify-between items-center mb-3'>
          <h3 className='font-bold text-gray-800 text-base'>
            {socketConnected ? '🟢' : '🔴'} Online Users
          </h3>
          <span
            className='text-xs text-blue-600 font-semibold cursor-pointer hover:underline'
            onClick={() => setShowBroadcastChat((prev) => !prev)}
          >
            Group Chat
          </span>
        </div>
        
        {authError && (
          <div className='text-xs text-red-500 mb-2 p-2 bg-red-50 rounded'>
            {authError}
            <button 
              onClick={() => window.location.reload()}
              className='ml-2 text-blue-600 hover:underline'
            >
              Refresh
            </button>
          </div>
        )}
        
        {!authError && !socketConnected && (
          <div className='text-xs text-yellow-600 mb-2'>
            Connecting to chat service...
          </div>
        )}

        <ul className='space-y-2'>
          <AnimatePresence>
            {onlineUsers.length === 0 ? (
              <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='text-sm text-gray-500'>
                {socketConnected ? 'No users online' : 'Loading...'}
              </motion.li>
            ) : (
              onlineUsers.map((onlineUser) => (
                <motion.li
                  key={onlineUser.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => toggleChat(onlineUser)}
                  className={`flex items-center gap-2 p-2 rounded transition ${
                    socketConnected ? 'cursor-pointer hover:bg-blue-50' : 'opacity-50'
                  }`}
                >
                  <div className='w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center font-bold text-blue-800'>
                    {onlineUser.username[0]?.toUpperCase() || '?'}
                  </div>
                  <span className='text-sm font-medium text-gray-700 truncate'>
                    {onlineUser.username} {onlineUser.role === 'admin' ? '👑' : ''}
                  </span>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </div>

      {/* Private Chat Windows */}
      <div className='fixed bottom-0 right-4 flex gap-2 z-50 flex-wrap'>
        <AnimatePresence>
          {openChats.map((chat) => (
            <motion.div
              key={chat.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className='bg-white w-[300px] shadow-2xl rounded-lg border border-gray-200 flex flex-col'
            >
              <div
                className='flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-t-lg cursor-pointer'
                onClick={() => toggleMinimizeChat(chat.id)}
              >
                <span className='font-semibold truncate'>{chat.username}</span>
                <div className='flex gap-2'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMinimizeChat(chat.id)
                    }}
                    className='hover:bg-blue-700 p-1 rounded'
                  >
                    {minimizedChats.includes(chat.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeChat(chat.id)
                    }}
                    className='hover:bg-blue-700 p-1 rounded'
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              {!minimizedChats.includes(chat.id) && (
                <>
                  <div className='flex-1 p-4 overflow-y-auto bg-gray-50 max-h-[400px]'>
                    {(messages[chat.id] || []).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`mb-3 ${
                          msg.from === user.uid ? 'flex justify-end' : 'flex justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                            msg.from === user.uid
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className='break-words'>{msg.message}</p>
                          <div className='text-xs text-gray-400 mt-1'>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={(el) => (messagesEndRef.current[chat.id] = el)} />
                  </div>
                  <form
                    onSubmit={(e) => sendPrivateMessage(chat.id, e)}
                    className='p-2 border-t flex items-center'
                  >
                    <input
                      type='text'
                      value={messageInput[chat.id] || ''}
                      onChange={(e) => setMessageInput((prev) => ({ ...prev, [chat.id]: e.target.value }))}
                      className='flex-1 text-sm px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                      placeholder='Type a message...'
                    />
                    <button
                      type='submit'
                      className='ml-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700'
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          ))}

          {/* Group (Broadcast) Chat */}
          {showBroadcastChat && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className='bg-white w-[300px] shadow-2xl rounded-lg border border-gray-200 flex flex-col'
            >
              <div
                className='flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-t-lg cursor-pointer'
                onClick={() => toggleMinimizeChat('broadcast')}
              >
                <span className='font-semibold'>Group Chat</span>
                <div className='flex gap-2'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMinimizeChat('broadcast')
                    }}
                    className='hover:bg-blue-700 p-1 rounded'
                  >
                    {minimizedChats.includes('broadcast') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeChat('broadcast')
                    }}
                    className='hover:bg-blue-700 p-1 rounded'
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              {!minimizedChats.includes('broadcast') && (
                <>
                  <div className='flex-1 p-4 overflow-y-auto bg-gray-50 max-h-[400px]'>
                    {broadcastMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`mb-3 ${
                          msg.from === user.uid ? 'flex justify-end' : 'flex justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                            msg.from === user.uid
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className='break-words'>
                            <strong>{msg.from === user.uid ? 'You' : msg.username}</strong>: {msg.message}
                          </p>
                          <div className='text-xs text-gray-400 mt-1'>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={(el) => (messagesEndRef.current['broadcast'] = el)} />
                  </div>
                  <form
                    onSubmit={sendBroadcastMessage}
                    className='p-2 border-t flex items-center'
                  >
                    <input
                      type='text'
                      value={messageInput['broadcast'] || ''}
                      onChange={(e) => setMessageInput((prev) => ({ ...prev, broadcast: e.target.value }))}
                      className='flex-1 text-sm px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                      placeholder='Type a group message...'
                    />
                    <button
                      type='submit'
                      className='ml-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700'
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}