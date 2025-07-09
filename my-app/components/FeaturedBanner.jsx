// components/FeaturedBanner.jsx
export default function FeaturedBanner() {
  return (
    <div className="bg-white shadow-md rounded-xl overflow-hidden flex flex-col md:flex-row">
      <div className="bg-gray-200 flex-1 h-48 md:h-auto" />
      <div className="flex-1 p-6 bg-indigo-500 text-white">
        <div className="mb-2 text-xs font-semibold uppercase bg-pink-500 px-2 py-1 inline-block rounded">Featured Game</div>
        <h2 className="text-xl font-bold">The Grand Ludo Championship</h2>
        <p className="mt-2 text-sm">
          Join the ultimate Ludo tournament and compete for amazing prizes! Fast-paced action and strategic gameplay await.
        </p>
        <p className="mt-2 text-sm">👥 15,342 Players Online</p>
        <button className="mt-4 bg-pink-600 hover:bg-pink-700 px-4 py-2 text-sm rounded-md font-medium">
          ▶ Play Now
        </button>
      </div>
    </div>
  )
}
