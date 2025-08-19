const makeMove = useCallback(async (moveData) => {
  if (!user || !gameState || !socket) {
    toast.error('Connection error. Please try again.');
    return false;
  }

  // Validate it's the player's turn
  if (gameState.currentTurn !== user.uid) {
    toast.error('Not your turn!');
    return false;
  }

  // Validate move data
  if (!moveData || !moveData.pawnId || !moveData.newPosition) {
    toast.error('Invalid move data');
    return false;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const currentGameState = gameDoc.data();
      
      // Additional validation
      if (currentGameState.status !== 'playing') {
        throw new Error('Game is not in progress');
      }

      if (currentGameState.currentTurn !== user.uid) {
        throw new Error('Turn changed before move completed');
      }

      // Parse pawn information
      const [color, pawnIndexStr] = moveData.pawnId.split('-');
      const pawnIndex = parseInt(pawnIndexStr);
      
      if (isNaN(pawnIndex) || pawnIndex < 0 || pawnIndex > 3) {
        throw new Error('Invalid pawn selection');
      }

      // Find the current player and ensure pawns exists
      const updatedPlayers = currentGameState.players.map(player => {
        // Initialize pawns array if it doesn't exist
        const pawns = Array.isArray(player.pawns) ? [...player.pawns] : Array(4).fill({ position: 'home' });
        return { ...player, pawns };
      });

      const currentPlayer = updatedPlayers.find(p => p.id === user.uid);
      if (!currentPlayer) {
        throw new Error('Player not found in game');
      }

      // Validate the move
      if (!isValidMove(
        currentPlayer.pawns[pawnIndex]?.position,
        moveData.newPosition,
        currentGameState.diceValue,
        color,
        updatedPlayers
      )) {
        throw new Error('Invalid move according to game rules');
      }

      // Update the pawn position
      const finalPlayers = updatedPlayers.map(player => {
        if (player.id !== user.uid) return player;
        
        const updatedPawns = player.pawns.map((pawn, idx) => 
          idx === pawnIndex 
            ? { ...pawn, position: moveData.newPosition } 
            : pawn
        );
        
        return { ...player, pawns: updatedPawns };
      });

      // Check win condition
      const hasWon = checkWinCondition(finalPlayers, user.uid);

      // Prepare update data
      const updateData = {
        players: finalPlayers,
        lastMove: {
          playerId: user.uid,
          action: 'move',
          pawnId: moveData.pawnId,
          fromPosition: currentPlayer.pawns[pawnIndex]?.position || 'home',
          toPosition: moveData.newPosition,
          timestamp: serverTimestamp()
        },
        diceValue: 0, // Reset dice after move
      };

      // Determine if turn should pass
      let shouldPassTurn = true;
      
      if (hasWon) {
        updateData.status = 'finished';
        updateData.winner = user.uid;
        updateData.finishedAt = serverTimestamp();
      } else if (currentGameState.diceValue === 6) {
        shouldPassTurn = false;
        toast.info("You rolled a 6! Roll again");
      }

      // If turn should pass, set next player
      if (shouldPassTurn) {
        updateData.currentTurn = getNextPlayerId(finalPlayers, user.uid);
      }

      transaction.update(gameRef, updateData);

      // Emit move via socket
      socket.emit('pawn-move', {
        gameId,
        playerId: user.uid,
        pawnId: moveData.pawnId,
        fromPosition: currentPlayer.pawns[pawnIndex]?.position || 'home',
        newPosition: moveData.newPosition,
        timestamp: Date.now(),
        isWin: hasWon,
        nextTurn: updateData.currentTurn
      });
    });

    return true;
  } catch (error) {
    console.error('Move failed:', error);
    toast.error(error.message || 'Move failed');
    return false;
  }
}, [user, gameState, socket, gameId]);




const makeMove2 = useCallback(async (moveData) => {
  if (!user || !gameState || !socket) {
    toast.error('Connection error. Please try again.');
    return false;
  }

  // Validate it's the player's turn
  if (gameState.currentTurn !== user.uid) {
    toast.error('Not your turn!');
    return false;
  }

  // Validate move data
  if (!moveData || !moveData.pawnId || !moveData.newPosition) {
    toast.error('Invalid move data');
    return false;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const currentGameState = gameDoc.data();
      
      // Additional validation
      if (currentGameState.status !== 'playing') {
        throw new Error('Game is not in progress');
      }

      if (currentGameState.currentTurn !== user.uid) {
        throw new Error('Turn changed before move completed');
      }

      // Parse pawn information
      const [color, pawnIndexStr] = moveData.pawnId.split('-');
      const pawnIndex = parseInt(pawnIndexStr);
      
      if (isNaN(pawnIndex) || pawnIndex < 0 || pawnIndex > 3) {
        throw new Error('Invalid pawn selection');
      }

      // Find the current player
      const currentPlayer = currentGameState.players.find(p => p.id === user.uid);
      if (!currentPlayer) {
        throw new Error('Player not found in game');
      }

      // Ensure pawns exists and is an array
      const playerPawns = Array.isArray(currentPlayer.pawns) 
        ? [...currentPlayer.pawns] 
        : Array(4).fill({ position: 'home' });

      // Get current pawn state
      const currentPawn = playerPawns[pawnIndex];
      if (!currentPawn) {
        throw new Error('Selected pawn not found');
      }

      // Validate the move based on game rules
      if (!isValidMove(
        currentPawn.position, 
        moveData.newPosition, 
        currentGameState.diceValue,
        color,
        currentGameState.players
      )) {
        throw new Error('Invalid move according to game rules');
      }

      // Check for captures
      const updatedPlayers = handleCaptures(
        currentGameState.players,
        user.uid,
        moveData.newPosition,
        color
      );

      // Update the pawn position
      const updatedPawns = [...playerPawns];
      updatedPawns[pawnIndex] = {
        ...currentPawn,
        position: moveData.newPosition
      };

      // Update current player's pawns in the players array
      const finalPlayers = updatedPlayers.map(player => 
        player.id === user.uid 
          ? { ...player, pawns: updatedPawns } 
          : player
      );

      // Check win condition
      const hasWon = checkWinCondition(finalPlayers, user.uid);

      // Prepare update data
      const updateData = {
        players: finalPlayers,
        lastMove: {
          playerId: user.uid,
          action: 'move',
          pawnId: moveData.pawnId,
          fromPosition: currentPawn.position,
          toPosition: moveData.newPosition,
          timestamp: serverTimestamp()
        },
        diceValue: 0, // Reset dice after move
      };

      // Determine if turn should pass
      let shouldPassTurn = true;
      
      // Cases where turn doesn't pass:
      // 1. Player won the game
      // 2. Player rolled a 6 (gets another turn)
      if (hasWon) {
        updateData.status = 'finished';
        updateData.winner = user.uid;
        updateData.finishedAt = serverTimestamp();
      } else if (currentGameState.diceValue === 6) {
        shouldPassTurn = false;
        toast.info("You rolled a 6! Roll again");
      }

      // If turn should pass, set next player
      if (shouldPassTurn) {
        updateData.currentTurn = getNextPlayerId(finalPlayers, user.uid);
      }

      transaction.update(gameRef, updateData);

      // Emit move via socket
      socket.emit('pawn-move', {
        gameId,
        playerId: user.uid,
        pawnId: moveData.pawnId,
        fromPosition: currentPawn.position,
        newPosition: moveData.newPosition,
        timestamp: Date.now(),
        isWin: hasWon,
        nextTurn: updateData.currentTurn,
        diceValue: 0 // Reset dice for all clients
      });
    });

    return true;
  } catch (error) {
    console.error('Move failed:', error);
    toast.error(error.message || 'Move failed');
    return false;
  }
}, [user, gameState, socket, gameId]);

// Helper functions for move validation and captures
const isValidMove = (currentPosition, newPosition, diceValue, color, allPlayers) => {
  // Basic validation
  if (currentPosition === 'finish') return false;
  if (newPosition === 'home') return false;

  // Moving out of home requires a 6
  if (currentPosition === 'home' && diceValue !== 6) return false;

  // Validate path movement
  const path = getPathForColor(color);
  if (!path.includes(newPosition)) return false;

  // Check if new position is blocked by own pawns
  const ownPawns = allPlayers.find(p => p.color === color)?.pawns || [];
  if (ownPawns.some(p => p.position === newPosition && newPosition !== 'home')) {
    return false; // Can't land on own pawn (unless it's home)
  }

  // Validate dice value matches move distance
  if (currentPosition !== 'home') {
    const currentIndex = path.indexOf(currentPosition);
    const newIndex = path.indexOf(newPosition);
    const moveDistance = (newIndex - currentIndex + path.length) % path.length;
    
    if (moveDistance !== diceValue) {
      return false;
    }
  }

  return true;
};

const getPathForColor = (color) => {
  // Return the movement path for the given color
  // This should match your game board implementation
  const paths = {
    red: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15', 'r16', 'finish'],
    green: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15', 'g16', 'finish'],
    // Add paths for other colors
  };
  return paths[color] || [];
};

const handleCaptures = (players, currentPlayerId, newPosition, currentColor) => {
  // Don't capture on safe spots or home
  if (newPosition === 'home' || isSafeSpot(newPosition)) {
    return players;
  }

  return players.map(player => {
    // Skip current player and players of the same color (team)
    if (player.id === currentPlayerId || player.color === currentColor) {
      return player;
    }

    // Check each pawn for captures
    const updatedPawns = player.pawns.map(pawn => {
      if (pawn.position === newPosition) {
        // Capture this pawn (send it home)
        toast.success(`Captured ${player.name}'s pawn!`);
        return { ...pawn, position: 'home' };
      }
      return pawn;
    });

    return { ...player, pawns: updatedPawns };
  });
};

const isSafeSpot = (position) => {
  // Define safe spots where pawns can't be captured
  const safeSpots = ['r1', 'g1', 'b1', 'y1', 'r9', 'g9', 'b9', 'y9'];
  return safeSpots.includes(position);
};

const checkWinCondition = (players, playerId) => {
  const player = players.find(p => p.id === playerId);
  if (!player) return false;

  // Check if all pawns are in finish position
  return player.pawns.every(pawn => pawn.position === 'finish');
};


const makeMove3 = useCallback(async (moveData) => {
  if (!user || !gameState || !socket) {
    toast.error('Connection error. Please try again.');
    return false;
  }

  // Validate it's the player's turn
  if (gameState.currentTurn !== user.uid) {
    toast.error('Not your turn!');
    return false;
  }

  // Validate move data
  if (!moveData || !moveData.pawnId || !moveData.newPosition) {
    toast.error('Invalid move data');
    return false;
  }

  try {
    const gameRef = doc(db, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const currentGameState = gameDoc.data();
      
      // Additional validation
      if (currentGameState.status !== 'playing') {
        throw new Error('Game is not in progress');
      }

      if (currentGameState.currentTurn !== user.uid) {
        throw new Error('Turn changed before move completed');
      }

      // Parse pawn information
      const [color, pawnIndexStr] = moveData.pawnId.split('-');
      const pawnIndex = parseInt(pawnIndexStr);
      
      if (isNaN(pawnIndex) || pawnIndex < 0 || pawnIndex > 3) {
        throw new Error('Invalid pawn selection');
      }

      // Find the current player
      const currentPlayer = currentGameState.players.find(p => p.id === user.uid);
      if (!currentPlayer) {
        throw new Error('Player not found in game');
      }

      // Get current pawn state
      const playerPawns = Array.isArray(currentPlayer.pawns) 
        ? [...currentPlayer.pawns] 
        : Array(4).fill({ position: 'home' });
      
      const currentPawn = playerPawns[pawnIndex];

      // Check if player has any pawns outside home
      const hasPawnsOutside = playerPawns.some(p => 
        p.position !== 'home' && p.position !== 'finish'
      );

      // STRICT VALIDATION FOR MOVING OUT OF HOME
      if (currentPawn.position === 'home') {
        // Must roll 6 to bring pawn out
        if (currentGameState.diceValue !== 6) {
          throw new Error('You must roll a 6 to bring a pawn out of home');
        }
        // Must move to start position
        if (moveData.newPosition !== 'start') {
          throw new Error('Pawns must move to start position when coming out of home');
        }
      } 
      // Validation for normal moves
      else if (currentPawn.position !== 'home' && currentPawn.position !== 'finish') {
        // Validate dice value for normal moves (example: must move exact steps)
        const currentPosition = parseInt(currentPawn.position);
        const newPosition = parseInt(moveData.newPosition);
        
        if (isNaN(currentPosition) {
          throw new Error('Invalid current pawn position');
        }
        
        if (isNaN(newPosition)) {
          throw new Error('Invalid target position');
        }

        // Calculate expected move distance
        const moveDistance = (newPosition - currentPosition + 52) % 52; // Handle board loop
        if (moveDistance !== currentGameState.diceValue) {
          throw new Error(`You must move exactly ${currentGameState.diceValue} spaces`);
        }
      }
      // Cannot move finished pawns
      else if (currentPawn.position === 'finish') {
        throw new Error('Cannot move a pawn that has finished');
      }

      // Check for captures (if landing on opponent's pawn)
      const updatedPlayers = currentGameState.players.map(player => {
        if (player.id === user.uid) return player; // Skip current player
        
        return {
          ...player,
          pawns: player.pawns.map(pawn => {
            // If opponent's pawn is at the target position (and not in safe zone)
            if (pawn.position === moveData.newPosition.toString() && 
                !isSafeZone(pawn.position, player.color)) {
              return { ...pawn, position: 'home' }; // Send opponent's pawn home
            }
            return pawn;
          })
        };
      });

      // Update the pawn position
      playerPawns[pawnIndex] = {
        ...currentPawn,
        position: moveData.newPosition
      };

      // Update current player's pawns in the players array
      const finalPlayers = updatedPlayers.map(player => 
        player.id === user.uid 
          ? { ...player, pawns: playerPawns } 
          : player
      );

      // Check win condition (all pawns in finish)
      const hasWon = playerPawns.every(pawn => pawn.position === 'finish');

      // Prepare update data
      const updateData = {
        players: finalPlayers,
        lastMove: {
          playerId: user.uid,
          action: 'move',
          pawnId: moveData.pawnId,
          fromPosition: currentPawn.position,
          toPosition: moveData.newPosition,
          timestamp: serverTimestamp()
        },
        diceValue: 0, // Reset dice after move
        ...(hasWon ? {
          status: 'finished',
          winner: user.uid,
          finishedAt: serverTimestamp()
        } : {})
      };

      // Set next turn (unless player won)
      if (!hasWon) {
        // Player gets another turn only if they rolled a 6
        if (currentGameState.diceValue !== 6) {
          updateData.currentTurn = getNextPlayerId(finalPlayers, user.uid);
        }
      }

      transaction.update(gameRef, updateData);

      // Emit move via socket
      socket.emit('pawn-move', {
        gameId,
        playerId: user.uid,
        pawnId: moveData.pawnId,
        fromPosition: currentPawn.position,
        newPosition: moveData.newPosition,
        timestamp: Date.now(),
        isWin: hasWon,
        nextTurn: updateData.currentTurn,
        capturedPawns: updateData.lastMove.capturedPawns || []
      });
    });

    return true;
  } catch (error) {
    console.error('Move failed:', error);
    toast.error(error.message || 'Move failed');
    return false;
  }
}, [user, gameState, socket, gameId]);

// Helper function to check safe zones
const isSafeZone = (position, color) => {
  const safeZones = {
    green: [1, 2, 3, 4, 5],
    yellow: [14, 15, 16, 17, 18],
    blue: [27, 28, 29, 30, 31],
    red: [40, 41, 42, 43, 44]
  };
  return safeZones[color]?.includes(parseInt(position)) || false;
};