'use client'

import PlayerCard from '@/src/components/PlayerCard'
import SidebarFriends from '@/src/components/SidebarUsers'
import LudoCanvas from '@/src/components/ludo/LudoCanvas'

export default function LudoGamePage() {
  return (
    <main className="bg-green-50 min-h-screen">
      <div className="container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9 flex justify-center items-center">
          <LudoCanvas />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <SidebarFriends />

          <section>
            <h3 className="text-md font-semibold text-gray-700 mb-2">🏆 Top Players</h3>
            <div className="space-y-3">
              <PlayerCard name="Drake" points={125} />
              <PlayerCard name="K.dot" points={118} />
            </div>
            <a
              href="#"
              className="text-pink-600 text-sm font-medium mt-2 inline-block"
            >
              View All Leaderboards →
            </a>
          </section>
        </div>
      </div>
    </main>
  )
}
