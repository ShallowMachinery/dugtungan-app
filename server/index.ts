import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom, Player, rooms, onlinePlayers } from './gameInit';
import { initializeDictionaryMaps, validateWord } from './utils/validator';
import { generateNewSyllable } from './utils/roomFunctions';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "*"
}));
app.use(express.json());

initializeDictionaryMaps();

function endRoom(roomId: string) {
  console.log('\n=== Ending Room ===');
  console.log('Room ID:', roomId);
  
  const room = rooms.get(roomId);
  if (room) {
    console.log('Room found, cleaning up');
    
    // Clear any existing timer
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }
    
    // Reset all player scores and notify each player individually
    room.players.forEach((player, playerId) => {
      if (onlinePlayers.has(playerId)) {
        onlinePlayers.get(playerId)!.score = 0;
        onlinePlayers.get(playerId)!.isInGame = false;
      }
      // Notify each player individually that they've left the room
      io.to(playerId).emit('leftRoom');
    });
    
    // Delete the room
    rooms.delete(roomId);
    console.log('Room deleted');
    
    // Notify all players in the room that the room has ended
    io.to(roomId).emit('roomEnded');
    
    // Update available rooms list
    io.emit('availableRooms', Array.from(rooms.entries())
      .filter(([_, room]) => !room.isActive)
      .map(([id, room]) => ({
        id,
        ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
        playerCount: room.players.size,
        difficulty: room.difficulty,
        isActive: room.isActive
      }))
    );

    // Update online players list
    io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
  } else {
    console.log('Room not found');
  }
}

function moveToNextTurn(room: GameRoom) {
  console.log('\n=== Moving to Next Turn ===');
  console.log('Current player:', room.currentPlayerId);
  
  // Check if room is empty
  if (room.players.size === 0) {
    console.log('Room is empty, ending turn cycle');
    return;
  }
  
  // Move to next player
  const playerIds = Array.from(room.players.keys());
  console.log('All players:', playerIds);
  
  const currentIndex = playerIds.indexOf(room.currentPlayerId!);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  room.currentPlayerId = playerIds[nextIndex];
  console.log('Next turn set to:', room.currentPlayerId);
  
  // Reset timer and generate new syllable
  room.timeLeft = Math.floor(Math.random() * 6) + 5;
  generateNewSyllable(room);
  
  // Notify all players
  io.to(room.id).emit('turnChanged', {
    currentPlayerId: room.currentPlayerId,
    timeLeft: room.timeLeft,
    currentSyllable: room.currentSyllable
  });

  // Start new timer for next player
  startGameTimer(room);
}

function startGameTimer(room: GameRoom) {
  console.log('\n=== Starting Game Timer ===');
  console.log('Room ID:', room.id);
  console.log('Current player:', room.currentPlayerId);
  console.log('Time left:', room.timeLeft);

  // Clear any existing timer
  if (room.timer) {
    console.log('Clearing existing timer');
    clearInterval(room.timer);
    room.timer = null;
  }

  // Check if room is empty
  if (room.players.size === 0) {
    console.log('Room is empty, scheduling room end in 15 seconds');
    setTimeout(() => {
      if (room.players.size === 0) {
        console.log('Room still empty after 15 seconds, ending room');
        endRoom(room.id);
      }
    }, 15000);
    return;
  }

  // Set initial turn to the first player if not set
  if (!room.currentPlayerId) {
    const playerIds = Array.from(room.players.keys());
    console.log('Setting initial turn. Available players:', playerIds);
    if (playerIds.length > 0) {
      room.currentPlayerId = playerIds[0];
      console.log('Initial turn set to:', room.currentPlayerId);
    }
  }

  // Start the timer
  room.timer = setInterval(() => {
    // Check if room is empty
    if (room.players.size === 0) {
      console.log('Room is empty, stopping timer');
      if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
      }
      return;
    }

    room.timeLeft -= 1;
    console.log(`Timer tick - Time left: ${room.timeLeft}s for player ${room.currentPlayerId}`);
    
    if (room.timeLeft <= 0) {
      console.log('Time\'s up for player:', room.currentPlayerId);
      moveToNextTurn(room);
    } else {
      // Just update the time
      io.to(room.id).emit('timeUpdate', { timeLeft: room.timeLeft });
    }
  }, 1000);
}

io.on('connection', (socket) => {
  console.log('\n=== New User Connected ===');
  console.log('Socket ID:', socket.id);

  // Send initial data to the newly connected client
  socket.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
  socket.emit('availableRooms', Array.from(rooms.entries())
    .filter(([_, room]) => !room.isActive)
    .map(([id, room]) => ({
      id,
      ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
      playerCount: room.players.size,
      difficulty: room.difficulty,
      isActive: room.isActive
    }))
  );

  socket.on('setPlayerName', (name: string) => {
    console.log('\n=== User Set Name ===');
    console.log('Socket ID:', socket.id);
    console.log('Player Name:', name);

    const player: Player = {
      id: socket.id,
      name: name,
      score: 0,
      isInGame: false
    };

    onlinePlayers.set(socket.id, player);
    console.log('Added to online players:', player);
    io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
  });

  socket.on('createRoom', () => {

    console.log('\n=== Room Creation ===');
    console.log('Created by Socket ID:', socket.id);

    const roomId = Math.random().toString(36).substring(7);
    const owner = onlinePlayers.get(socket.id);

    if (owner) {
      owner.isInGame = true;
      const room: GameRoom = {
        id: roomId,
        ownerId: socket.id,
        players: new Map([[socket.id, owner]]),
        currentSyllable: '',
        timeLeft: 30,
        isActive: false,
        timer: null,
        difficulty: 'easy',
        currentPlayerId: null
      };
      rooms.set(roomId, room);
      console.log('Room created:', roomId);
      socket.join(roomId);
      socket.emit('roomCreated', { roomId, isOwner: true });
      // Notify the room creator about the players list
      socket.emit('playerJoined', Array.from(room.players.values()).map(player => ({
        ...player,
        isOwner: player.id === room.ownerId
      })));
      // Notify all clients about available rooms
      io.emit('availableRooms', Array.from(rooms.entries())
        .filter(([_, room]) => !room.isActive)
        .map(([id, room]) => ({
          id,
          ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
          playerCount: room.players.size,
          difficulty: room.difficulty,
          isActive: room.isActive
        }))
      );
      // Update online players list
      io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
    }
  });

  socket.on('getAvailableRooms', () => {
    socket.emit('availableRooms', Array.from(rooms.entries())
      .filter(([_, room]) => !room.isActive)
      .map(([id, room]) => ({
        id,
        ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
        playerCount: room.players.size,
        difficulty: room.difficulty,
        isActive: room.isActive
      }))
    );
  });

  socket.on('joinRoom', (roomId: string) => {
    console.log('\n=== Room Join Attempt ===');
    console.log('Socket ID:', socket.id);
    console.log('Attempting to join room:', roomId);

    const room = rooms.get(roomId);
    if (room && !room.isActive) {
      console.log('Room found and available');
      const player = onlinePlayers.get(socket.id);
      if (player) {
        player.isInGame = true;
        console.log('Adding player to room:', player.name);
        player.currentRoomId = roomId;
        room.players.set(socket.id, player);
        console.log('\n=== Room Players After Join ===');
        console.log('Room ID:', roomId);
        console.log('Current players:', Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })));
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, isOwner: false });
        io.to(roomId).emit('playerJoined', Array.from(room.players.values()).map(player => ({
          ...player,
          isOwner: player.id === room.ownerId
        })));
        io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
        // Notify all clients about available rooms
        io.emit('availableRooms', Array.from(rooms.entries())
          .filter(([_, room]) => !room.isActive)
          .map(([id, room]) => ({
            id,
            ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
            playerCount: room.players.size,
            difficulty: room.difficulty,
            isActive: room.isActive
          }))
        );
      }
    } else {
      console.log('Room not found or game already active');
    }
  });

  socket.on('startGame', (roomId: string) => {
    console.log('\n=== Game Start Request ===');
    console.log('Room ID:', roomId);
    console.log('Requested by Socket ID:', socket.id);
    
    const room = rooms.get(roomId);
    if (room && room.ownerId === socket.id) {
      console.log('Starting game');
      console.log('Room players:', Array.from(room.players.keys()));
      room.isActive = true;
      room.timeLeft = Math.floor(Math.random() * 6) + 5;
      generateNewSyllable(room);
      
      // Set initial turn
      const playerIds = Array.from(room.players.keys());
      if (playerIds.length > 0) {
        room.currentPlayerId = playerIds[0];
        console.log('Initial turn set to:', room.currentPlayerId);
      }
      
      startGameTimer(room);
      io.to(roomId).emit('gameStarted', {
        syllable: room.currentSyllable,
        timeLeft: room.timeLeft,
        players: Array.from(room.players.values()),
        currentPlayerId: room.currentPlayerId
      });
      io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
    } else {
      console.log('Room not found or user is not owner');
    }
  });

  socket.on('submitWord', (roomId: string, word: string) => {
    console.log('\n=== Word Submission Debug ===');
    console.log('Room ID:', roomId);
    console.log('Submitted word:', word);
    console.log('Submitted by Socket ID:', socket.id);
    
    const room = rooms.get(roomId);
    if (room && room.isActive) {
      console.log('Room found and game is active');
      console.log('Current syllable:', room.currentSyllable);
      console.log('Current turn:', room.currentPlayerId);
      
      // Check if it's the player's turn
      if (socket.id !== room.currentPlayerId) {
        console.log('Not player\'s turn');
        console.log('Expected player:', room.currentPlayerId);
        console.log('Actual player:', socket.id);
        socket.emit('wordRejected', {
          message: "It's not your turn!"
        });
        return;
      }
      
      const player = room.players.get(socket.id);
      if (player) {
        console.log('Player found:', player.name);
        const validation = validateWord(word, room.currentSyllable);
        
        if (validation.isValid) {
          console.log('Word accepted, updating game state');
          player.score += 1;
          console.log('New player score:', player.score);
          
          // Update online player score as well
          if (onlinePlayers.has(socket.id)) {
            onlinePlayers.get(socket.id)!.score = player.score;
            console.log('Updated online player score:', onlinePlayers.get(socket.id)!.score);
          }
          
          // Move to next player
          const playerIds = Array.from(room.players.keys());
          console.log('\n=== Moving to Next Turn ===');
          console.log('Current player:', socket.id);
          console.log('All players:', playerIds);
          
          const currentIndex = playerIds.indexOf(socket.id);
          const nextIndex = (currentIndex + 1) % playerIds.length;
          room.currentPlayerId = playerIds[nextIndex];
          console.log('Next turn set to:', room.currentPlayerId);
          
          // Reset timer and generate new syllable
          room.timeLeft = Math.floor(Math.random() * 6) + 5;
          generateNewSyllable(room);
          
          io.to(roomId).emit('wordAccepted', {
            playerId: socket.id,
            newSyllable: room.currentSyllable,
            timeLeft: room.timeLeft,
            players: Array.from(room.players.values()),
            currentPlayerId: room.currentPlayerId
          });
          
          // Update online players list
          io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));

          // Start new timer for next player
          startGameTimer(room);
        } else {
          console.log('Word rejected:', validation.message);
          socket.emit('wordRejected', {
            message: validation.message
          });
        }
      } else {
        console.log('Player not found in room');
      }
    } else {
      console.log('Room not found or game not active');
    }
  });

  socket.on('changeDifficulty', (roomId: string, newDifficulty: 'easy' | 'medium' | 'hard') => {
    console.log('\n=== Room Difficulty Change ===');
    console.log('Room ID:', roomId);
    console.log('New difficulty:', newDifficulty);
    console.log('Requested by Socket ID:', socket.id);

    const room = rooms.get(roomId);
    if (room && room.ownerId === socket.id) {
      console.log('Updating room difficulty');
      room.difficulty = newDifficulty;
      generateNewSyllable(room);
      io.to(roomId).emit('roomSettingsUpdated', {
        difficulty: room.difficulty,
        newSyllable: room.currentSyllable
      });
      // Update available rooms list
      io.emit('availableRooms', Array.from(rooms.entries())
        .filter(([_, room]) => !room.isActive)
        .map(([id, room]) => ({
          id,
          ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
          playerCount: room.players.size,
          difficulty: room.difficulty,
          isActive: room.isActive
        }))
      );
      // Update online players list
      io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
    } else {
      console.log('Room not found or user is not owner');
    }
  });

  socket.on('endRoom', (roomId: string) => {
    console.log('\n=== Room End Request ===');
    console.log('Room ID:', roomId);
    console.log('Requested by Socket ID:', socket.id);

    const room = rooms.get(roomId);
    if (room && room.ownerId === socket.id) {
      console.log('Room owner ending room');
      console.log('\n=== Room Players Before End ===');
      console.log('Room ID:', roomId);
      console.log('Current players:', Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })));
      
      // Reset scores for all players in the room
      room.players.forEach((player) => {
        player.score = 0;
        if (onlinePlayers.has(player.id)) {
          onlinePlayers.get(player.id)!.isInGame = false;
          onlinePlayers.get(player.id)!.score = 0;
        }
      });

      // Clear any existing timer
      if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
      }

      // Notify each player individually that they've left the room
      room.players.forEach((_, playerId) => {
        io.to(playerId).emit('leftRoom');
      });

      // Delete the room
      rooms.delete(roomId);
      console.log('Room deleted');

      // Notify all players in the room that the room has ended
      io.to(roomId).emit('roomEnded');

      // Update available rooms list
      io.emit('availableRooms', Array.from(rooms.entries())
        .filter(([_, room]) => !room.isActive)
        .map(([id, room]) => ({
          id,
          ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
          playerCount: room.players.size,
          difficulty: room.difficulty,
          isActive: room.isActive
        }))
      );

      // Update online players list
      io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
    } else {
      console.log('Room not found or user is not owner');
    }
  });

  socket.on('leaveRoom', (roomId: string) => {
    console.log('\n=== Player Leaving Room ===');
    console.log('Room ID:', roomId);
    console.log('Player ID:', socket.id);
    
    const room = rooms.get(roomId);
    if (room) {
      console.log('Room found, removing player');
      console.log('\n=== Room Players Before Leave ===');
      console.log('Room ID:', roomId);
      console.log('Current players:', Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })));
      
      room.players.delete(socket.id);
      socket.leave(roomId);
      
      console.log('\n=== Room Players After Leave ===');
      console.log('Room ID:', roomId);
      console.log('Remaining players:', Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })));
      
      // Reset player's score and game status
      if (onlinePlayers.has(socket.id)) {
        onlinePlayers.get(socket.id)!.score = 0;
        onlinePlayers.get(socket.id)!.isInGame = false;
        console.log('Reset player score and game status');
      }
      
      // If room is empty, end it
      if (room.players.size === 0) {
        console.log('Room is empty, ending room');
        endRoom(roomId);
      } else {
        // If the leaving player was the current player, move to next player
        if (room.currentPlayerId === socket.id) {
          console.log('Current player left, moving to next player');
          moveToNextTurn(room);
        }
        
        // Notify remaining players
        io.to(roomId).emit('playerLeft', Array.from(room.players.values()));
      }
      
      // Update online players list
      io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
      
      // Update available rooms list
      io.emit('availableRooms', Array.from(rooms.entries())
        .filter(([_, room]) => !room.isActive)
        .map(([id, room]) => ({
          id,
          ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
          playerCount: room.players.size,
          difficulty: room.difficulty,
          isActive: room.isActive
        }))
      );

      // Notify the leaving player that they've left the room
      socket.emit('leftRoom');
    } else {
      console.log('Room not found');
    }
  });

  socket.on('disconnect', () => {
    console.log('\n=== User Disconnected ===');
    console.log('Socket ID:', socket.id);

    // Remove from online players
    if (onlinePlayers.has(socket.id)) {
      const player = onlinePlayers.get(socket.id);
      console.log('Removing player:', player);
      onlinePlayers.delete(socket.id);
      io.emit('onlinePlayersUpdate', Array.from(onlinePlayers.values()));
    }

    // Handle room cleanup
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        console.log('Player was in room:', roomId);
        room.players.delete(socket.id);

        if (room.players.size === 0) {
          console.log('Room is empty, removing room:', roomId);
          rooms.delete(roomId);
        } else {
          console.log('Updating remaining players in room:', roomId);
          io.to(roomId).emit('playerLeft', Array.from(room.players.values()));
        }
        // Notify all clients about available rooms
        io.emit('availableRooms', Array.from(rooms.entries())
          .filter(([_, room]) => !room.isActive)
          .map(([id, room]) => ({
            id,
            ownerName: onlinePlayers.get(room.ownerId)?.name || 'Unknown',
            playerCount: room.players.size,
            difficulty: room.difficulty,
            isActive: room.isActive
          }))
        );
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

httpServer.listen(PORT, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log('To connect from other devices, use your computer\'s IP address');
}); 