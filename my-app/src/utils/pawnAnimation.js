import { BOARD_CONFIG } from './boardConfig';
import { getPawnId, positionsEqual } from './ludoUtils';


export const getPathPositions = (
  startPos,
  endPos,
  steps,
  color,
  currentPositionState,
  pawnIndex = 0
) => {
  const path = [];
  const { mainTrack, homeColumns, entryPositions, startPositions, finalPositions } =
    BOARD_CONFIG;

  // === 1. From home base ===
  if (currentPositionState === "home") {
    if (steps === 6) {
      path.push(startPositions[color]);
    }
    return path;
  }

  // === 2. Already finished ===
  if (endPos === "finish") {
    path.push(finalPositions[color][pawnIndex]);
    return path;
  }

  // === 3. Inside home column ===
  const homeColumn = homeColumns[color];
  const homeColumnLength = homeColumn.length - 1
  const currentHomeIndex = homeColumn.findIndex((pos) =>
    positionsEqual(pos, startPos)
  );

  if (currentHomeIndex !== -1) {
    const targetIndex = currentHomeIndex + steps;

    if (targetIndex < homeColumnLength) {
      for (let i = currentHomeIndex + 1; i <= targetIndex; i++) {
        path.push(homeColumn[i]);
      }
      return path;
    }

    if (targetIndex === homeColumnLength) {
      for (let i = currentHomeIndex + 1; i < homeColumnLength; i++) {
        path.push(homeColumn[i]);
      }
      path.push(finalPositions[color][pawnIndex]);
      return path;
    }

    // Overshoot → no movement
    return [];
  }

  // === 4. On main track ===
  const currentTrackIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, startPos)
  );
  if (currentTrackIndex === -1) return [];

  const total = mainTrack.length;
  const entryIndex = mainTrack.findIndex((pos) =>
    positionsEqual(pos, entryPositions[color])
  );

  let stepsToEntry;
  if (currentTrackIndex <= entryIndex) {
    stepsToEntry = entryIndex - currentTrackIndex;
  } else {
    stepsToEntry = total - currentTrackIndex + entryIndex;
  }

  let remainingSteps = steps;

  let currentIndex = currentTrackIndex;

  // === Case A: Entering home column ===
  if (steps > stepsToEntry) {
    // First move along main track to entry
    for (let i = 1; i <= stepsToEntry; i++) {
      currentIndex = (currentIndex + 1) % total;
      path.push(mainTrack[currentIndex]);
    }

    // Then move into home column
    const stepsIntoHome = steps - stepsToEntry;
    const homeColumnIndex = stepsIntoHome - 1;

    if (homeColumnIndex < homeColumn.length - 1) {
      for (let i = 0; i <= homeColumnIndex; i++) {
        path.push(homeColumn[i]);
      }
    } else if (homeColumnIndex === homeColumn.length - 1) {
      for (let i = 0; i < homeColumnLength; i++) {
        path.push(homeColumn[i]);
      }
      path.push(finalPositions[color][pawnIndex]);
    }
    return path;
  }

  // === Case B: Landing exactly on entry ===
  if (steps === stepsToEntry) {
    for (let i = 1; i <= steps; i++) {
      currentIndex = (currentIndex + 1) % total;
      path.push(mainTrack[currentIndex]);
    }
    return path;
  }

  // === Case C: Staying on main track ===
  for (let i = 1; i <= steps; i++) {
    currentIndex = (currentIndex + 1) % total;
    path.push(mainTrack[currentIndex]);
  }
  return path;
};

export const animatePawnMove = (pawnRef, path, onFinish, stepDuration = 500) => {
  const pawn = pawnRef;
  if (!pawn || !path.length) return;

  let stepIndex = 0;

  function animateStep() {
    if (stepIndex >= path.length) {
      onFinish?.();
      return;
    }

    // Move to the exact step position
    const stepPos = path[stepIndex];
    pawn.position.set(stepPos.x, stepPos.y || 0.253, stepPos.z);

    stepIndex++;

    // Continue only if there are more steps
    if (stepIndex < path.length) {
      setTimeout(animateStep, stepDuration);
    } else {
      // Final position reached
      setTimeout(() => {
        onFinish?.();
      }, stepDuration / 2);
    }
  }

  // Start animation with a slight delay for better visual
  setTimeout(animateStep, 100);
};

// Animation function with emission
export const animatePawnMoveWithEmission = (pawnRef, path, onFinish, stepDuration = 200, emissionCallbacks = {}) => {
  const pawn = pawnRef;
  if (!pawn || !path.length) return;

  let stepIndex = 0;

  // Emit animation start if callback provided
  if (emissionCallbacks.onAnimationStart) {
    emissionCallbacks.onAnimationStart(pawnRef.userData.pawnId, path);
  }

  function animateStep() {
    if (stepIndex >= path.length) {
      // Emit final position and animation end
      const finalPos = path[path.length - 1];
      if (emissionCallbacks.onAnimationPosition) {
        emissionCallbacks.onAnimationPosition(pawnRef.userData.pawnId, finalPos);
      }
      if (emissionCallbacks.onAnimationEnd) {
        emissionCallbacks.onAnimationEnd(pawnRef.userData.pawnId, finalPos);
      }
      
      onFinish?.();
      return;
    }

    // Move to the exact step position
    const stepPos = path[stepIndex];
    pawn.position.set(stepPos.x, stepPos.y || 0.253, stepPos.z);

    // Emit current position to remote users
    if (emissionCallbacks.onAnimationPosition) {
      emissionCallbacks.onAnimationPosition(pawnRef.userData.pawnId, stepPos);
    }

    stepIndex++;

    // Continue only if there are more steps
    if (stepIndex < path.length) {
      setTimeout(animateStep, stepDuration);
    } else {
      // Final position reached - emit one more time to ensure final position is sent
      const finalPos = path[path.length - 1];
      setTimeout(() => {
        if (emissionCallbacks.onAnimationPosition) {
          emissionCallbacks.onAnimationPosition(pawnRef.userData.pawnId, finalPos);
        }
        if (emissionCallbacks.onAnimationEnd) {
          emissionCallbacks.onAnimationEnd(pawnRef.userData.pawnId, finalPos);
        }
        onFinish?.();
      }, stepDuration / 2);
    }
  }

  // Start animation with a slight delay for better visual
  setTimeout(animateStep, 100);
};

// Emission helper functions
export const createEmissionCallbacks = (socket, gameId, currentPlayerId) => {
  const emitAnimationPosition = (pawnId, position) => {
    if (socket && gameId) {
      try {
        socket.emit('pawn-animating', {
          gameId,
          playerId: currentPlayerId,
          pawnId,
          position: {
            x: position.x,
            y: position.y || 0.253,
            z: position.z
          },
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('Failed to emit animation position:', error);
      }
    }
  };

  const emitAnimationStart = (pawnId, path) => {
    if (socket && gameId) {
      try {
        socket.emit('pawn-animation-start', {
          gameId,
          playerId: currentPlayerId,
          pawnId,
          path: path.map(pos => ({
            x: pos.x,
            y: pos.y || 0.253,
            z: pos.z
          })),
          startTime: Date.now()
        });
      } catch (error) {
        console.warn('Failed to emit animation start:', error);
      }
    }
  };

  const emitAnimationEnd = (pawnId, finalPosition) => {
    if (socket && gameId) {
      try {
        socket.emit('pawn-animation-end', {
          gameId,
          playerId: currentPlayerId,
          pawnId,
          finalPosition: {
            x: finalPosition.x,
            y: finalPosition.y || 0.253,
            z: finalPosition.z
          }
        });
      } catch (error) {
        console.warn('Failed to emit animation end:', error);
      }
    }
  };

  return {
    onAnimationStart: emitAnimationStart,
    onAnimationPosition: emitAnimationPosition,
    onAnimationEnd: emitAnimationEnd
  };
};


export const calculatePawnOffsets = (pawnsInCell, index) => {
  const totalPawns = pawnsInCell.length;
  if (totalPawns === 1) return { x: 0, z: 0, scale: 1 };
  
  const scale = 0.7; 
  const verticalSpacing = 0.15;
  
  if (totalPawns === 2) {
    return {
      x: 0, // No horizontal offset
      z: index === 0 ? -verticalSpacing : verticalSpacing, 
      scale
    };
  }
  
  if (totalPawns === 3) {
    const positions = [
      { x: 0, z: -verticalSpacing * 1.5 }, // Top
      { x: 0, z: 0 },                      // Middle
      { x: 0, z: verticalSpacing * 1.5 }   // Bottom
    ];
    return { ...positions[index], scale };
  }
  
  if (totalPawns >= 4) {
    // For 4+ pawns, create 2 columns with vertical stacking
    const column = index % 2; // 0 = left column, 1 = right column
    const row = Math.floor(index / 2);
    
    const horizontalSpacing = 0.1; // Small horizontal spacing for columns
    
    return {
      x: column === 0 ? -horizontalSpacing : horizontalSpacing,
      z: (row - 0.5) * verticalSpacing * 2, // Center vertically
      scale: scale * 0.9 // Slightly smaller for 4+ pawns
    };
  }
  
  return { x: 0, z: 0, scale: 1 };
};

// Add this helper function to create a visual path for capture animation
export const createCapturePath = (startPos, endPos) => {
  // Create a small arc animation for visual effect
  const midY = Math.max(startPos.y, endPos.y) + 1.5; // Add some height for the arc
  const midPoint = {
    x: (startPos.x + endPos.x) / 2,
    y: midY,
    z: (startPos.z + endPos.z) / 2
  };
  
  return [startPos, midPoint, endPos];
};

 export const getHomePosition = (color, pawnIndex) => {
  const pawnId = getPawnId(color, pawnIndex);
  const homePos = initialPawnsRef.current[pawnId - 1]?.pos;
  return homePos ? { x: homePos[0], y: homePos[1], z: homePos[2] } : null;
};