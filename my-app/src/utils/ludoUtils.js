import { updateDoc } from 'firebase/firestore';
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

export const calculateNewPosition1 = (
  currentPosition,
  diceValue,
  color,
  pawnIndex
) => {
  const { mainTrack, homeColumns, entryPositions, startPositions, finalPositions } =
    BOARD_CONFIG;

  // === 1. Still at home base ===
  if (currentPosition === "home") {
    return diceValue === 6 ? startPositions[color] : "home";
  }

  // === 2. Already finished ===
  if (currentPosition === "finish") {
    return "finish";
  }

  // === 3. Inside home column ===
  const currentHomeIndex = homeColumns[color].findIndex((pos) =>
    positionsEqual(pos, currentPosition)
  );

  if (currentHomeIndex !== -1) {
    const newIndex = currentHomeIndex + diceValue;

    if (newIndex < homeColumns[color].length - 1) {
      return homeColumns[color][newIndex];
    }

    if (newIndex === homeColumns[color].length - 1) {
      // land on triangle → straight to final
      return finalPositions[color][pawnIndex];
    }

    // overshoot → can't move
    return currentPosition;
  }

  // === 4. At entry point (still on main track) ===
  if (positionsEqual(currentPosition, entryPositions[color])) {
    const steps = diceValue;

    if (steps <= homeColumns[color].length - 1) {
      // normal home column move - start from FIRST home position (index 1)
      return homeColumns[color][steps];
    }

    if (steps === homeColumns[color].length) {
      // exactly enough to reach triangle → go final
      return finalPositions[color][pawnIndex];
    }

    // overshoot
    return currentPosition;
  }

  // === 5. On the main track ===
  const currentTrackIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, currentPosition)
  );

  if (currentTrackIndex === -1) {
    console.warn("Position not found on track or home column:", currentPosition);
    return currentPosition;
  }

  const total = mainTrack.length;
  const newTrackIndex = (currentTrackIndex + diceValue) % total;
  const entryIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, entryPositions[color])
  );

  // Landed directly on entry
  if (positionsEqual(mainTrack[newTrackIndex], entryPositions[color])) {
    return entryPositions[color]; // Stay on entry point
  }

  // Did we pass our entry point?
  const passedEntry = checkPassedEntry(
    currentTrackIndex,
    newTrackIndex,
    entryIndex,
    total
  );

  if (passedEntry) {
    const stepsPastEntry = calculateStepsPastEntry(
      currentTrackIndex,
      newTrackIndex,
      entryIndex,
      total
    );

    if (stepsPastEntry <= homeColumns[color].length - 1) {
      return homeColumns[color][stepsPastEntry];
    }

    if (stepsPastEntry === homeColumns[color].length) {
      return finalPositions[color][pawnIndex];
    }

    return currentPosition; // overshoot
  }

  // Normal movement around main track
  return mainTrack[newTrackIndex];
};

const checkPassedEntry = (current, next, entry) => {
  if (current < entry) {
    // Moving forward without wrapping
    return next > entry;
  } else {
    // Moving forward with wrap-around
    return next < current && next >= 0;
  }
};

const calculateStepsPastEntry = (current, next, entry, total) => {
  if (current < entry) {
    // Simple case: moving forward without wrapping
    return next - entry;
  } else {
    // Complex case: moving forward with wrap-around
    return (total - current) + next - entry;
  }
};

export const calculateNewPosition2 = (
  currentPosition,
  diceValue,
  color,
  pawnIndex
) => {
  console.log("=== calculateNewPosition called ===");
  console.log("currentPosition:", currentPosition);
  console.log("diceValue:", diceValue);
  console.log("color:", color);
  console.log("pawnIndex:", pawnIndex);

  const { mainTrack, homeColumns, entryPositions, startPositions, finalPositions } =
    BOARD_CONFIG;

  // === 1. Still at home base ===
  if (currentPosition === "home") {
    console.log("Pawn is at home, diceValue:", diceValue);
    const result = diceValue === 6 ? startPositions[color] : "home";
    console.log("Returning:", result);
    return result;
  }

  // === 2. Already finished ===
  if (currentPosition === "finish") {
    console.log("Pawn is already finished, returning 'finish'");
    return "finish";
  }

  // === 3. Inside home column ===
  const currentHomeIndex = homeColumns[color].findIndex((pos) =>
    positionsEqual(pos, currentPosition)
  );

  console.log("currentHomeIndex:", currentHomeIndex);
  console.log("homeColumns[color]:", homeColumns[color]);

  if (currentHomeIndex !== -1) {
    console.log("Pawn is inside home column at index:", currentHomeIndex);
    const newIndex = currentHomeIndex + diceValue;
    console.log("newIndex (currentHomeIndex + diceValue):", newIndex);
    console.log("homeColumns[color].length:", homeColumns[color].length);

    if (newIndex < homeColumns[color].length) {
      console.log("Moving within home column to index:", newIndex);
      const result = homeColumns[color][newIndex];
      console.log("Returning:", result);
      return result;
    }

    if (newIndex === homeColumns[color].length) {
      console.log("Landing on triangle, moving to final position");
      const result = finalPositions[color][pawnIndex];
      console.log("Returning:", result);
      return result;
    }

    console.log("Overshot home column, can't move");
    console.log("Returning currentPosition:", currentPosition);
    return currentPosition;
  }

  // === 4. On the main track ===
  const currentTrackIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, currentPosition)
  );

  console.log("currentTrackIndex:", currentTrackIndex);

  if (currentTrackIndex === -1) {
    console.warn("Position not found on track or home column:", currentPosition);
    return currentPosition;
  }

  const total = mainTrack.length;
  const entryIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, entryPositions[color])
  );

  console.log("total mainTrack length:", total);
  console.log("entryIndex:", entryIndex);
  console.log("entryPositions[color]:", entryPositions[color]);

  // Calculate the number of steps to reach entry point
  let stepsToEntry;
  if (currentTrackIndex <= entryIndex) {
    stepsToEntry = entryIndex - currentTrackIndex;
    console.log("currentTrackIndex <= entryIndex, stepsToEntry = entryIndex - currentTrackIndex:", stepsToEntry);
  } else {
    stepsToEntry = (total - currentTrackIndex) + entryIndex;
    console.log("currentTrackIndex > entryIndex, stepsToEntry = (total - currentTrackIndex) + entryIndex:", stepsToEntry);
  }

  console.log("stepsToEntry:", stepsToEntry);

  // Check if we will reach or pass the entry point
  if (diceValue > stepsToEntry) {
    console.log("diceValue > stepsToEntry, will enter home column");
    const stepsIntoHome = diceValue - stepsToEntry;
    console.log("stepsIntoHome (diceValue - stepsToEntry):", stepsIntoHome);
    console.log("homeColumns[color].length:", homeColumns[color].length);

    const homeColumnLength = homeColumns[color].length - 1
    const stepsIntoHomeIndex = stepsIntoHome - 1


    
    if (stepsIntoHomeIndex < homeColumnLength) {
      console.log("stepsIntoHomeIndex < homeColumns[color].length, moving to home column index:", stepsIntoHomeIndex);
      const result = homeColumns[color][stepsIntoHomeIndex];

      console.log("Returning @@@@@@@@@@@@@ 0:", homeColumns[color][0]);
      console.log("Returning @@@@@@@@@@@@@ 0:", homeColumnLength);



      console.log("Returning:", result);
      return result;
    } else if (stepsIntoHomeIndex === homeColumnLength) {
      console.log("stepsIntoHomeIndex === homeColumns[color].length, moving to final position");
      const result = finalPositions[color][pawnIndex];
      console.log("Returning:", result);
      return result;
    } else {
      console.log("Overshot home column, can't move");
      console.log("Returning currentPosition:", currentPosition);
      return currentPosition;
    }
  } else if (diceValue === stepsToEntry) {
    console.log("diceValue === stepsToEntry, landing exactly on entry point");
    const result = entryPositions[color];
    console.log("Returning:", result);
    return result;
  } else {
    console.log("diceValue < stepsToEntry, staying on main track");
    const newTrackIndex = (currentTrackIndex + diceValue) % total;
    console.log("newTrackIndex (currentTrackIndex + diceValue) % total:", newTrackIndex);
    const result = mainTrack[newTrackIndex];
    console.log("Returning:", result);
    return result;
  }
};

export const calculateNewPosition = (
  currentPosition,
  diceValue,
  color,
  pawnIndex
) => {

  const { mainTrack, homeColumns, entryPositions, startPositions, finalPositions } =
    BOARD_CONFIG;

  // === 1. Still at home base ===
  if (currentPosition === "home") {
    const result = diceValue === 6 ? startPositions[color] : "home";
    return result;
  }

  // === 2. Already finished ===
  if (currentPosition === "finish") {
    return "finish";
  }

  // === 3. Inside home column ===
  const currentHomeIndex = homeColumns[color].findIndex((pos) =>
    positionsEqual(pos, currentPosition)
  );

  if (currentHomeIndex !== -1) {
    const newIndex = currentHomeIndex + diceValue;

    console.log("newIndex@@@@@@@@@@@",newIndex);
    

    if (newIndex < homeColumns[color].length - 1) {
      // console.log("Moving within home column to index:", newIndex);
      const result = homeColumns[color][newIndex];
      // console.log("Returning:", result);
      return result;
    }

    if (newIndex === homeColumns[color].length - 1) {
      // console.log("Landing on triangle, moving to final position");
      const result = finalPositions[color][pawnIndex];
      // console.log("Returning:", result);
      return result;
    }

    // console.log("Returning currentPosition:", currentPosition);
    return currentPosition;
  }

  // === 4. On the main track ===
  const currentTrackIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, currentPosition)
  );

  // console.log("currentTrackIndex:", currentTrackIndex);

  if (currentTrackIndex === -1) {
    // console.warn("Position not found on track or home column:", currentPosition);
    return currentPosition;
  }

  const total = mainTrack.length;
  const entryIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, entryPositions[color])
  );

  // console.log("total mainTrack length:", total);
  // console.log("entryIndex:", entryIndex);
  // console.log("entryPositions[color]:", entryPositions[color]);

  // Calculate the number of steps to reach entry point
  let stepsToEntry;
  if (currentTrackIndex <= entryIndex) {
    stepsToEntry = entryIndex - currentTrackIndex;
    // console.log("currentTrackIndex <= entryIndex, stepsToEntry = entryIndex - currentTrackIndex:", stepsToEntry);
  } else {
    stepsToEntry = (total - currentTrackIndex) + entryIndex;
    // console.log("currentTrackIndex > entryIndex, stepsToEntry = (total - currentTrackIndex) + entryIndex:", stepsToEntry);
  }

  // console.log("stepsToEntry:", stepsToEntry);

  // Check if we will reach or pass the entry point
  if (diceValue > stepsToEntry) {
    // console.log("diceValue > stepsToEntry, will enter home column");
    const stepsIntoHome = diceValue - stepsToEntry;
    // console.log("stepsIntoHome (diceValue - stepsToEntry):", stepsIntoHome);
    
    // Home column indexing starts from 0 (entry point is index 0)
    const homeColumnIndex = stepsIntoHome - 1; // Subtract 1 to get correct index
    
    // console.log("homeColumns[color].length:", homeColumns[color].length);
    // console.log("homeColumnIndex (stepsIntoHome - 1):", homeColumnIndex);

    if (homeColumnIndex < homeColumns[color].length - 1) {
      // console.log("Moving to home column index:", homeColumnIndex);
      const result = homeColumns[color][homeColumnIndex];
      // console.log("Returning:", result);
      return result;
    } else if (homeColumnIndex === homeColumns[color].length - 1) {
      // console.log("Reached final position");
      const result = finalPositions[color][pawnIndex];
      // console.log("Returning:", result);
      return result;
    } else {
      // console.log("Overshot home column, can't move");
      // console.log("Returning currentPosition:", currentPosition);
      return currentPosition;
    }
  } else if (diceValue === stepsToEntry) {
    // console.log("diceValue === stepsToEntry, landing exactly on entry point");
    const result = entryPositions[color];
    // console.log("Returning:", result);
    return result;
  } else {
    // console.log("diceValue < stepsToEntry, staying on main track");
    const newTrackIndex = (currentTrackIndex + diceValue) % total;
    // console.log("newTrackIndex (currentTrackIndex + diceValue) % total:", newTrackIndex);
    const result = mainTrack[newTrackIndex];
    // console.log("Returning:", result);
    return result;
  }
};


export const isValidMove = (currentPosition, diceValue, color, pawnIndex) => {
  const newPos = calculateNewPosition(currentPosition, diceValue, color, pawnIndex);

  return {
    isValid: !positionsEqual(currentPosition, newPos),
    newPos
  };
};


export const checkCaptures = (position, currentPlayerColor, allPlayers) => {
  const captured = [];
  
  if (isSafeSquare(position)) {
    return captured; 
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
    const validationResult = isValidMove(
      pawn.position,
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
export const handleAutoPassTurn = (
  player, 
  diceValue, 
  passTurnFunction, 
  noValidMovesFunction, // Add this parameter
  delay = 2000
) => {
  const hasValidMoves = checkIfPlayerHasValidMoves(player, diceValue);
  const allAtHome = areAllPawnsAtHome(player);
  
  // Auto-pass if no valid moves OR if all pawns are at home and didn't roll a 6
  if (allAtHome && diceValue !== 6) {
    console.log('All pawns at home without a 6, auto-passing turn', allAtHome);
    
    // Show notification if function is provided
    if (noValidMovesFunction) {
      noValidMovesFunction(player.name, true); // true = isCurrentUser
    }
    
    setTimeout(() => {
      passTurnFunction();
    }, delay);
    return true;
  }
  
  if (!hasValidMoves && passTurnFunction) {
    console.log('Player has no valid moves, auto-passing turn');
    
    // Show notification if function is provided
    if (noValidMovesFunction) {
      noValidMovesFunction(player.name, true); // true = isCurrentUser
    }
    
    setTimeout(() => {
      passTurnFunction();
    }, delay);
    return true;
  }
  
  return false;
};

export  const getColorHex = (color) => {
    const colorMap = {
      red: '#ef4444',
      blue: '#3b82f6', 
      green: '#22c55e',
      yellow: '#eab308'
    };
    return colorMap[color] || '#9ca3af';
  };

  // Add this function to safely handle positions
export const safePosition = (position) => {
  if (position === undefined || position === null) {
    return 'home';
  }
  
  if (typeof position === 'object') {
    // Validate object position
    if (position.x === undefined || position.y === undefined || position.z === undefined) {
      return 'home';
    }
    return position;
  }
  
  if (position === 'finish' || position === 'home') {
    return position;
  }
  
  return 'home'; // fallback
};

// Update your Firebase save function
export const updateGameInFirestore = async (gameId, gameData) => {
  try {
    // Ensure all pawn positions are valid
    if (gameData.players && Array.isArray(gameData.players)) {
      gameData.players.forEach(player => {
        if (player.pawns && Array.isArray(player.pawns)) {
          player.pawns.forEach(pawn => {
            pawn.position = safePosition(pawn.position);
            
            // Ensure path is always an array
            if (!pawn.path || !Array.isArray(pawn.path)) {
              pawn.path = [];
            }
          });
        }
      });
    }
    
    await updateDoc(doc(db, 'games', gameId), gameData);
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
};