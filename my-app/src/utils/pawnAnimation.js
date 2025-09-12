import { BOARD_CONFIG } from './boardConfig';
import { positionsEqual } from './ludoUtils';

export const getPathPositions = (startPos, endPos, steps, color, currentPositionState) => {
  const path = [];
  
  // If moving from home to start
  if (currentPositionState === 'home') {
    const startPosition = BOARD_CONFIG.startPositions[color];
    return [startPosition];
  }

  // If moving to finish
  if (endPos === 'finish') {
    const finishPosition = BOARD_CONFIG.finalPositions[color][0]; // Use specific pawn finish position
    return [finishPosition];
  }

  // For moves on the board, calculate exact path
  const mainTrack = BOARD_CONFIG.mainTrack;
  const homeColumn = BOARD_CONFIG.homeColumns[color];
  const entryPosition = BOARD_CONFIG.entryPositions[color];

  // Check if currently in home column
  const currentHomeIndex = homeColumn.findIndex(pos => 
    positionsEqual(pos, startPos)
  );

  if (currentHomeIndex !== -1) {
    // Moving within home column
    const targetHomeIndex = currentHomeIndex + steps;
    if (targetHomeIndex < homeColumn.length) {
      for (let i = currentHomeIndex + 1; i <= targetHomeIndex; i++) {
        path.push(homeColumn[i]);
      }
    }
    return path;
  }

  // Check if currently on main track
  const currentTrackIndex = mainTrack.findIndex(pos => 
    positionsEqual(pos, startPos)
  );

  if (currentTrackIndex !== -1) {
    // Moving on main track
    let remainingSteps = steps;
    let currentIndex = currentTrackIndex;
    
    while (remainingSteps > 0) {
      currentIndex = (currentIndex + 1) % mainTrack.length;
      const nextPos = mainTrack[currentIndex];
      
      path.push(nextPos);
      remainingSteps--;

      // Stop if we reached entry point and have steps left for home column
      if (positionsEqual(nextPos, entryPosition) && remainingSteps > 0) {
        // Move into home column
        for (let i = 1; i <= remainingSteps && i < homeColumn.length; i++) {
          path.push(homeColumn[i]);
        }
        break;
      }
    }
    
    return path;
  }

  // Fallback: direct move
  return [endPos];
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