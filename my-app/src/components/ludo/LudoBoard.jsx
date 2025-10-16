import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { useThree, extend } from '@react-three/fiber'
import * as THREE from 'three'
import { DragControls } from 'three/examples/jsm/controls/DragControls'

import {
  isValidMove,
  getPawnId,
  getFinishPosition,
  isCurrentPlayerPawn,
  getPlayerColorFromPawnId,
  getPawnIndexFromPawnId,
  handleAutoPassTurn,
} from '../../utils/ludoUtils'

import {
  animatePawnMoveWithEmission,
  createEmissionCallbacks,
  getPathPositions,
  calculatePawnOffsets,
} from '../../utils/pawnAnimation'
import { useGameStatus } from '@/lib/GameStatusProvider'
import throttle from 'lodash.throttle'
import { Html } from '@react-three/drei'
import { GrabHand, OpenHand, PointerHand } from '../HandIcons'

extend({ DragControls })

const LudoBoard = forwardRef((props, ref) => {
  const { nodes, materials, gameState, currentPlayerId, onPawnMove, passTurn, players, socket, gameId, currentTurn } =
    props

  const { camera, gl } = useThree()
  const groupRef = useRef()
  const diceRef = useRef()
  const controlsRef = useRef()
  const [animatingPawns, setAnimatingPawns] = useState(new Set())

  const { noValidMoves } = useGameStatus()

  useImperativeHandle(ref, () => ({
    diceRef: diceRef.current,
  }))

  const initialPawns = [
    // Green pawns
    { id: 1, geo: nodes.Object_4.geometry, mat: materials.LUDO_COIN_M, pos: [2.232, 0.253, 0.711], scale: 12.073 },
    { id: 2, geo: nodes.Object_28.geometry, mat: materials.LUDO_COIN_M, pos: [1.635, 0.253, -0.001], scale: 12.073 },
    { id: 3, geo: nodes.Object_30.geometry, mat: materials.LUDO_COIN_M, pos: [0.918, 0.253, 0.688], scale: 12.073 },
    { id: 4, geo: nodes.Object_32.geometry, mat: materials.LUDO_COIN_M, pos: [1.612, 0.253, 1.37], scale: 12.073 },

    // Red pawns
    {
      id: 5,
      geo: nodes.Object_10.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-2.592, 0.253, 0.711],
      scale: 12.073,
    },
    {
      id: 6,
      geo: nodes.Object_34.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-3.2, 0.253, 0.016],
      scale: 12.073,
    },
    {
      id: 7,
      geo: nodes.Object_36.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-3.888, 0.253, 0.711],
      scale: 12.073,
    },
    {
      id: 8,
      geo: nodes.Object_38.geometry,
      mat: materials['LUDO_COIN_M.003'],
      pos: [-3.223, 0.253, 1.37],
      scale: 12.073,
    },

    // Blue pawns
    {
      id: 9,
      geo: nodes.Object_12.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-2.592, 0.253, -4.089],
      scale: 12.073,
    },
    {
      id: 10,
      geo: nodes.Object_22.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-3.212, 0.253, -4.777],
      scale: 12.073,
    },
    {
      id: 11,
      geo: nodes.Object_24.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-3.906, 0.253, -4.089],
      scale: 12.073,
    },
    {
      id: 12,
      geo: nodes.Object_26.geometry,
      mat: materials['LUDO_COIN_M.002'],
      pos: [-3.229, 0.253, -3.44],
      scale: 12.073,
    },

    // Yellow pawns
    {
      id: 13,
      geo: nodes.Object_14.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [0.918, 0.253, -4.106],
      scale: 12.073,
    },
    {
      id: 14,
      geo: nodes.Object_16.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [2.22, 0.253, -4.083],
      scale: 12.073,
    },
    {
      id: 15,
      geo: nodes.Object_18.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [1.607, 0.253, -4.777],
      scale: 12.073,
    },
    {
      id: 16,
      geo: nodes.Object_20.geometry,
      mat: materials['LUDO_COIN_M.001'],
      pos: [1.607, 0.253, -3.446],
      scale: 12.073,
    },
  ]

  const [pawns, setPawns] = useState(initialPawns)
  const activeColors = players?.map((player) => player.color) || []
  const [clickablePawns, setClickablePawns] = useState([])
  const [isFromDrag, setIsFromDrag] = useState(false)
  const pawnRefs = useRef([])

  // 🖐️ Hand movement states
  const [isGrabbing, setIsGrabbing] = useState(false)
  const [pawnClick, setPawnClick] = useState(false)
  const [handPosition, setHandPosition] = useState(null)
  const [remoteHands, setRemoteHands] = useState({})
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  // 🧠 Throttled socket emission for hand movement with state
  const emitHandMove = useRef(
    throttle((position, state) => {
      socket?.emit('hand-move', {
        gameId,
        playerId: currentPlayerId,
        position,
        state,
      })
    }, 50),
  ).current

  // 🖱️ Track mouse/hand position with state updates
  useEffect(() => {
    if (!socket) return
    const handleMouseMove = (event) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, camera)

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersection = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(plane, intersection)

      if (intersection) {
        setHandPosition(true)

        let handState = 'normal'
        if (isGrabbing) handState = 'grab'
        else if (pawnClick) handState = 'pointer'

        socket.emit('hand-move', {
          gameId,
          playerId: currentPlayerId,
          position: intersection,
          state: handState,
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [camera, gl, socket, emitHandMove, isGrabbing])

  // 🎯 Listen for remote hand movement with state
  useEffect(() => {
    if (!socket || !gameId) return

    const handleRemoteHandMove = ({ playerId, position, state }) => {
      if (playerId === currentPlayerId) return

      console.log('statestatestate', state)

      setRemoteHands((prev) => ({
        ...prev,
        [playerId]: { position, state },
      }))
    }

    socket.on('hand-move', handleRemoteHandMove)
    return () => socket.off('hand-move', handleRemoteHandMove)
  }, [socket, gameId, currentPlayerId])

  // Group pawns by position for stacking
  const getPawnsByPosition = () => {
    const grouped = {}
    pawns.forEach((pawn, index) => {
      const posKey = `${pawn.pos[0].toFixed(2)},${pawn.pos[2].toFixed(2)}`
      if (!grouped[posKey]) grouped[posKey] = []
      grouped[posKey].push({ pawn, index })
    })
    return grouped
  }

  // Update pawns from gameState
  useEffect(() => {
    if (gameState?.players) {
      const updatedPawns = [...initialPawns]
      gameState.players.forEach((player) => {
        if (!player.pawns || !Array.isArray(player.pawns)) {
          player.pawns = Array(4).fill({ position: 'home' })
        }

        player.pawns.forEach((pawn, index) => {
          const pawnId = getPawnId(player.color, index)
          const pawnIndex = pawnId - 1
          if (pawnIndex >= 0 && pawnIndex < updatedPawns.length) {
            if (pawn.position === 'home') {
              updatedPawns[pawnIndex].pos = [...initialPawns[pawnIndex].pos]
            } else if (pawn.position === 'finish') {
              updatedPawns[pawnIndex].pos = getFinishPosition(player.color, index)
            } else if (typeof pawn.position === 'object') {
              updatedPawns[pawnIndex].pos = [pawn.position.x, pawn.position.y, pawn.position.z]
            }
          }
        })
      })
      setPawns(updatedPawns)
    }
  }, [gameState])

  // HANDLE AUTO PASS TURN IF NO VALID MOVE
  useEffect(() => {
    let timeoutId = null

    if (
      gameState?.currentTurn === currentPlayerId &&
      gameState?.diceValue > 0 &&
      players &&
      animatingPawns.size === 0
    ) {
      const currentPlayer = players.find((p) => p.id === currentPlayerId)
      if (currentPlayer) {
        timeoutId = setTimeout(() => {
          handleAutoPassTurn(currentPlayer, gameState.diceValue, passTurn, noValidMoves, 2000)
        }, 1000)
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [gameState, currentPlayerId, players, animatingPawns, noValidMoves, passTurn])

  const emissionCallbacks = createEmissionCallbacks(socket, gameId, currentPlayerId)

  // attemptPawnMove
  const attemptPawnMove = (pawnId) => {
    const playerColor = getPlayerColorFromPawnId(pawnId)
    const playerPawnIndex = getPawnIndexFromPawnId(pawnId)

    const currentPlayer = players?.find((p) => p.id === currentPlayerId)
    if (!currentPlayer) return false

    const currentPawnState = currentPlayer.pawns[playerPawnIndex]
    const validationResult = isValidMove(currentPawnState.position, gameState.diceValue, playerColor, playerPawnIndex)

    if (!validationResult.isValid) {
      return false
    }

    const newPosition = validationResult.newPos
    const pawnRef = pawnRefs.current[pawnId - 1]
    if (!pawnRef) return false

    // Set pawn ID in userData for reference
    pawnRef.userData.pawnId = pawnId

    if (isFromDrag) {
      let finalPos
      if (typeof newPosition === 'object') {
        finalPos = newPosition
      } else if (newPosition === 'home') {
        const homePos = initialPawns[pawnId - 1]?.pos // Use initialPawns directly
        if (homePos) {
          finalPos = { x: homePos[0], y: homePos[1], z: homePos[2] }
        }
      } else if (newPosition === 'finish') {
        const finishPos = getFinishPosition(playerColor, playerPawnIndex)
        finalPos = { x: finishPos.x, y: finishPos.y, z: finishPos.z }
      }

      if (finalPos) {
        pawnRef.position.set(finalPos.x, finalPos.y || 0.253, finalPos.z)
        // Emit the final position for remote users
        emissionCallbacks.onAnimationPosition(pawnId, finalPos)
      }

      if (onPawnMove) {
        onPawnMove({
          playerId: currentPlayerId,
          color: playerColor,
          pawnIndex: playerPawnIndex,
          newPosition,
        })
      }
      setIsGrabbing(false)
      return true
    }

    // Get current visual position from the mesh
    const startPos = {
      x: pawnRef.position.x,
      y: pawnRef.position.y,
      z: pawnRef.position.z,
    }

    // Calculate the exact final position
    let finalPos
    if (typeof newPosition === 'object') {
      finalPos = newPosition
    } else if (newPosition === 'home') {
      const homePos = initialPawns[pawnId - 1]?.pos // Use initialPawns directly
      if (homePos) {
        finalPos = { x: homePos[0], y: homePos[1], z: homePos[2] }
      }
    } else if (newPosition === 'finish') {
      const finishPos = getFinishPosition(playerColor, playerPawnIndex)
      finalPos = { x: finishPos.x, y: finishPos.y, z: finishPos.z }
    } else {
      return false
    }

    // Get the precise path for animation
    const path = getPathPositions(
      startPos,
      finalPos,
      gameState.diceValue,
      playerColor,
      currentPawnState.position,
      playerPawnIndex,
    )

    if (path.length === 0) {
      // No animation needed, just update position
      pawnRef.position.set(finalPos.x, finalPos.y || 0.253, finalPos.z)

      // Emit position to remote users
      emissionCallbacks.onAnimationPosition(pawnId, finalPos)

      if (!animatingPawns.has(pawnId) && onPawnMove) {
        onPawnMove({
          playerId: currentPlayerId,
          color: playerColor,
          pawnIndex: playerPawnIndex,
          newPosition,
        })
      }

      setIsGrabbing(false)
      return true
    }

    // Start animation
    setAnimatingPawns((prev) => new Set(prev).add(pawnId))

    animatePawnMoveWithEmission(
      pawnRef,
      path,
      () => {
        setAnimatingPawns((prev) => {
          const newSet = new Set(prev)
          newSet.delete(pawnId)
          return newSet
        })

        if (onPawnMove) {
          onPawnMove({
            playerId: currentPlayerId,
            color: playerColor,
            pawnIndex: playerPawnIndex,
            newPosition,
          })
        }
      },
      200,
      emissionCallbacks,
    )
    setIsGrabbing(false)
    return true
  }

  // Socket listeners for remote animations
  useEffect(() => {
    if (!socket || !gameId) return

    const handleRemoteAnimationStart = ({ pawnId, path }) => {
      const pawnRef = pawnRefs.current[pawnId - 1]
      if (!pawnRef) return

      if (isCurrentPlayerPawn(pawnId, currentPlayerId, players)) return

      setAnimatingPawns((prev) => new Set(prev).add(pawnId))

      // Start the same animation locally for the remote pawn
      animatePawnMoveWithEmission(
        pawnRef,
        path,
        () => {
          setAnimatingPawns((prev) => {
            const newSet = new Set(prev)
            newSet.delete(pawnId)
            return newSet
          })
        },
        200,
        {}, // Empty callbacks for remote animations (no need to re-emit)
      )
    }

    const handleRemoteAnimating = ({ pawnId, position }) => {
      if (isCurrentPlayerPawn(pawnId, currentPlayerId, players) || animatingPawns.has(pawnId)) {
        return
      }

      const pawnRef = pawnRefs.current[pawnId - 1]
      if (pawnRef) {
        pawnRef.position.set(position.x, position.y, position.z)
      }
    }

    const handleRemoteAnimationEnd = ({ pawnId, finalPosition }) => {
      const pawnRef = pawnRefs.current[pawnId - 1]
      if (pawnRef) {
        pawnRef.position.set(finalPosition.x, finalPosition.y, finalPosition.z)
        setAnimatingPawns((prev) => {
          const newSet = new Set(prev)
          newSet.delete(pawnId)
          return newSet
        })
      }
    }

    socket.on('pawn-animation-start', handleRemoteAnimationStart)
    socket.on('pawn-animating', handleRemoteAnimating)
    socket.on('pawn-animation-end', handleRemoteAnimationEnd)

    return () => {
      socket.off('pawn-animation-start', handleRemoteAnimationStart)
      socket.off('pawn-animating', handleRemoteAnimating)
      socket.off('pawn-animation-end', handleRemoteAnimationEnd)
    }
  }, [socket, gameId, animatingPawns, currentPlayerId, players])

  useEffect(() => {
    if (gameState?.players && gameState.currentTurn === currentPlayerId && gameState.diceValue > 0) {
      const currentPlayer = players?.find((p) => p.id === currentPlayerId)
      if (!currentPlayer) return

      const movablePawns = currentPlayer.pawns
        .map((pawn, index) => {
          const validationResult = isValidMove(pawn.position, gameState.diceValue, currentPlayer.color, index)
          return {
            pawnIndex: index,
            canMove: validationResult.isValid,
          }
        })
        .filter((p) => p.canMove)

      setClickablePawns(movablePawns)
    } else {
      setClickablePawns([])
    }
  }, [gameState, currentPlayerId, players])

  // Handle pawn click
const handlePawnClick = (pawnId, event) => {
  event.stopPropagation();
  console.log("🖱️ Pawn clicked:", pawnId);

  // If just finished dragging, ignore accidental click
  if (isFromDrag) {
    setIsFromDrag(false);
    return;
  }

  if (
    !isCurrentPlayerPawn(pawnId, currentPlayerId, players) ||
    gameState?.currentTurn !== currentPlayerId ||
    gameState?.diceValue <= 0 ||
    animatingPawns.has(pawnId)
  ) {
    return;
  }

  attemptPawnMove(pawnId);
};

// Setup drag controls
useEffect(() => {
  if (controlsRef.current) {
    controlsRef.current.dispose();
    controlsRef.current = null;
  }

  if (gameState?.currentTurn === currentPlayerId && gameState?.diceValue > 0) {
    const currentPlayerPawnRefs = pawnRefs.current.filter((ref, index) => {
      if (!ref) return false;
      const pawnId = index + 1;

      if (!isCurrentPlayerPawn(pawnId, currentPlayerId, players)) return false;
      if (animatingPawns.has(pawnId)) return false;

      const playerColor = getPlayerColorFromPawnId(pawnId);
      const playerPawnIndex = getPawnIndexFromPawnId(pawnId);
      const currentPlayer = players?.find((p) => p.id === currentPlayerId);
      if (!currentPlayer) return false;

      const pawnState = currentPlayer.pawns[playerPawnIndex];
      const validationResult = isValidMove(pawnState.position, gameState.diceValue, playerColor, playerPawnIndex);
      return validationResult.isValid;
    });

    if (currentPlayerPawnRefs.length > 0) {
      controlsRef.current = new DragControls(currentPlayerPawnRefs, camera, gl.domElement);

      controlsRef.current.addEventListener('dragstart', (event) => {
        setIsFromDrag(true);
        setIsGrabbing(true);
        emitHandMove(handPosition, 'grab');

        const pawnIndex = pawnRefs.current.findIndex((ref) => ref === event.object);
        if (pawnIndex === -1) return;
        const pawnId = pawnIndex + 1;

        event.object.userData.originalPosition = event.object.position.clone();
        event.object.material.opacity = 0.8;
      });

      controlsRef.current.addEventListener('drag', (event) => {
        emitHandMove(handPosition, 'grab');
        const pawnIndex = pawnRefs.current.findIndex((ref) => ref === event.object);
        if (pawnIndex === -1) return;
        const pawnId = pawnIndex + 1;

        const newPosition = {
          x: event.object.position.x,
          y: event.object.position.y,
          z: event.object.position.z,
        };

        socket?.emit('pawn-dragging', { gameId, playerId: currentPlayerId, pawnId, newPosition });
      });

      controlsRef.current.addEventListener('dragend', (event) => {
        emitHandMove(handPosition, 'normal');
        setIsGrabbing(false);

        const pawnIndex = pawnRefs.current.findIndex((ref) => ref === event.object);
        if (pawnIndex === -1) return;
        const pawnId = pawnIndex + 1;

        const success = attemptPawnMove(pawnId);

        if (!success && event.object.userData.originalPosition) {
          // Snap back to start
          event.object.position.copy(event.object.userData.originalPosition);
          socket?.emit('pawn-dragging', {
            gameId,
            playerId: currentPlayerId,
            pawnId,
            newPosition: {
              x: event.object.position.x,
              y: event.object.position.y,
              z: event.object.position.z,
            },
          });
        }

        // Allow next click
        setTimeout(() => setIsFromDrag(false), 100);
      });
    }
  }

  return () => controlsRef.current?.dispose();
}, [camera, gl, gameState, currentPlayerId, players, animatingPawns, handPosition, socket]);

  // Socket listener for opponent drag
  useEffect(() => {
    if (!socket || !gameId) return
    const handleOpponentDrag = ({ pawnId, newPosition }) => {
      setPawns((prev) =>
        prev.map((p) => (p.id === pawnId ? { ...p, pos: [newPosition.x, newPosition.y, newPosition.z] } : p)),
      )
    }
    socket.on('pawn-dragging', handleOpponentDrag)
    return () => socket.off('pawn-dragging', handleOpponentDrag)
  }, [socket, gameId])

  const playerColorMap = {
    red: 'red',
    green: 'limegreen',
    blue: 'deepskyblue',
    yellow: 'gold',
  }

  // 🖐️ Render hand indicators
  const renderHands = () => {
    const elements = []

    const getCurrentTurnColor = () => {
      if (!gameState?.currentTurn) return '#ffffff'

      const currentTurnPlayer = players?.find((p) => p.id === gameState.currentTurn)
      if (!currentTurnPlayer) return '#ffffff'

      return playerColorMap[currentTurnPlayer.color] || '#ffffff'
    }

    const currentTurnColor = getCurrentTurnColor()

    if (currentPlayerId === currentTurn) return

    // ✋ Remote users' hands with their states
    Object.entries(remoteHands).forEach(([playerId, handData]) => {
      if (!handData?.position) return

      const getHandEmoji = () => {
        if (handData.state === 'grab') return GrabHand
        if (handData.state === 'pointer') return PointerHand
        return OpenHand
      }
      const Emoji = getHandEmoji()

      elements.push(
        <Html
          key={`remote-hand-${playerId}`}
          position={[handData.position.x, 1.4, handData.position.z]}
          center
          style={{
            pointerEvents: 'none',
          }}
        >
          <Emoji color={currentTurnColor} size={30} />
        </Html>,
      )
    })

    return elements
  }

  // Render pawns with stacking
  const renderPawns = () => {
    const pawnsByPosition = getPawnsByPosition()

    return pawns.map((pawn, index) => {
      const pawnColor = pawn.id <= 4 ? 'green' : pawn.id <= 8 ? 'red' : pawn.id <= 12 ? 'blue' : 'yellow'

      const isActive = activeColors.includes(pawnColor)
      const isMovable =
        isActive &&
        isCurrentPlayerPawn(pawn.id, currentPlayerId, players) &&
        gameState?.currentTurn === currentPlayerId &&
        gameState?.diceValue > 0 &&
        !animatingPawns.has(pawn.id)

      const isClickable = clickablePawns.some((p) => getPawnId(pawnColor, p.pawnIndex) === pawn.id)
      const isAnimating = animatingPawns.has(pawn.id)

      // Calculate stacking offsets
      const posKey = `${pawn.pos[0].toFixed(2)},${pawn.pos[2].toFixed(2)}`
      const pawnsInCell = pawnsByPosition[posKey] || []
      const pawnIndexInCell = pawnsInCell.findIndex((p) => p.index === index)

      const offsets = calculatePawnOffsets(pawnsInCell, pawnIndexInCell)

      const adjustedPosition = [pawn.pos[0] + offsets.x, pawn.pos[1], pawn.pos[2] + offsets.z]

      return (
        <mesh
          key={pawn.id}
          ref={(el) => (pawnRefs.current[index] = el)}
          geometry={pawn.geo}
          material={pawn.mat}
          position={adjustedPosition}
          scale={isClickable && !isAnimating ? pawn.scale * 1.1 * offsets.scale : pawn.scale * offsets.scale}
          castShadow
          receiveShadow
          visible={isActive}
          userData={{
            disabled: !isMovable,
            pawnId: pawn.id,
            clickable: isClickable,
            isAnimating,
            isCurrentPlayerPawn: isCurrentPlayerPawn(pawn.id, currentPlayerId, players),

          }}
          onClick={(event) => handlePawnClick(pawn.id, event)}
        />
      )
    })
  }

  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        material={materials['LUDO_BOARD_UPPER.001']}
        position={[-0.841, 0.215, -1.715]}
        scale={14.023}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_8.geometry}
        material={materials.LUDO_BOARD_UPPER}
        position={[-0.841, 0.215, -1.715]}
        scale={14.023}
      />
      <group ref={groupRef}>
        {renderPawns()}
        {renderHands()}
      </group>
    </group>
  )
})

export default LudoBoard
