import { BOARD_CONFIG } from './boardConfig';
import { positionsEqual } from './ludoUtils';


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