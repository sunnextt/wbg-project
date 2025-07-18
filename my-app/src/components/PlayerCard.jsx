// components/PlayerCard.jsx
export default function PlayerCard({ name, points }) {
  return (
    <div className="bg-gray-100 px-3 py-2 rounded-md flex justify-between text-sm">
      <span className="font-medium">{name}</span>
      <span className="text-gray-600">{points} pts</span>
    </div>
  )
}
