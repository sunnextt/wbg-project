// utils/testUtils.js
import { BOARD_CONFIG } from './boardConfig';

export const TEST_STATES = {
  // Test 1: Blue pawn about to pass green entry point
  BLUE_BEFORE_GREEN_ENTRY: {
    gameId: 'test-game-1',
    status: 'playing',
    currentTurn: 'blue-player-id',
    diceValue: 4,
    consecutiveSixes: 0,
    players: [
      {
        id: 'blue-player-id',
        name: 'Blue Player',
        color: 'blue',
        ready: true,
        position: 0,
        pawns: [
          { position: 'home' },
          { position: 'home' },
          { position: { x: 2.9302266920758835, y: 0.25300220960256536, z: -2.210504357069572 } }, // Position 49
          { position: 'home' }
        ]
      },
      {
        id: 'green-player-id',
        name: 'Green Player',
        color: 'green',
        ready: true,
        position: 0,
        pawns: [
          { position: 'home' },
          { position: 'home' },
          { position: 'home' },
          { position: 'home' }
        ]
      }
    ]
  },

  // Test 2: Green pawn ready to enter home column
  GREEN_READY_TO_ENTER_HOME: {
    gameId: 'test-game-2',
    status: 'playing',
    currentTurn: 'green-player-id',
    diceValue: 6,
    consecutiveSixes: 0,
    players: [
      {
        id: 'green-player-id',
        name: 'Green Player',
        color: 'green',
        ready: true,
        position: 0,
        pawns: [
          { position: { x: 2.9519952079090754, y: 0.25300166536547664, z: -1.6662914612396171 } }, // Green entry point
          { position: 'home' },
          { position: 'home' },
          { position: 'home' }
        ]
      }
    ]
  },

  // Test 3: Multiple pawns on board with capture opportunity
  CAPTURE_OPPORTUNITY: {
    gameId: 'test-game-3',
    status: 'playing',
    currentTurn: 'red-player-id',
    diceValue: 3,
    consecutiveSixes: 0,
    players: [
      {
        id: 'red-player-id',
        name: 'Red Player',
        color: 'red',
        ready: true,
        position: 0,
        pawns: [
          { position: { x: -1.369055184982756, y: 0.25299849790564, z: 1.5010275924905918 } }, // Red start
          { position: 'home' },
          { position: 'home' },
          { position: 'home' }
        ]
      },
      {
        id: 'blue-player-id',
        name: 'Blue Player',
        color: 'blue',
        ready: true,
        position: 0,
        pawns: [
          { position: { x: -1.369055184982756, y: 0.25299849790564, z: 1.5010275924905918 } }, // Same position as red pawn
          { position: 'home' },
          { position: 'home' },
          { position: 'home' }
        ]
      }
    ]
  },

  // Test 4: Pawn in home column needing exact roll
  EXACT_ROLL_NEEDED: {
    gameId: 'test-game-4',
    status: 'playing',
    currentTurn: 'yellow-player-id',
    diceValue: 5,
    consecutiveSixes: 0,
    players: [
      {
        id: 'yellow-player-id',
        name: 'Yellow Player',
        color: 'yellow',
        ready: true,
        position: 0,
        pawns: [
          { position: { x: -0.8248422891526541, y: 0.2530043647814074, z: -4.365587424556107 } }, // Yellow home position 1
          { position: 'home' },
          { position: 'home' },
          { position: 'home' }
        ]
      }
    ]
  }
};

// Function to load a test state
export const loadTestState = (testKey, gameManager) => {
  const testState = TEST_STATES[testKey];
  if (!testState) {
    console.error('Test state not found:', testKey);
    return false;
  }

  // Update the game manager state
  gameManager.setGameState(testState);
  gameManager.setPlayers(testState.players);
  gameManager.setGameStatus(testState.status);
  gameManager.setCurrentTurn(testState.currentTurn);
  
  console.log('Loaded test state:', testKey, testState);
  return true;
};

// Function to create custom test state
export const createCustomTestState = (customState) => {
  return {
    gameId: customState.gameId || 'custom-test-game',
    status: customState.status || 'playing',
    currentTurn: customState.currentTurn || 'player-1',
    diceValue: customState.diceValue || 0,
    consecutiveSixes: customState.consecutiveSixes || 0,
    players: customState.players || []
  };
};

// Function to validate a game state
export const validateGameState = (gameState) => {
  const errors = [];
  
  if (!gameState.players || !Array.isArray(gameState.players)) {
    errors.push('Players array is missing or invalid');
  }
  
  gameState.players?.forEach((player, index) => {
    if (!player.pawns || !Array.isArray(player.pawns) || player.pawns.length !== 4) {
      errors.push(`Player ${index} has invalid pawns array`);
    }
    
    player.pawns?.forEach((pawn, pawnIndex) => {
      if (pawn.position !== 'home' && pawn.position !== 'finish' && 
          (typeof pawn.position !== 'object' || !pawn.position.x || !pawn.position.y || !pawn.position.z)) {
        errors.push(`Player ${index} pawn ${pawnIndex} has invalid position: ${JSON.stringify(pawn.position)}`);
      }
    });
  });
  
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
};