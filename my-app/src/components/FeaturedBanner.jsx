import Image from 'next/image'
import LudoBoard from '../img/ludo-board.webp'
import Link from 'next/link'

export default function FeaturedBanner({onClick, disabled}) {
  return (
    <div className='bg-white shadow-xl rounded-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-300'>
      <div className='flex-1 p-8 bg-indigo-600 text-white flex flex-col justify-center'>
        <h2 className='text-3xl md:text-4xl font-extrabold mb-4 leading-tight'>🎲 Let the Ludo Battle Begin!</h2>
        <p className='text-md md:text-lg mb-6 opacity-90'>
          Challenge your friends, climb the leaderboard, and enjoy a fresh twist on the timeless Ludo game.
        </p>
        <button
        onClick={onClick}
        disabled={disabled}
          className='bg-white text-indigo-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition text-center'
        >
          Create ludo Lobby
        </button>
      </div>

      <div className='relative md:w-1/2 h-64 md:h-auto'>
        <Image src={LudoBoard} alt='Ludo Game' fill className='object-cover' priority />
      </div>
    </div>
  )
}
