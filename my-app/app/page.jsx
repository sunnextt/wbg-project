// app/page.jsx
import FeaturedBanner from 'src/components/FeaturedBanner'
import GameCard from 'src/components/GameCard'
import LobbyItem from 'src/components/LobbyItem'
import PlayerCard from 'src/components/PlayerCard'
import SidebarFriends from 'src/components/SidebarUsers'

import Link from 'next/link';



export default function Home() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Section */}
        <div className="lg:col-span-9 space-y-6">
          <FeaturedBanner />
          {/* Explore Games */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">🎮 Explore Games</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, idx) => (
                <GameCard key={idx} />
              ))}
            </div>
          </section>

          {/* Active Lobbies */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">🧑‍🤝‍🧑 Active Lobbies</h2>
            <div className="space-y-4">
              <LobbyItem title="Ludo Frenzy" players="3/4" tag="Ludo" />
              <LobbyItem title="Quiz Masters" players="7/10" tag="Trivia Quiz" />
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <SidebarFriends />

          <section>
            <h3 className="text-md font-semibold text-gray-700 mb-2">🏆 Top Players</h3>
            <div className="space-y-3">
              <PlayerCard name="Drake" points={125} />
              <PlayerCard name="K.dot" points={118} />
            </div>
            <a href="#" className="text-pink-600 text-sm font-medium mt-2 inline-block">View All Leaderboards →</a>
          </section>

        </div>
      </div>
    </main>
  )
}
