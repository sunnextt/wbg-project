import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useGLTF } from '@react-three/drei'
import { useThree, extend } from '@react-three/fiber'
import * as THREE from 'three'
import { DragControls } from 'three/examples/jsm/controls/DragControls'

extend({ DragControls })

const LudoBoard = forwardRef((props, ref) => {
  const { nodes, materials } = useGLTF('/ludo_board_games.glb')
  const { gameState, currentPlayerId, onPawnMove, players, socket, gameId, onPassTurn } = props
  const { camera, gl } = useThree()
  const groupRef = useRef()
  const diceRef = useRef();
  const controlsRef = useRef();
  
  // Board configuration
  const BOARD_CONFIG = {
    // Main track positions (52 positions, moving clockwise)
    mainTrack: [
      {x: 2.4186665699954344, y: 0.25300116466734257, z: -1.1656155970760989},
      {x: 1.8526851583320902, y: 0.2530011428978808, z: -1.143847081242876},
      {x: 1.341125036251694, y: 0.2530011646673648, z: -1.1656155970760782},
      {x: 0.764259366671668, y: 0.25300117555210677, z: -1.176499854992679},
      {x: 0.22004647084145804, y: 0.25300115378262056, z: -1.154731339159489},
      {x: -0.2915136512389425, y: 0.25300062043027827, z: -0.6214027012461427},
      {x: -0.30239790915554743, y: 0.25300007619319176, z: -0.07718980541620396},
      {x: -0.3023979091555483, y: 0.25299953195610525, z: 0.46702309041373946},
      {x: -0.31328216707215206, y: 0.25299900948850274, z: 0.9894674704104798},
      {x: -0.2697451354057353, y: 0.25299845436667645, z: 1.5445646241570246},
      {x: -0.31328216707215056, y: 0.25299789924485017, z: 2.0996617779035502},
      {x: -0.8357265470691524, y: 0.25299792101433194, z: 2.0778932620703405},
      {x: -1.3690551849827597, y: 0.2529979536685557, z: 2.0452404883205366},
      {x: -1.369055184982756, y: 0.25299849790564, z: 1.5010275924905918},
      {x: -1.3581709270661575, y: 0.2529990312579845, z: 0.9676989545772532},
      {x: -1.3581709270661566, y: 0.25299953195610303, z: 0.46702309041370527},
      {x: -1.3799394428993619, y: 0.25300007619318954, z: -0.07718980541623574},
      {x: -1.379939442899358, y: 0.2530006204302716, z: -0.6214027012461756},
      {x: -1.924152338729583, y: 0.2530011646673581, z: -1.1656155970761237},
      {x: -2.446596718726581, y: 0.2530011428978741, z: -1.1438470812429222},
      {x: -2.969041098723597, y: 0.25300116466736033, z: -1.1656155970761237},
      {x: -3.49148547872061, y: 0.25300117555210455, z: -1.1764998549927248},
      {x: -4.046582632467429, y: 0.25300117555210677, z: -1.1764998549927248},
      {x: -4.57991127038104, y: 0.25300117555210677, z: -1.1764998549927248},
      {x: -4.612564044130866, y: 0.2530016980197093, z: -1.6989442349894712},
      {x: -4.579911270381042, y: 0.2530022422567958, z: -2.243157130819406},
      {x: -4.035698374550838, y: 0.25300219871783003, z: -2.199620099153015},
      {x: -3.5132539945538186, y: 0.253002231372056, z: -2.232272872902803},
      {x: -2.9690410987236056, y: 0.2530022313720538, z: -2.2322728729028025},
      {x: -2.44659671872662, y: 0.2530022204873118, z: -2.22138861498622},
      {x: -1.913268080813013, y: 0.2530022313720538, z: -2.232272872902822},
      {x: -1.369055184982793, y: 0.2530027647243983, z: -2.765601510816151},
      {x: -1.3581709270661955, y: 0.2530032980767406, z: -3.2989301487295073},
      {x: -1.3690551849827974, y: 0.2530038531985691, z: -3.8540273024760436},
      {x: -1.369055184982799, y: 0.2530043647814274, z: -4.3655874245561925},
      {x: -1.3581709270662004, y: 0.2530048981337697, z: -4.898916062469554},
      {x: -1.3690551849828003, y: 0.2530054423708562, z: -5.44312895829948},
      {x: -0.8248422891525866, y: 0.2530054423708562, z: -5.443128958299479},
      {x: -0.29151365123897865, y: 0.2530054423708562, z: -5.443128958299479},
      {x: -0.29151365123897854, y: 0.2530048763642857, z: -4.877147546636335},
      {x: -0.30239790915558334, y: 0.2530043756661672, z: -4.376471682472792},
      {x: -0.3023979091555814, y: 0.25300383142908067, z: -3.8322587866428255},
      {x: -0.3023979091555794, y: 0.25300328719199416, z: -3.288045890812862},
      {x: -0.29151365123897416, y: 0.25300275383964965, z: -2.7547172528995043},
      {x: 0.22004647084142567, y: 0.25300222048730736, z: -2.221388614986174},
      {x: 0.7860278825048483, y: 0.25300222048730736, z: -2.221388614986174},
      {x: 1.3302407783350603, y: 0.2530022204873096, z: -2.221388614986174},
      {x: 1.8744536741652718, y: 0.2530022096025676, z: -2.210504357069571},
      {x: 2.407782312078888, y: 0.2530022313720516, z: -2.232272872902777},
      {x: 2.9302266920758835, y: 0.25300220960256536, z: -2.210504357069572},
      {x: 2.9519952079090754, y: 0.25300166536547664, z: -1.6662914612396171},
      {x: 2.941110949992469, y: 0.2530011537826139, z: -1.154731339159472}
    ],
    homeColumns: {
      green: [
        {x: 2.418666569995451, y: 0.25300168713495397, z: -1.6880599770728084},
        {x: 1.8635694162486311, y: 0.25300167625021197, z: -1.6771757191562067},
        {x: 1.3411250362516223, y: 0.25300166536547, z: -1.6662914612396045},
        {x: 0.7860278825048104, y: 0.25300169801969374, z: -1.6989442349894104},
        {x: 0.24181498667459778, y: 0.2530017089044335, z: -1.7098284929060128},
        {x: -0.3568191987386374, y: 0.2530016871349495, z: -1.6880599770728089}
      ],
      red: [
        {x: -0.8466108049858279, y: 0.25299845436666313, z: 1.544564624157051},
        {x: -0.8248422891526215, y: 0.2529990312579734, z: 0.9676989545773146},
        {x: -0.835726547069229, y: 0.2529995646103179, z: 0.4343703166639739},
        {x: -0.8248422891526266, y: 0.25300008707792043, z: -0.08807406333276921},
        {x: -0.813958031236029, y: 0.2530006421997467, z: -0.6431712170793127},
        {x: -0.7921895154028182, y: 0.25300124086053877, z: -1.2418054024922454}
      ],
      blue: [
        {x: -4.0465826324675005, y: 0.2530016980196893, z: -1.6989442349893995},
        {x: -3.502369736637289, y: 0.2530016980196871, z: -1.6989442349894002},
        {x: -2.969041098723687, y: 0.2530017089044291, z: -1.7098284929060021},
        {x: -2.435712460810091, y: 0.25300168713494287, z: -1.6880599770728146},
        {x: -1.9023838228964804, y: 0.2530016871349451, z: -1.6880599770728144},
        {x: -1.3472866691496672, y: 0.2530016544807213, z: -1.6554072033230247}
      ],
      yellow: [
        {x: -0.8030737733194495, y: 0.2530048981337497, z: -4.898916062469471},
        {x: -0.8248422891526541, y: 0.2530043647814074, z: -4.365587424556107},
        {x: -0.8248422891526579, y: 0.2530038314290629, z: -3.832258786642784},
        {x: -0.8248422891526588, y: 0.2530032763072366, z: -3.277161632896248},
        {x: -0.8357265470692666, y: 0.2530027429548921, z: -2.7438329949829194},
        {x: -0.8466108049858707, y: 0.25300217694832383, z: -2.17785158331978}
      ]
    },
    startPositions: {
      green: {x: 2.4186665699954344, y: 0.25300116466734257, z: -1.1656155970760989},
      red: {x: -1.369055184982756, y: 0.25299849790564, z: 1.5010275924905918},
      blue: {x: -4.035698374550838, y: 0.25300219871783003, z: -2.199620099153015},
      yellow: {x: -0.29151365123897854, y: 0.2530048763642857, z: -4.877147546636335}
    },
    entryPositions: {
      green: {x: 2.9519952079090754, y: 0.25300166536547664, z: -1.6662914612396171},
      red: {x: -0.8357265470691524, y: 0.25299792101433194, z: 2.0778932620703405},
      blue: {x: -4.612564044130866, y: 0.2530016980197093, z: -1.6989442349894712},
      yellow: {x: -0.8248422891525866, y: 0.2530054423708562, z: -5.443128958299479}
    },
    finishPositions: {
      green: [
        {x: 3.7247775199880104, y: 0.25299996734577623, z: 0.03165277374979708},
        {x: 3.7449117803298537, y: 0.25300009796267353, z: 0.6130416832880413},
        {x: 3.7453143613796334, y: 0.25300015238636797, z: 1.2176204027586712},
        {x: 3.7370226740413335, y: 0.2529988571021725, z: 1.8308470300161845}
      ],
      red: [
        {x: -5.454065854236601, y: 0.2529961087038036, z: -0.1978767599723966},
        {x: -5.469343589062729, y: 0.2529961515832636, z: 0.4082456864742733},
        {x: -5.463063132176632, y: 0.2529942005748288, z: 1.0221674024141132},
        {x: -5.428147383152088, y: 0.25299427561385934, z: 1.6351317084703512}
      ],
      blue: [
        {x: -5.417428035383397, y: 0.2530006217498072, z: -4.710722170582941},
        {x: -5.447904894430558, y: 0.2530000428792979, z: -3.4828773892643383},
        {x: -5.45234378392821, y: 0.2529993032113932, z: -4.080242363850439},
        {x: -5.432627158699244, y: 0.2529988208193358, z: -2.909871745446172}
      ],
      yellow: [
        {x: 3.7138932620714, y: 0.2530029933039736, z: -2.9941709270646766},
        {x: 3.7340275229174265, y: 0.2530042885880358, z: -3.5773974205012022},
        {x: 3.6908930766505628, y: 0.253005496794071, z: -4.126549757633557},
        {x: 3.704369901755158, y: 0.25300546414009595, z: -4.775897229220273}
      ]
    }
  };

  useImperativeHandle(ref, () => ({
    diceRef: diceRef.current
  }));  

  // Initial pawn positions
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

  const isCurrentPlayerPawn = (pawnId) => {
    if (!currentPlayerId) return false;
    const currentPlayer = players?.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return false;
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

  // Calculate new position based on game rules
  const calculateNewPosition = (currentPosition, diceValue, color, pawnIndex) => {
    const { mainTrack, startPositions, entryPositions, homeColumns } = BOARD_CONFIG;
    
    // If pawn is at home
    if (currentPosition === 'home') {
      if (diceValue === 6) {
        return startPositions[color]; // Move to start position
      }
      return 'home'; // Stay at home
    }
    
    // If pawn is at finish
    if (currentPosition === 'finish') {
      return 'finish'; // Already finished
    }
    
    // If pawn is on the main track
    let currentTrackIndex = -1;
    
    // Find current position on the main track
    if (typeof currentPosition === 'object') {
      currentTrackIndex = mainTrack.findIndex(pos => 
        Math.abs(pos.x - currentPosition.x) < 0.1 &&
        Math.abs(pos.y - currentPosition.y) < 0.1 &&
        Math.abs(pos.z - currentPosition.z) < 0.1
      );
    }
    
    // If pawn is at a start position (not yet on main track)
    if (currentTrackIndex === -1 && 
        Math.abs(startPositions[color].x - currentPosition.x) < 0.1 &&
        Math.abs(startPositions[color].y - currentPosition.y) < 0.1 &&
        Math.abs(startPositions[color].z - currentPosition.z) < 0.1) {
      currentTrackIndex = mainTrack.findIndex(pos => 
        Math.abs(pos.x - startPositions[color].x) < 0.1 &&
        Math.abs(pos.y - startPositions[color].y) < 0.1 &&
        Math.abs(pos.z - startPositions[color].z) < 0.1
      );
    }
    
    // Calculate new track position
    if (currentTrackIndex !== -1) {
      const newTrackIndex = (currentTrackIndex + diceValue) % mainTrack.length;
      const newPosition = mainTrack[newTrackIndex];
      
      // Check if pawn should enter home column
      const entryPosition = entryPositions[color];
      const isAtEntryPoint = newTrackIndex === mainTrack.findIndex(pos => 
        Math.abs(pos.x - entryPosition.x) < 0.1 &&
        Math.abs(pos.y - entryPosition.y) < 0.1 &&
        Math.abs(pos.z - entryPosition.z) < 0.1
      );
      
      if (isAtEntryPoint) {
        // Move to first position in home column
        return homeColumns[color][0];
      }
      
      return newPosition;
    }
    
    // If pawn is in home column
    let currentHomeIndex = -1;
    if (typeof currentPosition === 'object') {
      currentHomeIndex = homeColumns[color].findIndex(pos => 
        Math.abs(pos.x - currentPosition.x) < 0.1 &&
        Math.abs(pos.y - currentPosition.y) < 0.1 &&
        Math.abs(pos.z - currentPosition.z) < 0.1
      );
    }
    
    if (currentHomeIndex !== -1) {
      const newHomeIndex = currentHomeIndex + diceValue;
      
      if (newHomeIndex < homeColumns[color].length) {
        // Move forward in home column
        return homeColumns[color][newHomeIndex];
      } else if (newHomeIndex === homeColumns[color].length) {
        // Exactly reached the end of home column - finish!
        return 'finish';
      } else {
        // Overshot the home column - can't move
        return currentPosition;
      }
    }
    
    // Default case - shouldn't happen
    return currentPosition;
  };

  // Validate if a move is legal
  const isValidMove = (pawnPosition, newPosition, diceValue, color) => {
    // Can't move if not your turn or no dice roll
    if (diceValue === 0) return false;
    
    // Can only move out of home with a 6
    if (pawnPosition === 'home' && diceValue !== 6) {
      return false;
    }
    
    // Can't move finished pawns
    if (pawnPosition === 'finish') {
      return false;
    }
    
    // Check if the move would actually change position
    if (JSON.stringify(pawnPosition) === JSON.stringify(newPosition)) {
      return false;
    }
    
    return true;
  };

  const getPawnId = (color, index) => {
    const colorMap = {
      green: { start: 1, count: 4 },
      red: { start: 5, count: 4 },
      blue: { start: 9, count: 4 },
      yellow: { start: 13, count: 4 }
    }
    return colorMap[color]?.start + index
  }

  const getFinishPosition = (color, pawnIndex) => {
    const finishPositions = BOARD_CONFIG.finishPositions[color];
    return finishPositions[pawnIndex] || [0, 0, 0];
  }

  useEffect(() => {
    if (gameState?.players) {
      const updatedPawns = [...initialPawns]
      gameState.players.forEach(player => {
        player.pawns?.forEach((pawn, index) => {
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

  const pawnRefs = useRef([])
  

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
        event.object.userData.isOpponentPawn = !isCurrentPlayerPawn(pawnId);
        event.object.userData.originalPosition = event.object.position.clone();
        event.object.userData.originalOpacity = event.object.material.opacity;
        event.object.material.opacity = 0.8;
      });

      // 🔹 Live dragging sync
      controlsRef.current.addEventListener('drag', (event) => {
        const pawnIndex = pawnRefs.current.findIndex(ref => ref === event.object);
        if (pawnIndex === -1) return;
        const pawnId = pawnIndex + 1;
        if (!isCurrentPlayerPawn(pawnId)) return;

        const newPosition = {
          x: event.object.position.x,
          y: event.object.position.y,
          z: event.object.position.z
        };

        // Emit via socket for live update
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
        
        if (!isCurrentPlayerPawn(pawnId)) {
          if (event.object.userData.originalPosition) {
            event.object.position.copy(event.object.userData.originalPosition);
          }
          return;
        }
        
        const playerColor = 
          pawnId <= 4 ? 'green' :
          pawnId <= 8 ? 'red' :
          pawnId <= 12 ? 'blue' : 'yellow';
        
        const playerPawnIndex = (pawnId - 1) % 4;
        
        // Calculate the new position based on game rules
        const currentPlayer = players?.find(p => p.id === currentPlayerId);
        if (!currentPlayer) return;
        
        const currentPawn = currentPlayer.pawns[playerPawnIndex];
        const calculatedPosition = calculateNewPosition(
          currentPawn.position,
          gameState.diceValue,
          playerColor,
          playerPawnIndex
        );
        
        // Validate the move
        if (!isValidMove(currentPawn.position, calculatedPosition, gameState.diceValue, playerColor)) {
          if (event.object.userData.originalPosition) {
            event.object.position.copy(event.object.userData.originalPosition);
          }
          return;
        }
        
        // Use the calculated position instead of the dragged position
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
        
        // After a valid move, check if we need to pass turn
        if (gameState.diceValue !== 6 && onPassTurn) {
          // Pass turn to next player if not a 6
          setTimeout(() => {
            onPassTurn();
          }, 1000);
        }
      });

      return () => {
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
      };
    }
  }, [camera, gl, gameState, currentPlayerId, onPawnMove, players, socket, gameId, onPassTurn]);


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
      <group ref={diceRef} position={[5.178, 0.253, -1.668]} rotation={[Math.PI / 2, 0, 0]} scale={15}>
        <mesh castShadow receiveShadow geometry={nodes.Object_40.geometry} material={materials.DICE_M} />
        <mesh castShadow receiveShadow geometry={nodes.Object_41.geometry} material={materials['Material.002']} />
      </group>
      <group ref={groupRef}>
        {pawns.map((pawn, index) => {
          const pawnColor = pawn.id <= 4 ? 'green' : pawn.id <= 8 ? 'red' : pawn.id <= 12 ? 'blue' : 'yellow';
          const isActive = activeColors.includes(pawnColor);
          const isMovable = isActive && isCurrentPlayerPawn(pawn.id) && 
                           gameState?.currentTurn === currentPlayerId && 
                           gameState?.diceValue > 0;
          return (
            <mesh
              key={pawn.id}
              ref={el => pawnRefs.current[index] = el}
              geometry={pawn.geo}
              material={pawn.mat}
              position={pawn.pos}
              scale={pawn.scale}
              castShadow
              receiveShadow
              visible={isActive}
              userData={{ disabled: !isMovable, pawnId: pawn.id }}
            />
          );
        })}
      </group>
    </group>
  )
});

useGLTF.preload('/ludo_board_games.glb')

export default LudoBoard;