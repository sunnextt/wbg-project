// app/ludo/[gameId]/error.jsx
'use client'
import Link from "next/link"

 

export default function Error({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        {error.message.includes('not found') ? 'Game Not Found' : 'Something went wrong!'}
      </h2>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Try Again
      </button>
      <Link href="/" className="mt-4 text-blue-500">
        Return to Lobby
      </Link>
    </div>
  )
}