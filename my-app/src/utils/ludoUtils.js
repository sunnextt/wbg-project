// utils/ludoUtils.js
import { BOARD_CONFIG } from './boardConfig';

export const positionsEqual = (pos1, pos2) => {
  if (pos1 === pos2) return true;
  if (typeof pos1 !== 'object' || typeof pos2 !== 'object') return false;
  
  return Math.abs(pos1.x - pos2.x) < 0.01 &&
         Math.abs(pos1.y - pos2.y) < 0.01 &&
         Math.abs(pos1.z - pos2.z) < 0.01;
};

export const isInHomeColumn = (position, color) => {
  return BOARD_CONFIG.homeColumns[color].some(homePos => 
    positionsEqual(homePos, position)
  );
};

export const isAtEntryPoint = (position, color) => {
  return positionsEqual(BOARD_CONFIG.entryPositions[color], position);
};

export const isStartPosition = (position, color) => {
  return positionsEqual(BOARD_CONFIG.startPositions[color], position);
};

export const isSafeSquare = (position) => {
  // All start positions, entry points, and home columns are safe
  const safeSquares = [
    ...Object.values(BOARD_CONFIG.startPositions),
    ...Object.values(BOARD_CONFIG.entryPositions),
    ...Object.values(BOARD_CONFIG.homeColumns).flat()
  ];
  
  return safeSquares.some(safePos => positionsEqual(safePos, position));
};

export const calculateNewPosition = (currentPosition, diceValue, color, pawnIndex) => {
  const { mainTrack, homeColumns, entryPositions, finalPositions, startPositions } = BOARD_CONFIG;

  // === 1. Handle Home and Finish ===
  if (currentPosition === 'home') {
    return diceValue === 6 ? startPositions[color] : 'home';
  }

  if (currentPosition === 'finish') {
    return 'finish';
  }

  // === 2. Inside Home Column ===
const currentHomeIndex = homeColumns[color].findIndex(pos =>
  positionsEqual(pos, currentPosition)
);

if (currentHomeIndex !== -1) {
  const newHomeIndex = currentHomeIndex + diceValue;

  if (newHomeIndex < homeColumns[color].length) {
    return homeColumns[color][newHomeIndex];
  }

  // Reached or exceeded the end
  if (newHomeIndex === homeColumns[color].length) {
    return finalPositions[color][pawnIndex];
  }

  // Overshoot → stay
  return currentPosition;
}

// === 3. At Entry Position ===
if (positionsEqual(currentPosition, entryPositions[color])) {
  if (diceValue < homeColumns[color].length) {
    return homeColumns[color][diceValue - 1];
  }

  if (diceValue === homeColumns[color].length) {
    return finalPositions[color][pawnIndex];
  }

  // Overshoot → stay at entry
  return currentPosition;
}

  // === 4. On Main Track ===
  const currentTrackIndex = mainTrack.findIndex(pos =>
    positionsEqual(pos, currentPosition)
  );
  if (currentTrackIndex === -1) {
    return currentPosition; 
  }

  const totalPositions = mainTrack.length;
  const newTrackIndex = (currentTrackIndex + diceValue) % totalPositions;
  const entryIndex = mainTrack.findIndex(pos =>
    positionsEqual(pos, entryPositions[color])
  );

  // Landed exactly on entry point
  if (positionsEqual(mainTrack[newTrackIndex], entryPositions[color])) {
    return entryPositions[color];
  }

  // Passed entry point? → try entering home
  const shouldEnter = shouldEnterHomeColumn(currentTrackIndex, newTrackIndex, entryIndex, totalPositions);
  if (shouldEnter) {
    const stepsPastEntry = calculateStepsPastEntry(currentTrackIndex, newTrackIndex, entryIndex, totalPositions);

    if (stepsPastEntry < homeColumns[color].length) {
      return homeColumns[color][stepsPastEntry];
    }

    if (stepsPastEntry === homeColumns[color].length) {
      return finalPositions[color][pawnIndex];
    }

    // Overshoot → stay put
    return currentPosition;
  }

  // Normal track move
  return mainTrack[newTrackIndex];
};

// === Helpers ===
const shouldEnterHomeColumn = (currentIndex, newIndex, entryIndex, totalPositions) => {
  if (currentIndex <= entryIndex) {
    return newIndex > entryIndex;
  } else {
    return newIndex < currentIndex && newIndex > entryIndex;
  }
};

const calculateStepsPastEntry = (currentIndex, newIndex, entryIndex, totalPositions) => {
  if (currentIndex <= entryIndex) {
    return newIndex - entryIndex;
  } else {
    return (totalPositions - currentIndex) + newIndex - entryIndex;
  }
};


export const isValidMove = (currentPosition, newPosition, diceValue, color, pawnIndex) => {
  if (diceValue === 0) {
    return { isValid: false, reason: 'no_dice_roll' };
  }

  if (currentPosition === 'home' && diceValue !== 6) {
    return { isValid: false, reason: 'need_six_to_leave_home' };
  }

  if (currentPosition === 'finish') {
    return { isValid: false, reason: 'pawn_already_finished' };
  }

  if (JSON.stringify(currentPosition) === JSON.stringify(newPosition)) {
        console.log('Positions are identical!', currentPosition, newPosition);

    return { isValid: false, reason: 'no_position_change' };
  }

  // Check for exact roll needed in home column
  if (isInHomeColumn(currentPosition, color)) {
    const homeColumn = BOARD_CONFIG.homeColumns[color];
    const currentIndex = homeColumn.findIndex(pos => 
      positionsEqual(pos, currentPosition)
    );
    
    if (currentIndex !== -1) {
      const requiredMove = homeColumn.length - currentIndex;
      if (diceValue > requiredMove) {
        return { isValid: false, reason: 'exact_roll_needed' };
      }
    }
  }

  // Check for exact roll needed to enter home column from entry point
  if (isAtEntryPoint(currentPosition, color) && diceValue > BOARD_CONFIG.homeColumns[color].length + 2) {
    return { isValid: false, reason: 'exact_roll_needed' };
  }

  return { isValid: true, reason: 'valid_move' };
};

export const checkCaptures = (position, currentPlayerColor, allPlayers) => {
  const captured = [];
  
  if (isSafeSquare(position)) {
    return captured; // No captures on safe squares
  }
  
  allPlayers.forEach(player => {
    if (player.color !== currentPlayerColor && !player.resigned) {
      player.pawns.forEach((pawn, pawnIndex) => {
        if (typeof pawn.position === 'object' && 
            positionsEqual(pawn.position, position)) {
          captured.push({
            playerId: player.id,
            color: player.color,
            pawnIndex,
            position: pawn.position
          });
        }
      });
    }
  });
  
  return captured;
};

export const checkWinCondition = (players, playerId) => {
  const player = players.find(p => p.id === playerId);
  if (!player) return false;
  
  return player.pawns.every(pawn => 
    pawn.position === 'finish' || 
    (typeof pawn.position === 'object' && 
     BOARD_CONFIG.finalPositions[player.color].some(finalPos => 
       positionsEqual(finalPos, pawn.position)
     ))
  );
};

export const getNextPlayerId = (players, currentPlayerId) => {
  const activePlayers = players.filter((p) => !p.resigned);
  if (activePlayers.length === 0) return null;
  const currentIndex = activePlayers.findIndex((p) => p.id === currentPlayerId);
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
};

export const areAllPawnsAtHome = (player) => {
  if (!player || !player.pawns || !Array.isArray(player.pawns)) return false;
  return player.pawns.every(pawn => pawn.position === 'home');
};

export const checkIfPlayerHasValidMoves = (player, diceValue) => {
  if (!player || !player.pawns || !Array.isArray(player.pawns)) return false;
  
  return player.pawns.some((pawn, index) => {
    const calculatedPosition = calculateNewPosition(
      pawn.position,
      diceValue,
      player.color,
      index
    );
    
    const validationResult = isValidMove(
      pawn.position,
      calculatedPosition,
      diceValue,
      player.color,
      index
    );
    
    return validationResult.isValid;
  });
};

// Get pawn ID from color and index
export const getPawnId = (color, index) => {
  const colorMap = {
    green: { start: 1, count: 4 },
    red: { start: 5, count: 4 },
    blue: { start: 9, count: 4 },
    yellow: { start: 13, count: 4 }
  };
  return colorMap[color]?.start + index;
};

// Get finish position
export const getFinishPosition = (color, pawnIndex) => {
  // Use finalPositions instead of finalPositions
  const finalPositions = BOARD_CONFIG.finalPositions[color];
  return finalPositions[pawnIndex] || {x: 0, y: 0, z: 0};
};

// Check if pawn belongs to current player
export const isCurrentPlayerPawn = (pawnId, currentPlayerId, players) => {
  if (!currentPlayerId || !players) return false;
  
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  if (!currentPlayer || !currentPlayer.color) return false;
  
  const colorMap = {
    green: { start: 1, end: 4 },
    red: { start: 5, end: 8 },
    blue: { start: 9, end: 12 },
    yellow: { start: 13, end: 16 }
  };
  
  const pawnColor = Object.entries(colorMap).find(([_, range]) => 
    pawnId >= range.start && pawnId <= range.end
  )?.[0];
  
  return pawnColor === currentPlayer.color;
};

// Get player color from pawn ID
export const getPlayerColorFromPawnId = (pawnId) => {
  if (pawnId <= 4) return 'green';
  if (pawnId <= 8) return 'red';
  if (pawnId <= 12) return 'blue';
  return 'yellow';
};

// Get pawn index from pawn ID
export const getPawnIndexFromPawnId = (pawnId) => {
  return (pawnId - 1) % 4;
};

// Debug function for moves
export const debugMove = (currentPosition, calculatedPosition, diceValue, color, isValid) => {
  console.log('=== MOVE DEBUG INFO ===');
  console.log('Current position:', currentPosition);
  console.log('Calculated position:', calculatedPosition);
  console.log('Dice value:', diceValue);
  console.log('Player color:', color);
  console.log('Is valid move:', isValid);
  console.log('Current position type:', typeof currentPosition);
  console.log('Calculated position type:', typeof calculatedPosition);
  
  if (typeof currentPosition === 'object' && typeof calculatedPosition === 'object') {
    console.log('Positions are equal:', JSON.stringify(currentPosition) === JSON.stringify(calculatedPosition));
  }
  console.log('========================');
};

// Visual feedback for invalid moves
export const showInvalidMoveFeedback = (object) => {
  if (!object || !object.material) return;
  
  const originalColor = object.material.color.clone();
  object.material.color.set(0xff0000);
  
  setTimeout(() => {
    if (object && object.material) {
      object.material.color.copy(originalColor);
    }
  }, 100);
};

// Auto-pass turn if no valid moves
export const handleAutoPassTurn = (player, diceValue, passTurnFunction, delay = 1000) => {
  const hasValidMoves = checkIfPlayerHasValidMoves(player, diceValue);
  const allAtHome = areAllPawnsAtHome(player);
  
  // Auto-pass if no valid moves OR if all pawns are at home and didn't roll a 6
  if (allAtHome && diceValue !== 6) {
    console.log('All pawns at home without a 6, auto-passing turn', allAtHome);
    setTimeout(() => {
      passTurnFunction();
    }, delay);
    return true;
  }
  
  if (!hasValidMoves && passTurnFunction) {
    console.log('Player has no valid moves, auto-passing turn');
    setTimeout(() => {
      passTurnFunction();
    }, delay);
    return true;
  }
  
  return false;
};