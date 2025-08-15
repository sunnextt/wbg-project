export default function GameCard({ title, description, href, imageUrl }) {
  return (
    <a href={href} className="block">
      <div className="bg-white rounded-lg overflow-hidden shadow hover:shadow-md transition hover:scale-105 transform duration-200 cursor-pointer">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title || "Game image"} 
            className="w-full h-28 object-cover"
          />
        ) : (
          <div className="bg-gradient-to-t from-indigo-200 to-white h-28" />
        )}
        
        <div className="p-3">
          {title && <h3 className="font-medium text-gray-800">{title}</h3>}
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </a>
  );
}