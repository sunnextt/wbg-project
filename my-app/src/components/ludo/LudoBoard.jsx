import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useGLTF } from '@react-three/drei'
import { useThree, extend } from '@react-three/fiber'
import * as THREE from 'three'
import { DragControls } from 'three/examples/jsm/controls/DragControls'
import { 
  calculateNewPosition,
  isValidMove,
  getPawnId,
  getFinishPosition,
  isCurrentPlayerPawn,
  getPlayerColorFromPawnId,
  getPawnIndexFromPawnId,
  showInvalidMoveFeedback,
  handleAutoPassTurn
} from '../../utils/ludoUtils'

extend({ DragControls })

const LudoBoard = forwardRef((props, ref) => {
  const {nodes, materials , gameState, currentPlayerId, onPawnMove, players, socket, gameId, onPassTurn } = props
  const { camera, gl } = useThree()
  const groupRef = useRef()
  const diceRef = useRef();
  const controlsRef = useRef();
  

  useImperativeHandle(ref, () => ({
    diceRef: diceRef.current
  }));  

   const handlePassTurn = useCallback(() => {
    if (socket && gameId && currentPlayerId) {
      socket.emit('pass-turn', {
        gameId,
        playerId: currentPlayerId,
        timestamp: Date.now()
      });
    }
  }, [socket, gameId, currentPlayerId]);

  const initialPawns = [
    // Green pawns
    { id: 1, geo: nodes.Object_4.geometry, mat: materials.LUDO_COIN_M, pos: [2.232, 0.253, 0.711], scale: 12.073 },
    { id: 2, geo: nodes.Object_28.geometry, mat: materials.LUDO_COIN_M, pos: [1.635, 0.253, -0.001], scale: 12.073 },
    { id: 3, geo: nodes.Object_30.geometry, mat: materials.LUDO_COIN_M, pos: [0.918, 0.253, 0.688], scale: 12.073 },
    { id: 4, geo: nodes.Object_32.geometry, mat: materials.LUDO_COIN_M, pos: [1.612, 0.253, 1.37], scale: 12.073 },

    // Red pawns
    { id: 5, geo: nodes.Object_10.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-2.592, 0.253, 0.711], scale: 12.073 },
    { id: 6, geo: nodes.Object_34.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.2, 0.253, 0.016], scale: 12.073 },
    { id: 7, geo: nodes.Object_36.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.888, 0.253, 0.711], scale: 12.073 },
    { id: 8, geo: nodes.Object_38.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.223, 0.253, 1.37], scale: 12.073 },

    // Blue pawns
    { id: 9, geo: nodes.Object_12.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-2.592, 0.253, -4.089], scale: 12.073 },
    { id: 10, geo: nodes.Object_22.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.212, 0.253, -4.777], scale: 12.073 },
    { id: 11, geo: nodes.Object_24.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.906, 0.253, -4.089], scale: 12.073 },
    { id: 12, geo: nodes.Object_26.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.229, 0.253, -3.44], scale: 12.073 },

    // Yellow pawns
    { id: 13, geo: nodes.Object_14.geometry, mat: materials['LUDO_COIN_M.001'], pos: [0.918, 0.253, -4.106], scale: 12.073 },
    { id: 14, geo: nodes.Object_16.geometry, mat: materials['LUDO_COIN_M.001'], pos: [2.22, 0.253, -4.083], scale: 12.073 },
    { id: 15, geo: nodes.Object_18.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -4.777], scale: 12.073 },
    { id: 16, geo: nodes.Object_20.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -3.446], scale: 12.073 }
  ]

  const [pawns, setPawns] = useState(initialPawns)
  const activeColors = players?.map(player => player.color) || [];
  const [clickablePawns, setClickablePawns] = useState([]);  

 useEffect(() => {
    if (gameState?.players) {
      const updatedPawns = [...initialPawns];
      gameState.players.forEach(player => {
        if (!player.pawns || !Array.isArray(player.pawns)) {
          player.pawns = Array(4).fill({ position: 'home' });
        }
        
        player.pawns.forEach((pawn, index) => {
          const pawnId = getPawnId(player.color, index);
          const pawnIndex = pawnId - 1;
          if (pawnIndex >= 0 && pawnIndex < updatedPawns.length) {
            if (pawn.position === 'home') {
              updatedPawns[pawnIndex].pos = [...initialPawns[pawnIndex].pos];
            } else if (pawn.position === 'finish') {
              updatedPawns[pawnIndex].pos = getFinishPosition(player.color, index);
            } else if (typeof pawn.position === 'object') {
              updatedPawns[pawnIndex].pos = [pawn.position.x, pawn.position.y, pawn.position.z];
            }
          }
        });
      });
      setPawns(updatedPawns);
    }
  }, [gameState]);

    // Update clickable pawns
  //   useEffect(() => {
  //   if (gameState?.players && gameState.currentTurn === currentPlayerId && gameState.diceValue > 0) {
  //     const currentPlayer = players?.find(p => p.id === currentPlayerId);
  //     if (!currentPlayer) return;
      
  //     const movablePawns = currentPlayer.pawns
  //       .map((pawn, index) => {
  //         const calculatedPosition = calculateNewPosition(
  //           pawn.position,
  //           gameState.diceValue,
  //           currentPlayer.color,
  //           index
  //         );
          
  //         return {
  //           pawnIndex: index,
  //           canMove: isValidMove(pawn.position, calculatedPosition, gameState.diceValue, currentPlayer.color),
  //           calculatedPosition
  //         };
  //       })
  //       .filter(pawn => pawn.canMove);
      
  //     setClickablePawns(movablePawns);
  //   } else {
  //     setClickablePawns([]);
  //   }
  // }, [gameState, currentPlayerId, players]);

  const pawnRefs = useRef([])
  
  // Update clickable pawns
  useEffect(() => {
    if (gameState?.players && gameState.currentTurn === currentPlayerId && gameState.diceValue > 0) {
      const currentPlayer = players?.find(p => p.id === currentPlayerId);
      if (!currentPlayer) return;
      
      const movablePawns = currentPlayer.pawns
        .map((pawn, index) => {
          const calculatedPosition = calculateNewPosition(
            pawn.position,
            gameState.diceValue,
            currentPlayer.color,
            index
          );
          
          const validationResult = isValidMove(pawn.position, calculatedPosition, gameState.diceValue, currentPlayer.color);
          
          return {
            pawnIndex: index,
            canMove: validationResult.isValid,
            calculatedPosition
          };
        })
        .filter(pawn => pawn.canMove);
      
      setClickablePawns(movablePawns);
    } else {
      setClickablePawns([]);
    }
  }, [gameState, currentPlayerId, players]);

  // Handle pawn click
  const handlePawnClick = (pawnId, event) => {
    event.stopPropagation();
    
    if (!isCurrentPlayerPawn(pawnId, currentPlayerId, players) || 
        gameState?.currentTurn !== currentPlayerId || 
        gameState?.diceValue <= 0) {
      return;
    }
    
    const playerColor = getPlayerColorFromPawnId(pawnId);
    const playerPawnIndex = getPawnIndexFromPawnId(pawnId);
    
    const currentPlayer = players?.find(p => p.id === currentPlayerId);
    if (!currentPlayer || !currentPlayer.pawns || !Array.isArray(currentPlayer.pawns)) {
      return;
    }
    
    if (playerPawnIndex >= currentPlayer.pawns.length) {
      return;
    }
    
    const currentPawn = currentPlayer.pawns[playerPawnIndex];
    const calculatedPosition = calculateNewPosition(
      currentPawn.position,
      gameState.diceValue,
      playerColor,
      playerPawnIndex
    );
    
    const validationResult = isValidMove(currentPawn.position, calculatedPosition, gameState.diceValue, playerColor);
    
    if (!validationResult.isValid) {
      // console.log('Move validation failed:', validationResult.reason);

     handleAutoPassTurn(currentPlayer, gameState.diceValue, handlePassTurn);
      return;
    }
    
    const newPosition = typeof calculatedPosition === 'object' 
      ? calculatedPosition 
      : {x: 0, y: 0, z: 0};
    
    if (onPawnMove) {
      onPawnMove({
        playerId: currentPlayerId,
        color: playerColor,
        pawnIndex: playerPawnIndex,
        newPosition
      });
    }
    
    // Auto-pass turn if not a 6
    if (gameState.diceValue !== 6) {
      setTimeout(() => {
        handlePassTurn();
      }, 1000);
    }
  };

  // Setup drag controls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    if (pawnRefs.current.length > 0 && 
        gameState?.currentTurn === currentPlayerId && 
        gameState?.diceValue > 0) {
      
      controlsRef.current = new DragControls(
        pawnRefs.current,
        camera,
        gl.domElement
      );

      controlsRef.current.addEventListener('dragstart', (event) => {
        const pawnIndex = pawnRefs.current.findIndex(ref => ref === event.object);
        if (pawnIndex === -1) {
          controlsRef.current?.deactivate();
          return;
        }
        const pawnId = pawnIndex + 1;
        event.object.userData.isOpponentPawn = !isCurrentPlayerPawn(pawnId, currentPlayerId, players);
        event.object.userData.originalPosition = event.object.position.clone();
        event.object.userData.originalOpacity = event.object.material.opacity;
        event.object.material.opacity = 0.8;
      });

      controlsRef.current.addEventListener('drag', (event) => {
        const pawnIndex = pawnRefs.current.findIndex(ref => ref === event.object);
        if (pawnIndex === -1) return;
        const pawnId = pawnIndex + 1;
        if (!isCurrentPlayerPawn(pawnId, currentPlayerId, players)) return;

        const newPosition = {
          x: event.object.position.x,
          y: event.object.position.y,
          z: event.object.position.z
        };

        if (socket) {
          socket.emit('pawn-dragging', {
            gameId,
            playerId: currentPlayerId,
            pawnId,
            newPosition,
          });
        }
      });

      controlsRef.current.addEventListener('dragend', (event) => {
        event.object.material.opacity = event.object.userData.originalOpacity ?? 1;
        const pawnIndex = pawnRefs.current.findIndex(ref => ref === event.object);
        if (pawnIndex === -1) return;
        const pawnId = pawnIndex + 1;
        
        if (!isCurrentPlayerPawn(pawnId, currentPlayerId, players)) {
          if (event.object.userData.originalPosition) {
            event.object.position.copy(event.object.userData.originalPosition);
          }
          return;
        }
        
        const playerColor = getPlayerColorFromPawnId(pawnId);
        const playerPawnIndex = getPawnIndexFromPawnId(pawnId);
        
        const currentPlayer = players?.find(p => p.id === currentPlayerId);
        if (!currentPlayer || !currentPlayer.pawns || !Array.isArray(currentPlayer.pawns)) {
          if (event.object.userData.originalPosition) {
            event.object.position.copy(event.object.userData.originalPosition);
          }
          return;
        }
        
        if (playerPawnIndex >= currentPlayer.pawns.length) {
          if (event.object.userData.originalPosition) {
            event.object.position.copy(event.object.userData.originalPosition);
          }
          return;
        }
        
        const currentPawn = currentPlayer.pawns[playerPawnIndex];
        const calculatedPosition = calculateNewPosition(
          currentPawn.position,
          gameState.diceValue,
          playerColor,
          playerPawnIndex
        );
        
        const validationResult = isValidMove(currentPawn.position, calculatedPosition, gameState.diceValue, playerColor);
        
        if (!validationResult.isValid) {
          console.log('Move validation failed:', validationResult.reason);
          showInvalidMoveFeedback(event.object);
          
          // Auto-pass turn if no valid moves
          handleAutoPassTurn(currentPlayer, gameState.diceValue, handlePassTurn);
          
          if (event.object.userData.originalPosition) {
            event.object.position.copy(event.object.userData.originalPosition);
          }
          return;
        }
        
        const newPosition = typeof calculatedPosition === 'object' 
          ? calculatedPosition 
          : {x: 0, y: 0, z: 0};
        
        // Move the pawn visually
        event.object.position.set(
          newPosition.x,
          newPosition.y,
          newPosition.z
        );
        
        if (onPawnMove) {
          onPawnMove({
            playerId: currentPlayerId,
            color: playerColor,
            pawnIndex: playerPawnIndex,
            newPosition
          });
        }
        
        // Auto-pass turn if not a 6
        if (gameState.diceValue !== 6) {
          setTimeout(() => {
            handlePassTurn();
          }, 1000);
        }
      });

      return () => {
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
      };
    }
  }, [camera, gl, gameState, currentPlayerId, onPawnMove, players, socket, gameId, handlePassTurn]);

// Socket listener for opponent drag
  useEffect(() => {
    if (!socket || !gameId) return;

    const handleOpponentDrag = ({ pawnId, newPosition }) => {
      setPawns(prev =>
        prev.map(p =>
          p.id === pawnId ? { ...p, pos: [newPosition.x, newPosition.y, newPosition.z] } : p
        )
      );
    };

    socket.on("pawn-dragging", handleOpponentDrag);

    return () => {
      socket.off("pawn-dragging", handleOpponentDrag);
    };
  }, [socket, gameId]);

return (
    <group {...props} dispose={null}>
      <mesh castShadow receiveShadow geometry={nodes.Object_6.geometry} material={materials['LUDO_BOARD_UPPER.001']} position={[-0.841, 0.215, -1.715]} scale={14.023} />
      <mesh castShadow receiveShadow geometry={nodes.Object_8.geometry} material={materials.LUDO_BOARD_UPPER} position={[-0.841, 0.215, -1.715]} scale={14.023} />
      {/* <group ref={diceRef} position={[5.178, 0.253, -1.668]} rotation={[Math.PI / 2, 0, 0]} scale={15}>
        <mesh castShadow receiveShadow geometry={nodes.Object_40.geometry} material={materials.DICE_M} />
        <mesh castShadow receiveShadow geometry={nodes.Object_41.geometry} material={materials['Material.002']} />
      </group> */}
      <group ref={groupRef}>
        {pawns.map((pawn, index) => {
          const pawnColor = pawn.id <= 4 ? 'green' : pawn.id <= 8 ? 'red' : pawn.id <= 12 ? 'blue' : 'yellow';
          const isActive = activeColors.includes(pawnColor);
          const isMovable = isActive && isCurrentPlayerPawn(pawn.id, currentPlayerId, players) && 
                           gameState?.currentTurn === currentPlayerId && 
                           gameState?.diceValue > 0;
          
          const isClickable = clickablePawns.some(p => 
            getPawnId(pawnColor, p.pawnIndex) === pawn.id
          );
          
          return (
            <mesh
              key={pawn.id}
              ref={el => pawnRefs.current[index] = el}
              geometry={pawn.geo}
              material={pawn.mat}
              position={pawn.pos}
              scale={isClickable ? pawn.scale * 1.1 : pawn.scale}
              castShadow
              receiveShadow
              visible={isActive}
              userData={{ 
                disabled: !isMovable, 
                pawnId: pawn.id,
                clickable: isClickable
              }}
              onClick={(event) => handlePawnClick(pawn.id, event)}
            />
          );
        })}
      </group>
    </group>
  )
});

export default LudoBoard;