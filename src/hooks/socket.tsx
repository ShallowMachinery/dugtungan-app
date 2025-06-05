import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player } from '../components/player/player';
import { Difficulty, GameMode } from '../components/gameInit';
import { Room } from '../components/room/room';

interface UseSocketReturn {
  socket: Socket | null;
  currentSyllable: string;
  timeLeft: number;
  players: Player[];
  isGameActive: boolean;
  roomId: string;
  isRoomOwner: boolean;
  availableRooms: Room[];
  onlinePlayers: Player[];
  currentPlayerId: string | null;
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  };
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' }) => void;
  createRoom: () => void;
  handleJoinRoom: (roomId: string) => void;
  startGame: (roomId: string) => void;
  handleWordSubmit: (roomId: string, word: string) => void;
  handleDifficultyChange: (roomId: string, difficulty: Difficulty) => void;
  handleEndRoom: (roomId: string) => void;
  handleLeaveRoom: (roomId: string) => void;
  setPlayerName: (name: string) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentSyllable, setCurrentSyllable] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(Math.floor(Math.random() * 6) + 5);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [isRoomOwner, setIsRoomOwner] = useState<boolean>(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const serverUrl = isLocalhost
      ? 'http://localhost:3001'
      : window.location.hostname.endsWith('.local') || window.location.hostname.startsWith('192.') || window.location.hostname.startsWith('10.')
        ? `http://${window.location.hostname}:3001`
        : 'https://dugtungan.onrender.com';

    const newSocket = io(serverUrl);
    setSocket(newSocket);

    // Request initial data
    newSocket.emit('getAvailableRooms');

    newSocket.on('roomCreated', (data: { roomId: string; isOwner: boolean }) => {
      setRoomId(data.roomId);
      setIsRoomOwner(data.isOwner);
      setSnackbar({
        open: true,
        message: `Room created! Share this code with friends: ${data.roomId}`,
        severity: 'success',
      });
    });

    newSocket.on('availableRooms', (rooms: Room[]) => {
      console.log('\n=== Available Rooms Update ===');
      console.log('Received rooms:', rooms);
      setAvailableRooms(rooms);
    });

    newSocket.on('onlinePlayersUpdate', (players: Player[]) => {
      console.log('\n=== Online Players Update ===');
      console.log('Received players:', players);
      console.log('Current online players:', onlinePlayers);
      setOnlinePlayers(players);
    });

    newSocket.on('playerJoined', (updatedPlayers: Player[]) => {
      console.log('\n=== Player Joined Event ===');
      console.log('Updated players:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    newSocket.on('gameStarted', (data: { syllable: string; timeLeft: number; players: Player[]; currentPlayerId: string }) => {
      console.log('\n=== Game Started Event ===');
      console.log('Received data:', data);
      console.log('Current socket ID:', newSocket.id);
      console.log('Turn assigned to:', data.currentPlayerId);
      setCurrentSyllable(data.syllable);
      setTimeLeft(data.timeLeft);
      setIsGameActive(true);
      setPlayers(data.players);
      setCurrentPlayerId(data.currentPlayerId);
    });

    newSocket.on('wordAccepted', (data: { newSyllable: string; timeLeft: number; players: Player[]; currentPlayerId: string }) => {
      console.log('\n=== Word Accepted Event ===');
      console.log('Received data:', data);
      console.log('Current socket ID:', newSocket.id);
      console.log('Turn changed to:', data.currentPlayerId);
      setCurrentSyllable(data.newSyllable);
      setTimeLeft(data.timeLeft);
      setPlayers(data.players);
      setCurrentPlayerId(data.currentPlayerId);
      
      // Update online players with new scores
      const updatedOnlinePlayers = onlinePlayers.map(player => {
        const updatedPlayer = data.players.find(p => p.id === player.id);
        if (updatedPlayer) {
          console.log(`Updating score for ${player.name}: ${player.score} -> ${updatedPlayer.score}`);
          return { ...player, score: updatedPlayer.score };
        }
        return player;
      });
      setOnlinePlayers(updatedOnlinePlayers);
      
      setSnackbar({
        open: true,
        message: 'Word accepted!',
        severity: 'success',
      });
    });

    newSocket.on('turnChanged', (data: { currentPlayerId: string; timeLeft: number; currentSyllable: string }) => {
      console.log('\n=== Turn Changed Event ===');
      console.log('Received data:', data);
      console.log('Current socket ID:', newSocket.id);
      console.log('Turn changed to:', data.currentPlayerId);
      setCurrentPlayerId(data.currentPlayerId);
      setTimeLeft(data.timeLeft);
      setCurrentSyllable(data.currentSyllable);
      
      const currentPlayer = players.find(p => p.id === data.currentPlayerId);
      if (currentPlayer) {
        console.log('Current player name:', currentPlayer.name);
        setSnackbar({
          open: true,
          message: `${currentPlayer.name}'s turn!`,
          severity: 'info',
        });
      }
    });

    newSocket.on('wordRejected', (data: { message: string }) => {
      setSnackbar({
        open: true,
        message: data.message,
        severity: 'error',
      });
    });

    newSocket.on('timeUpdate', (data: { timeLeft: number }) => {
      setTimeLeft(data.timeLeft);
    });

    newSocket.on('gameOver', (data: { players: Player[] }) => {
      setIsGameActive(false);
      setPlayers(data.players);
      setSnackbar({
        open: true,
        message: 'Game Over! The bomb exploded!',
        severity: 'error',
      });
    });

    newSocket.on('playerLeft', (updatedPlayers: Player[]) => {
      console.log('\n=== Player Left Event ===');
      console.log('Updated players:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    newSocket.on('difficultyChanged', (data: { difficulty: Difficulty; newSyllable: string }) => {
      setCurrentSyllable(data.newSyllable);
      setSnackbar({
        open: true,
        message: `Difficulty changed to ${data.difficulty}`,
        severity: 'info',
      });
    });

    newSocket.on('roomSettingsUpdated', (data: { difficulty: Difficulty; newSyllable: string }) => {
      setCurrentSyllable(data.newSyllable);
      setSnackbar({
        open: true,
        message: `Room settings updated: ${data.difficulty} difficulty`,
        severity: 'info',
      });
    });

    newSocket.on('roomEnded', () => {
      console.log('\n=== Room Ended Event ===');
      console.log('Current socket ID:', newSocket.id);
      
      // Reset all game state
      setRoomId('');
      setIsRoomOwner(false);
      setIsGameActive(false);
      setCurrentSyllable('');
      setTimeLeft(0);
      setPlayers([]);
      setCurrentPlayerId(null);
      
      // Show snackbar notification
      setSnackbar({
        open: true,
        message: 'Room has been ended by the owner.',
        severity: 'info',
      });

      // Request updated room list
      newSocket.emit('getAvailableRooms');
    });

    newSocket.on('leftRoom', () => {
      console.log('\n=== Left Room Event ===');
      console.log('Current socket ID:', newSocket.id);
      
      // Reset all game state
      setRoomId('');
      setIsRoomOwner(false);
      setIsGameActive(false);
      setCurrentSyllable('');
      setTimeLeft(0);
      setPlayers([]);
      setCurrentPlayerId(null);
      
      // Show snackbar notification
      setSnackbar({
        open: true,
        message: 'You have left the room.',
        severity: 'info',
      });

      // Request updated room list
      newSocket.emit('getAvailableRooms');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = () => {
    if (socket) {
      socket.emit('createRoom');
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('joinRoom', roomId);
      setRoomId(roomId);
      setIsRoomOwner(false);
    }
  };

  const startGame = (roomId: string) => {
    if (socket) {
      socket.emit('startGame', roomId);
    }
  };

  const handleWordSubmit = (roomId: string, word: string) => {
    if (socket && word) {
      socket.emit('submitWord', roomId, word);
    }
  };

  const handleDifficultyChange = (roomId: string, newDifficulty: Difficulty) => {
    if (socket) {
      socket.emit('changeDifficulty', roomId, newDifficulty);
    }
  };

  const handleEndRoom = (roomId: string) => {
    if (socket) {
      socket.emit('endRoom', roomId);
    }
  };

  const handleLeaveRoom = (roomId: string) => {
    if (socket) {
      socket.emit('leaveRoom', roomId);
    }
  };

  const setPlayerName = (name: string) => {
    if (socket && name.trim()) {
      socket.emit('setPlayerName', name.trim());
    }
  };

  return {
    socket,
    currentSyllable,
    timeLeft,
    players,
    isGameActive,
    roomId,
    isRoomOwner,
    availableRooms,
    onlinePlayers,
    currentPlayerId,
    snackbar,
    setSnackbar,
    createRoom,
    handleJoinRoom,
    startGame,
    handleWordSubmit,
    handleDifficultyChange,
    handleEndRoom,
    handleLeaveRoom,
    setPlayerName,
  };
};
