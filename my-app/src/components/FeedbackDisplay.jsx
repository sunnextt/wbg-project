'use client'

import { useFeedback } from "@/lib/FeedbackContext"

export default function FeedbackDisplay() {
  const { messages } = useFeedback()

  const getMessageStyle = (type) => {
    const baseStyle = 'px-4 py-3 rounded-lg shadow-lg font-medium text-white transition-all duration-300 max-w-md text-center transform transition-transform duration-300'
    
    switch (type) {
      case 'error':
        return `${baseStyle} bg-red-500 border-l-4 border-red-700`
      case 'success':
        return `${baseStyle} bg-green-500 border-l-4 border-green-700`
      case 'warning':
        return `${baseStyle} bg-yellow-500 border-l-4 border-yellow-700 text-yellow-900`
      case 'info':
        return `${baseStyle} bg-blue-500 border-l-4 border-blue-700`
      default:
        return `${baseStyle} bg-gray-500 border-l-4 border-gray-700`
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'error': return '❌'
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return ''
    }
  }

  if (messages.length === 0) return null

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={getMessageStyle(message.type)}
          style={{
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div className="flex items-center justify-center">
            <span className="text-lg mr-2">{getIcon(message.type)}</span>
            <span>{message.text}</span>
          </div>
        </div>
      ))}
    </div>
  )
}