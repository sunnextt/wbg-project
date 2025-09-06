import { loadTestState, TEST_STATES } from '@/src/utils/testUtils';
import { useState } from 'react';

export default function TestPanel({ gameManager }) {
  const [selectedTest, setSelectedTest] = useState('');

  const handleLoadTest = () => {
    if (selectedTest && gameManager) {
      loadTestState(selectedTest, gameManager);
    }
  };

  const handleQuickTest = (testKey) => {
    setSelectedTest(testKey);
    loadTestState(testKey, gameManager);
  };

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg z-50">
      <h3 className="text-lg font-bold mb-2">🧪 Test States</h3>
      
      <select 
        value={selectedTest} 
        onChange={(e) => setSelectedTest(e.target.value)}
        className="w-full p-2 bg-gray-700 rounded mb-2"
      >
        <option value="">Select test scenario</option>
        {Object.keys(TEST_STATES).map(key => (
          <option key={key} value={key}>
            {key.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      <button 
        onClick={handleLoadTest}
        disabled={!selectedTest}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-2 rounded mb-2"
      >
        Load Test
      </button>

      <div className="grid grid-cols-1 gap-1">
        <button 
          onClick={() => handleQuickTest('BLUE_BEFORE_GREEN_ENTRY')}
          className="text-xs bg-purple-600 hover:bg-purple-700 p-1 rounded"
        >
          Blue @ Green Entry
        </button>
        <button 
          onClick={() => handleQuickTest('GREEN_READY_TO_ENTER_HOME')}
          className="text-xs bg-green-600 hover:bg-green-700 p-1 rounded"
        >
          Green Enter Home
        </button>
        <button 
          onClick={() => handleQuickTest('CAPTURE_OPPORTUNITY')}
          className="text-xs bg-red-600 hover:bg-red-700 p-1 rounded"
        >
          Capture Test
        </button>
        <button 
          onClick={() => handleQuickTest('EXACT_ROLL_NEEDED')}
          className="text-xs bg-yellow-600 hover:bg-yellow-700 p-1 rounded"
        >
          Exact Roll
        </button>
      </div>
    </div>
  );
}