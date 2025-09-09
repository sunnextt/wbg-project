'use client'
import { useGameStatus } from '@/lib/GameStatusProvider';
import { useEffect } from 'react'

export default function GameStatusDisplay() {
  const { events } = useGameStatus()

  if (events.length === 0) return null

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40 space-y-2 pointer-events-none">
      {events.map((event, index) => (
        <div
          key={event.id}
          className="px-4 py-3 rounded-xl bg-gray-900/90 backdrop-blur-sm text-white font-medium 
                     shadow-2xl border-l-4 border-blue-500 transition-all duration-300 transform"
          style={{
            animation: 'slideInDown 0.3s ease-out',
            transform: `translateY(${index * 10}px) scale(${1 - index * 0.05})`,
            opacity: 1 - index * 0.2,
            zIndex: 50 - index
          }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm">{event.text}</span>
          </div>
        </div>
      ))}
    </div>
  )
}