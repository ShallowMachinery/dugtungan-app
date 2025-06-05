import fs from 'fs';
import path from 'path';    

export const promptDifficulty = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompt_difficulty.json'), 'utf-8'));
export const dictionary = JSON.parse(fs.readFileSync(path.join(__dirname, 'dict.json'), 'utf-8'));

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
  definitions: string[];
  synonyms: string[];
  pos: string;
}

export const rooms = new Map<string, GameRoom>();
export const onlinePlayers = new Map<string, Player>();