# BombParty Game

A multiplayer word game where players need to type words containing a given syllable before a bomb explodes.

## Features

- Real-time multiplayer gameplay
- Room-based game sessions
- Player scoring system
- Timer-based rounds
- Modern UI with Chakra UI

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install client dependencies
cd dugtungan-app
npm install

# Install server dependencies
cd server
npm install
```

## Running the Application

1. Start the server:
```bash
cd server
npm run dev
```

2. In a new terminal, start the client:
```bash
cd dugtungan-app
npm start
```

The application will be available at http://localhost:3000

## How to Play

1. Create a room or join an existing one
2. Share the room ID with friends
3. Once all players have joined, start the game
4. Type words containing the given syllable before the timer runs out
5. Score points for each valid word you submit
6. The game continues until the bomb explodes

## Technologies Used

- React
- TypeScript
- Socket.IO
- Express
- Chakra UI
