import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Stack,
  TextField,
  Button,
  Container,
  Typography,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { Difficulty, GameMode } from './gameInit';
import { useSocket } from '../hooks/socket';

interface PlayedWord {
  word: string;
  definitions: {
    pos: string;
    definition: string[];
  }[];
  synonyms: string[];
  currentSyllable: string;
  playerId: string;
  playedBy: string;
}

const Game: React.FC = () => {
  const [inputWord, setInputWord] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<GameMode>('pagsabog');
  const [isNameSet, setIsNameSet] = useState<boolean>(false);
  const [showRoomList, setShowRoomList] = useState<boolean>(false);
  const [playedWords, setPlayedWords] = useState<PlayedWord[]>([]);
  const [currentPlayerInput, setCurrentPlayerInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
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
    handleLeaveRoom: leaveRoom,
    setPlayerName: setPlayerNameSocket,
  } = useSocket();

  const handleGameModeSelect = (mode: GameMode) => {
    if (mode === 'pagsabog') {
      setGameMode(mode);
      setShowRoomList(true);
    }
  };

  const handleNameSubmit = () => {
    if (playerName.trim()) {
      setPlayerNameSocket(playerName.trim());
      setIsNameSet(true);
    } else {
      setSnackbar({
        open: true,
        message: 'Please enter your name!',
        severity: 'error',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleWordSubmit(roomId, inputWord);
      setInputWord('');
    }
  };

  const handleLeaveRoom = (roomId: string) => {
    if (socket) {
      leaveRoom(roomId);
      setInputWord('');
      setDifficulty('easy');
      setGameMode('pagsabog');
      setShowRoomList(true);
    }
  };

  useEffect(() => {
    if (!roomId) {
      setShowRoomList(true);
    }
  }, [roomId]);

  // Add effect to handle difficulty updates
  useEffect(() => {
    if (socket) {
      socket.on('roomSettingsUpdated', (data: { difficulty: Difficulty; newSyllable: string }) => {
        setDifficulty(data.difficulty);
      });
    }
  }, [socket]);

  useEffect(() => {
    if (socket) {
      socket.on('wordAccepted', (data) => {
        setPlayedWords(data.playedWords); // 🎯 This updates the list with the latest from the server
      });

      socket.on('clearInput', () => {
        setInputWord('');
      });

      // Optional: cleanup on component unmount
      return () => {
        socket.off('wordAccepted');
        socket.off('clearInput');
      };
    }
  }, [socket]);

  // Add effect to handle input changes
  useEffect(() => {
    if (socket) {
      socket.on('playerInputUpdate', (data: { playerId: string; input: string }) => {
        if (data.playerId === currentPlayerId) {
          setCurrentPlayerInput(data.input);
        }
      });

      return () => {
        socket.off('playerInputUpdate');
      };
    }
  }, [socket, currentPlayerId]);

  // Add effect to handle keyboard focus
  useEffect(() => {
    if (socket) {
      socket.on('keyboardFocus', (data: { currentPlayerId: string }) => {
        if (data.currentPlayerId === socket.id && inputRef.current) {
          inputRef.current.focus();
        }
      });

      return () => {
        socket.off('keyboardFocus');
      };
    }
  }, [socket]);

  // Update input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputWord(newValue);
    if (socket && roomId && currentPlayerId === socket.id) {
      socket.emit('inputChange', roomId, newValue);
    }
  };

  useEffect(() => {
    if (currentPlayerId === socket?.id) {
      console.log('my turn hehe :D');
      console.log(inputRef.current);
      inputRef.current?.focus();
    }
  }, [currentPlayerId, socket?.id]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Typography variant="h3" component="h1" align="center">
          Dugtungan
        </Typography>

        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2 }}>
          Players Online: {onlinePlayers.length}
        </Typography>

        {!isNameSet ? (
          <Stack spacing={3}>
            <Typography variant="h5" align="center" gutterBottom>
              Enter Your Name
            </Typography>
            <TextField
              fullWidth
              label="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              variant="outlined"
              autoFocus
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleNameSubmit}
              fullWidth
              disabled={!playerName.trim()}
            >
              Continue
            </Button>
          </Stack>
        ) : !roomId ? (
          <Stack spacing={2}>
            {!showRoomList ? (
              <>
                <Typography variant="h5" align="center" gutterBottom>
                  Select Game Mode
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleGameModeSelect('pagsabog')}
                  fullWidth
                  sx={{
                    bgcolor: 'pagsabog' === gameMode ? 'primary.main' : 'grey.300',
                    color: 'pagsabog' === gameMode ? 'white' : 'grey.500',
                    '&:hover': {
                      bgcolor: 'pagsabog' === gameMode ? 'primary.dark' : 'grey.300',
                    }
                  }}
                >
                  Pagsabog
                </Button>
                <Button
                  variant="contained"
                  disabled
                  fullWidth
                  sx={{
                    bgcolor: 'grey.300',
                    color: 'grey.500',
                    '&:hover': {
                      bgcolor: 'grey.300',
                    }
                  }}
                >
                  Dugtungan (Coming Soon)
                </Button>
              </>
            ) : (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5">
                    Available Rooms
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowRoomList(false);
                      createRoom();
                    }}
                  >
                    Create Room
                  </Button>
                </Box>
                {availableRooms.length === 0 ? (
                  <Typography align="center" color="text.secondary">
                    No rooms available. Create one!
                  </Typography>
                ) : (
                  <List>
                    {availableRooms.map((room) => (
                      <ListItem
                        key={room.id}
                        divider
                        sx={{
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': {
                            bgcolor: room.isActive ? 'action.disabled' : 'action.hover',
                            cursor: room.isActive ? 'not-allowed' : 'pointer'
                          },
                          opacity: room.isActive ? 0.7 : 1
                        }}
                        onClick={() => !room.isActive && handleJoinRoom(room.id)}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1">
                                Room: {room.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {room.playerCount} player{room.playerCount !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {room.ownerName}
                                <Chip
                                  label="Host"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: '20px', fontSize: '0.7rem' }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {room.isActive && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      bgcolor: 'error.main',
                                      color: 'white',
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: 1,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Game in Progress
                                  </Typography>
                                )}
                                <Typography variant="caption" color="primary">
                                  {room.difficulty.charAt(0).toUpperCase() + room.difficulty.slice(1)}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Stack>
            )}
          </Stack>
        ) : !isGameActive ? (
          <Stack spacing={2}>
            {isRoomOwner ? (
              <>
                <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Typography variant="h6" gutterBottom>
                    Room Code: {roomId}
                  </Typography>
                  <Typography variant="body2">
                    Share this code with friends to let them join your room
                  </Typography>
                </Paper>
                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={difficulty}
                    label="Difficulty"
                    onChange={(e) => {
                      const newDifficulty = e.target.value as Difficulty;
                      setDifficulty(newDifficulty);
                      handleDifficultyChange(roomId, newDifficulty);
                    }}
                  >
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" color="success" onClick={() => startGame(roomId)} fullWidth>
                  Start Game
                </Button>
                <Button variant="outlined" color="error" onClick={() => handleEndRoom(roomId)} fullWidth sx={{ mt: 1 }}>
                  End Room
                </Button>
              </>
            ) : (
              <>
                <Paper sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Room Settings
                      </Typography>
                      <Typography variant="body1">
                        Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Waiting for host to start the game...
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
                <Button variant="outlined" color="error" onClick={() => handleLeaveRoom(roomId)} fullWidth sx={{ mt: 1 }}>
                  Leave Room
                </Button>
              </>
            )}
          </Stack>
        ) : (
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom textAlign="center">
                Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Typography>
              <Typography variant="h5" gutterBottom>
                <Typography variant="h5" component="span" color="primary.main" textAlign="center">{currentSyllable}</Typography>
              </Typography>

            </Box>

            <Stack direction="row" spacing={2}>
              <TextField
                inputRef={inputRef}
                fullWidth
                value={currentPlayerId === socket?.id ? inputWord : currentPlayerInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={currentPlayerId === socket?.id ? "Type a word..." : `${players.find(p => p.id === currentPlayerId)?.name} is thinking...`}
                variant="outlined"
                disabled={currentPlayerId !== socket?.id}
              />
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  handleWordSubmit(roomId, inputWord);
                  setInputWord('');
                  inputRef.current?.focus();
                }}
                disabled={currentPlayerId !== socket?.id}
              >
                Submit
              </Button>
            </Stack>

            <Box>
              <LinearProgress
                variant="determinate"
                value={(timeLeft / 10) * 100}
                color={timeLeft < 3 ? 'error' : 'primary'}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="body1" sx={{ mt: 1 }}>
                Time left: {timeLeft}s
              </Typography>
              {currentPlayerId && (
                <Typography
                  variant="h6"
                  color="primary"
                  sx={{
                    mt: 2,
                    p: 1,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    borderRadius: 1,
                    textAlign: 'center'
                  }}
                >
                  {currentPlayerId === socket?.id ? "Your Turn!" : `${players.find(p => p.id === currentPlayerId)?.name}'s Turn`}
                </Typography>
              )}
            </Box>

            {/* Room Players Section */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Room Players
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {players.map((player) => (
                  <Box
                    key={player.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: player.id === currentPlayerId ? 'action.selected' : 'transparent',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{player.name}</Typography>
                      {player.id === roomId && (
                        <Chip
                          label="Host"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography>Score: {player.score}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Played Words Section */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Played Words
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '300px', overflow: 'auto' }}>
                {playedWords.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No words played yet
                  </Typography>
                ) : (
                  playedWords.map((wordInfo, index) => (
                    <Box key={index} sx={{ borderBottom: '1px solid #eee', pb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {wordInfo.playedBy}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" color="primary">
                          {
                            (() => {
                              const word = wordInfo.word;
                              const syllable = wordInfo.currentSyllable;
                              const index = word.toLowerCase().indexOf(syllable.toLowerCase());

                              if (index === -1) return word;

                              const before = word.slice(0, index);
                              const match = word.slice(index, index + syllable.length);
                              const after = word.slice(index + syllable.length);

                              return (
                                <>
                                  {before}
                                  <Box component="span" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                    {match}
                                  </Box>
                                  {after}
                                </>
                              );
                            })()
                          }
                        </Typography>
                        {wordInfo.definitions.length > 0 && (wordInfo.definitions.map((definition, index) => (
                          <Typography
                            key={index}
                            component="span"
                            variant="caption"
                            sx={{
                              display: 'inline-block',
                              mr: 1,
                              color: 'text.secondary',
                              fontStyle: 'italic',
                              '&:not(:last-child)::after': {
                                content: '","',
                                mr: 0.5
                              }
                            }}
                          >
                            {definition.pos}
                          </Typography>
                        )))}
                      </Box>
                      {wordInfo.definitions.length > 0 && (() => {
                        let count = 0;
                        return wordInfo.definitions.flatMap((entry) =>
                          entry.definition.map((def: string) => {
                            count++;
                            return (
                              <Typography key={def + count} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {count}. {def}
                              </Typography>
                            );
                          })
                        );
                      })()}
                      {wordInfo.synonyms.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Synonyms:
                          </Typography>
                          {wordInfo.synonyms.map((synonym, idx) => (
                            <Typography
                              key={idx}
                              component="span"
                              variant="caption"
                              sx={{
                                display: 'inline-block',
                                color: 'text.secondary',
                                '&:not(:last-child)::after': {
                                  content: '","',
                                  mr: 0.5
                                }
                              }}
                            >
                              {synonym}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))
                )}
              </Box>
            </Paper>

            <Button
              variant="outlined"
              color="error"
              onClick={() => handleLeaveRoom(roomId)}
              fullWidth
            >
              Leave Room
            </Button>
          </Stack>
        )}

        {roomId && !isGameActive && (
          <Paper sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Room Players
            </Typography>
            <List>
              {players.map((player) => (
                <ListItem key={player.id}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {player.name}
                        {player.isOwner && (
                          <Chip
                            label="Host"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: '20px', fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currentPlayerId === player.id ? (
                          <Typography variant="body2" color="primary">
                            Score: {player.score} | Current Turn
                          </Typography>
                        ) : (
                          <Typography variant="body2">
                            Score: {player.score}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Stack>

      <Dialog open={isJoinDialogOpen} onClose={() => setIsJoinDialogOpen(false)}>
        <DialogTitle>Join Room</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Room ID"
              value={roomId}
              onChange={(e) => handleJoinRoom(e.target.value)}
              fullWidth
            />
            <TextField
              label="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsJoinDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setIsJoinDialogOpen(false);
              handleJoinRoom(roomId);
            }}
            variant="contained"
            color="primary"
            disabled={!roomId || !playerName}
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Game; 