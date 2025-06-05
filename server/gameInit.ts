import fs from 'fs';
import path from 'path';    

export const promptDifficulty = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompt_difficulty.json'), 'utf-8'));
export const dictionary = JSON.parse(fs.readFileSync(path.join(__dirname, 'dict.json'), 'utf-8'));

export interface PlayedWord {
  word: string;
  playedBy: string;
  definitions: {
    pos: string;
    definition: string[];
  }[];
  synonyms: string[];
  playerId: string;
  currentSyllable: string;
}

export interface GameRoom {
  id: string;
  ownerId: string;
  players: Map<string, Player>;
  currentSyllable: string;
  timeLeft: number;
  isActive: boolean;
  timer: NodeJS.Timeout | null;
  difficulty: 'easy' | 'medium' | 'hard';
  currentPlayerId: string | null;
  playedWords: PlayedWord[];
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isInGame?: boolean;
  currentRoomId?: string;
}

export interface DictionaryEntry {
  word: string;
  lang: string;
  definitions: {
    pos: string;
    definition: string[];
  }[];
  synonyms: string[];
}

export const rooms = new Map<string, GameRoom>();
export const onlinePlayers = new Map<string, Player>();