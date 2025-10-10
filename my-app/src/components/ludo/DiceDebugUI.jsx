"use client";

export function DiceDebugUI({ 
  onTestRotation, 
  onDetectFace, 
  onAutoCycle, 
  onFindValues34,
  onTestAllValues,  // Add this prop
  debugInfo 
}) {
  const rotationPresets = [
    { name: "1 on top", value: 1, rotation: [0, 0, 0] },
    { name: "2 on top", value: 2, rotation: [Math.PI/2, 0, 0] },
    { name: "3 on top", value: 3, rotation: [0, 0, Math.PI/2] },
    { name: "4 on top", value: 4, rotation: [0, 0, -Math.PI/2] },
    { name: "5 on top", value: 5, rotation: [-Math.PI/2, 0, 0] },
    { name: "6 on top", value: 6, rotation: [Math.PI, 0, 0] },
  ];

  return (
    <div className="absolute top-20 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-50 max-w-xs font-mono">
      <h3 className="text-lg font-bold mb-2">🎲 Dice Debug Mode</h3>
      <p className="text-sm mb-3">{debugInfo}</p>
      
      <div className="mb-3">
        <strong className="text-sm block mb-1">Test Rotations:</strong>
        <div className="flex flex-wrap gap-1">
          {rotationPresets.map((preset, index) => (
            <button
              key={index}
              onClick={() => onTestRotation(preset.rotation, preset.name)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded border-none cursor-pointer hover:bg-blue-700 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onDetectFace}
          className="px-3 py-1 bg-green-600 text-white text-xs rounded border-none cursor-pointer hover:bg-green-700 transition-colors"
        >
          Detect Face
        </button>

        <button
          onClick={onAutoCycle}
          className="px-3 py-1 bg-yellow-500 text-black text-xs rounded border-none cursor-pointer hover:bg-yellow-600 transition-colors"
        >
          Auto Cycle
        </button>

        <button
          onClick={onFindValues34}
          className="px-3 py-1 bg-purple-600 text-white text-xs rounded border-none cursor-pointer hover:bg-purple-700 transition-colors"
        >
          Find 3 & 4
        </button>

        <button
          onClick={onTestAllValues}
          className="px-3 py-1 bg-orange-600 text-white text-xs rounded border-none cursor-pointer hover:bg-orange-700 transition-colors"
        >
          Test All Values
        </button>
      </div>
    </div>
  );
}