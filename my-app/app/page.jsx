'use client'
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import FeaturedBanner from '@/src/components/FeaturedBanner'
import GameCard from '@/src/components/GameCard'
import LobbyItem from '@/src/components/LobbyItem'
import SidebarFriends from '@/src/components/SidebarUsers'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'


export default function Home() {
  const { user } = useAuth()
  const [lobbies, setLobbies] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch active lobbies
  useEffect(() => {
    const q = query(
      collection(db, 'games'),
      where('status', 'in', ['waiting', 'playing']), 
    )

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const lobbyData = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          if (!['cancelled', 'finished'].includes(data.status)) {
            lobbyData.push({
              id: doc.id,
              ...data,
            })
          }
        })
        setLobbies(lobbyData)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching lobbies:', error)
        toast.error('Failed to load game lobbies')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

const createNewLobby = async () => {
  if (!user) {
    toast.error('You must be logged in to create a lobby')
    return
  }

  try {
    const newLobby = {
      title: `${user.displayName || user.email.split('@')[0]}'s Game`,
      status: 'waiting',
      creatorId: user.uid, 
      players: [
        {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          color: 'green',
          ready: false,
          position: 0,
          pawns: [
            { position: 'home' },
            { position: 'home' },
            { position: 'home' },
            { position: 'home' }
          ]
        },
      ],
      createdAt: serverTimestamp(), 
      gameType: 'ludo',
      currentTurn: null,
      diceValue: 0,
      maxPlayers: 4,
    }

    const docRef = await addDoc(collection(db, 'games'), newLobby)
    toast.success('Lobby created successfully!')
    return docRef.id
  } catch (error) {
    console.error('Error creating lobby:', error)
    toast.error('Failed to create lobby')
    throw error
  }
}

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'


  const games = [
    {
      title: 'Ludo',
      description: 'Classic board game for 2-4 players',
      onClick: '/ludo/new',
      imageUrl: `${apiUrl}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fludo-board.b0ea43c3.webp&w=3840&q=75`,
    },
  ]

  return (
    <main className='bg-gray-50 min-h-screen'>
      <div className='container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6'>
        {/* Left/Main Section */}
        <div className='lg:col-span-9 space-y-6'>
          <FeaturedBanner onClick={createNewLobby} disabled={!user} />

          {/* Explore Games */}
          <section>
            <h2 className='text-lg font-semibold text-gray-700 mb-4'>🎮 Explore Games</h2>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
              {games.map((game, idx) => (
                <GameCard key={idx} {...game} />
              ))}
            </div>
          </section>

          {/* Active Lobbies */}
          <section>
            <h2 className='text-lg font-semibold text-gray-700 mb-4'>🧑‍🤝‍🧑 Active Lobbies</h2>
            {loading ? (
              <div className='space-y-4'>
                {[...Array(2)].map((_, idx) => (
                  <div key={idx} className='h-16 bg-gray-200 rounded-lg animate-pulse'></div>
                ))}
              </div>
            ) : lobbies.length > 0 ? (
              <div className='space-y-4'>
                {lobbies.map((lobby) => (
                  <LobbyItem
                    key={lobby.id}
                    id={lobby.id}
                    status={lobby.status}
                    title={lobby.title || `${lobby.players?.[0]?.name || 'Unknown'}'s Game`}
                    players={`${lobby.players?.length || 0}/${lobby.maxPlayers || 4}`}
                    tag={lobby.gameType || 'Ludo'}
                    creator={lobby.players?.[0]?.name}
                    isPlaying={lobby.status === 'playing'}
                  />
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-gray-500'>No active lobbies found. Create one!</div>
            )}
          </section>
        </div>

        {/* Right Sidebar */}
        <div className='lg:col-span-3 space-y-6'>
          <SidebarFriends />

          {/* <section>
            <h3 className="text-md font-semibold text-gray-700 mb-2">🏆 Top Players</h3>
            <div className="space-y-3">
              <PlayerCard name="Drake" points={125} />
              <PlayerCard name="K.dot" points={118} />
            </div>
            <Link href="/leaderboards" className="text-pink-600 text-sm font-medium mt-2 inline-block">
              View All Leaderboards →
            </Link>
          </section> */}
        </div>
      </div>
    </main>
  )
}
