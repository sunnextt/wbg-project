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
  const [usernameMap, setUsernameMap] = useState({}) // Map uid to username
  const socketRef = useRef(null)
  const messagesEndRef = useRef({})

  // Initialize Socket.IO
  useEffect(() => {
    if (user && token) {
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        query: { uid: user.uid },
      })

      socketRef.current.on('onlineUsers', (userIds) => {
        fetchUserDetails(userIds)
      })

      socketRef.current.on('privateMessage', ({ from, message, timestamp }) => {
        setMessages((prev) => ({
          ...prev,
          [from]: [...(prev[from] || []), { from, message, timestamp }],
        }))
      })

      socketRef.current.on('broadcastMessage', ({ from, username, message, timestamp }) => {
        setBroadcastMessages((prev) => [...prev, { from, username, message, timestamp }])
      })

      return () => {
        socketRef.current.disconnect()
      }
    }
  }, [user, token])

  // Fetch user details and build username map
  const fetchUserDetails = async (userIds) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const promises = userIds.map((uid) =>
        axios.get(`${apiUrl}/api/users/${uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      const responses = await Promise.all(promises)
      const users = responses.map((res) => ({
        id: res.data.uid,
        username: res.data.username || 'Unknown',
        role: res.data.role,
      }))
      const newUsernameMap = responses.reduce(
        (acc, res) => ({
          ...acc,
          [res.data.uid]: res.data.username || 'Unknown',
        }),
        {},
      )
      setUsernameMap((prev) => ({ ...prev, ...newUsernameMap }))
      setOnlineUsers(users.filter((u) => u.id !== user?.uid))
    } catch (err) {
      console.error('Failed to fetch user details:', err)
    }
  }

  // Scroll to bottom of chat
  const scrollToBottom = (chatId) => {
    messagesEndRef.current[chatId]?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    Object.keys(messages).forEach((chatId) => scrollToBottom(chatId))
    scrollToBottom('broadcast')
  }, [messages, broadcastMessages])

  // Toggle private chat
  const toggleChat = (targetUser) => {
    if (openChats.find((chat) => chat.id === targetUser.id)) return
    setOpenChats([...openChats, targetUser])
    setMinimizedChats(minimizedChats.filter((id) => id !== targetUser.id))
    if (!messages[targetUser.id]) {
      setMessages((prev) => ({ ...prev, [targetUser.id]: [] }))
    }
  }

  // Close chat
  const closeChat = (id) => {
    setOpenChats(openChats.filter((chat) => chat.id !== id))
    setMinimizedChats(minimizedChats.filter((chatId) => chatId !== id))
  }

  // Toggle minimize/maximize chat
  const toggleMinimizeChat = (id) => {
    setMinimizedChats((prev) => (prev.includes(id) ? prev.filter((chatId) => chatId !== id) : [...prev, id]))
  }

  // Send private message
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

  // Send broadcast message
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

  if (authLoading || !user) {
    return null
  }

  return (
    <>
      <div className='bg-white p-4 rounded-lg shadow w-full max-h-[500px] overflow-y-auto'>
        <div className='flex justify-between items-center mb-3'>
          <h3 className='font-bold text-gray-800 text-base'>🟢 Online Users</h3>
          <span className='text-xs text-blue-600 font-semibold'>Chat</span>
        </div>
        <ul className='space-y-2'>
          <AnimatePresence>
            {onlineUsers.length === 0 ? (
              <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='text-sm text-gray-500'>
                No users online
              </motion.li>
            ) : (
              onlineUsers.map((onlineUser) => (
                <motion.li
                  key={onlineUser.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => toggleChat(onlineUser)}
                  className='flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded transition'
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

      {/* Chat Windows */}
      <div className='fixed bottom-0 right-4 flex gap-2 z-50 flex-wrap'>
        <AnimatePresence>
          {openChats.map((chat, index) => (
            <motion.div
              key={chat.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className='bg-white w-full sm:w-72 md:w-80 shadow-2xl rounded-t-lg border border-gray-200 flex flex-col mb-2'
              style={{ maxWidth: 'calc(100vw - 32px)' }}
            >
              <div
                className='flex items-center justify-between bg-blue-600 text-white px-4 py-2 rounded-t-lg cursor-pointer'
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
                    aria-label={`Minimize chat with ${chat.username}`}
                  >
                    {minimizedChats.includes(chat.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeChat(chat.id)
                    }}
                    className='hover:bg-blue-700 p-1 rounded'
                    aria-label='Close chat'
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              {!minimizedChats.includes(chat.id) && (
                <>
                  <div className='flex-1 p-3 overflow-y-auto text-sm bg-gray-50 max-h-[400px]'>
                    {(messages[chat.id] || []).map((msg, idx) => (
                      <div key={idx} className={`mb-3 flex ${msg.from === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] p-2 rounded-lg ${
                            msg.from === user.uid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {msg.message}
                          <div className='text-xs text-gray-400 mt-1'>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={(el) => (messagesEndRef.current[chat.id] = el)} />
                  </div>
                  <form onSubmit={(e) => sendPrivateMessage(chat.id, e)} className='p-2 border-t bg-white'>
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        value={messageInput[chat.id] || ''}
                        onChange={(e) => setMessageInput((prev) => ({ ...prev, [chat.id]: e.target.value }))}
                        className='flex-1 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='Type a message...'
                        aria-label={`Message to ${chat.username}`}
                      />
                      <button
                        type='submit'
                        className='bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700'
                        aria-label='Send message'
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          ))}
          {/* Broadcast Chat */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className='bg-white w-full sm:w-72 md:w-80 shadow-2xl rounded-t-lg border border-gray-200 flex flex-col mb-2'
            style={{ maxWidth: 'calc(100vw - 32px)' }}
          >
            <div
              className='flex items-center justify-between bg-blue-600 text-white px-4 py-2 rounded-t-lg cursor-pointer'
              onClick={() => toggleMinimizeChat('broadcast')}
            >
              <span className='font-semibold'>Group Chat</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMinimizeChat('broadcast')
                }}
                className='hover:bg-blue-700 p-1 rounded'
                aria-label='Minimize group chat'
              >
                {minimizedChats.includes('broadcast') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            {!minimizedChats.includes('broadcast') && (
              <>
                <div className='flex-1 p-3 overflow-y-auto text-sm bg-gray-50 max-h-[400px]'>
                  {broadcastMessages.map((msg, idx) => (
                    <div key={idx} className={`mb-3 flex ${msg.from === user.uid ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] p-2 rounded-lg ${
                          msg.from === user.uid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <strong>{msg.from === user.uid ? 'You' : msg.username}</strong>: {msg.message}
                        <div className='text-xs text-gray-400 mt-1'>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={(el) => (messagesEndRef.current['broadcast'] = el)} />
                </div>
                <form onSubmit={sendBroadcastMessage} className='p-2 border-t bg-white'>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={messageInput['broadcast'] || ''}
                      onChange={(e) => setMessageInput((prev) => ({ ...prev, broadcast: e.target.value }))}
                      className='flex-1 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                      placeholder='Type a group message...'
                      aria-label='Group chat message'
                    />
                    <button
                      type='submit'
                      className='bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700'
                      aria-label='Send group message'
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
