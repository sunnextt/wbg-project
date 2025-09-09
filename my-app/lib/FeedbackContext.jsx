'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'

const FeedbackContext = createContext()

export function FeedbackProvider({ children }) {
  const [messages, setMessages] = useState([])

  const addMessage = useCallback((text, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    const newMessage = { id, text, type, duration }
    
    setMessages(prev => [...prev, newMessage])
    
    if (duration > 0) {
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const showError = useCallback((text, duration = 4000) => {
    return addMessage(text, 'error', duration)
  }, [addMessage])

  const showSuccess = useCallback((text, duration = 3000) => {
    return addMessage(text, 'success', duration)
  }, [addMessage])

  const showInfo = useCallback((text, duration = 3000) => {
    return addMessage(text, 'info', duration)
  }, [addMessage])

  const showWarning = useCallback((text, duration = 3500) => {
    return addMessage(text, 'warning', duration)
  }, [addMessage])

  const value = {
    messages,
    addMessage,
    removeMessage,
    clearMessages,
    showError,
    showSuccess,
    showInfo,
    showWarning
  }

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  )
}

export const useFeedback = () => {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return context
}