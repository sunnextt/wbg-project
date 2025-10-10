// app/ludo/new/page.jsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function NewLudoGame() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    const createGame = async () => {
      const newGame = {
        title: `${user.displayName || user.email.split('@')[0]}'s Game`,
        status: 'waiting',
        players: [{
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          color: 'green',
          ready: false
        }],
        createdAt: new Date(),
        gameType: 'ludo'
      }

      const docRef = await addDoc(collection(db, 'games'), newGame)
      router.push(`/ludo/${docRef.id}`)
    }

    createGame()
  }, [user, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Creating new game...</p>
    </div>
  )
}