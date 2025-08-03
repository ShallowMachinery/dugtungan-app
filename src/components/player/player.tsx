export interface Player {
    id: string;
    name: string;
    score: number;
    hearts: number; // Number of lives remaining (starts with 3)
    isInGame?: boolean;
    isOwner?: boolean;
    currentRoomId?: string;
  }